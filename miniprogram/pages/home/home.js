const { request } = require('../../utils/request');
const { getCanvas, drawRadar } = require('../../utils/chart');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');
const { today } = require('../../utils/date');

const MSG_META = {
  homework: { ink: '#2563eb', wash: '#eff6ff', label: '作业' },
  notice: { ink: '#b45309', wash: '#fef3c7', label: '通知' },
  praise: { ink: '#047857', wash: '#d1fae5', label: '表扬' },
  reminder: { ink: '#b91c1c', wash: '#fee2e2', label: '提醒' },
};

// 快捷功能：图标用学科 ink/wash 配色
const QUICK = [
  { label: '拍照上传', name: 'camera', ink: '#0d6e6e', wash: '#e8f4f4', action: 'upload' },
  { label: '薄弱分析', name: 'bar', ink: '#7c3aed', wash: '#f3e8ff', action: 'mistakes' },
  { label: '老师通知', name: 'message', ink: '#d97706', wash: '#fffbeb', action: 'messages' },
  { label: '批量打印', name: 'printer', ink: '#2563eb', wash: '#eff6ff', action: 'print' },
].map((q) => ({ ...q, src: icon(q.name, q.ink) }));

Page({
  data: {
    quick: QUICK,
    statTiles: [
      { key: 'mistakes', n: 0, label: '累计错题' },
      { key: 'messages', n: 0, label: '今日消息' },
      { key: 'files', n: 0, label: '今日文件' },
    ],
    recent: [],
    important: [],
    ic: {
      chevron: icon('chevron', '#0d6e6e'),
      alert: icon('alert', '#dc2626'),
      check: icon('check', '#16a34a'),
    },
    radarEmpty: false,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadData();
  },

  loadData() {
    const day = today();
    request('/api/mistakes').then((list) => {
      const recent = list.slice(0, 3).map((m) => ({ ...m, ...sub(m.subject) }));
      const tiles = this.data.statTiles.slice();
      tiles[0].n = list.length;
      // 没有错题时不画"全 100"的误导雷达，显示空状态
      const radarEmpty = list.length === 0;
      this.setData({ recent, statTiles: tiles, radarEmpty }, () => {
        if (!radarEmpty) this.loadRadar();
      });
    });
    request('/api/messages?date=' + day).then((list) => {
      const important = list.filter((m) => m.important).map((m) => ({ ...m, meta: MSG_META[m.type] }));
      const tiles = this.data.statTiles.slice();
      tiles[1].n = list.length;
      this.setData({ important, statTiles: tiles });
    });
    request('/api/downloads?date=' + day).then((list) => {
      const tiles = this.data.statTiles.slice();
      tiles[2].n = list.length;
      this.setData({ statTiles: tiles });
    });
  },

  loadRadar() {
    request('/api/stats/radar').then((data) => {
      getCanvas(this, '#radar').then(({ ctx, width, height }) => {
        drawRadar(ctx, width, height, data);
      });
    });
  },

  onQuick(e) {
    const action = e.currentTarget.dataset.action;
    // upload / print 为普通页面（非 tab），用 navigateTo
    if (action === 'upload' || action === 'print') {
      wx.navigateTo({ url: '/pages/' + action + '/' + action });
    } else {
      wx.switchTab({ url: '/pages/' + action + '/' + action });
    }
  },

  goMistakes() { wx.switchTab({ url: '/pages/mistakes/mistakes' }); },
  goMessages() { wx.switchTab({ url: '/pages/messages/messages' }); },
});
