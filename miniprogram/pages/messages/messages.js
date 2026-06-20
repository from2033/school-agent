const { request, BASE_URL } = require('../../utils/request');
const { icon } = require('../../utils/icons');
const { today, label } = require('../../utils/date');

const TYPE_STYLE = {
  homework: { label: '作业', ink: '#2563eb', wash: '#eff6ff' },
  notice: { label: '通知', ink: '#b45309', wash: '#fef3c7' },
  praise: { label: '表扬', ink: '#047857', wash: '#d1fae5' },
  reminder: { label: '提醒', ink: '#b91c1c', wash: '#fee2e2' },
};

// 每个分类带自己的颜色：未选中 = 浅色底 + 彩色字，选中 = 实色底 + 白字
const FILTERS = [
  { key: 'all', label: '全部', ink: '#0d6e6e', wash: '#e8f4f4' },
  { key: 'homework', label: '作业', ink: '#2563eb', wash: '#eff6ff' },
  { key: 'notice', label: '通知', ink: '#b45309', wash: '#fef3c7' },
  { key: 'praise', label: '表扬', ink: '#047857', wash: '#d1fae5' },
  { key: 'reminder', label: '提醒', ink: '#b91c1c', wash: '#fee2e2' },
];

Page({
  data: {
    filters: FILTERS,
    filter: 'all',
    date: today(),
    dateLabel: label(today()),
    list: [],
    loading: true,
    ic: {
      star: icon('star', '#f59e0b', { fill: '#f59e0b' }),
      clock: icon('clock', '#6b7a8d'),
      calendar: icon('clock', '#ffffff'),
      file: icon('file', '#6b7a8d'),
    },
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.load();
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.key }, () => this.load());
  },

  onDate(e) {
    const date = e.detail.value;
    this.setData({ date, dateLabel: label(date) }, () => this.load());
  },

  previewImage(e) {
    const { urls, cur } = e.currentTarget.dataset;
    wx.previewImage({ current: cur, urls });
  },

  load(noFallback) {
    this.setData({ loading: true });
    const params = [];
    if (this.data.filter !== 'all') params.push('type=' + this.data.filter);
    if (this.data.date) params.push('date=' + this.data.date);
    const q = params.length ? '?' + params.join('&') : '';
    request('/api/messages' + q).then((list) => {
      // 今天没有消息时，自动跳到最近一个有数据的日期（避免默认空白）
      if (list.length === 0 && !noFallback) {
        this.fallbackToLatest();
        return;
      }
      const decorated = list.map((m) => ({
        ...m,
        style: TYPE_STYLE[m.type] || { label: m.type, ink: '#6b7280', wash: '#eef0f5' },
        imageUrls: (m.images || []).map((p) => (p.startsWith('http') ? p : BASE_URL + p)),
      }));
      this.setData({ list: decorated, loading: false });
    }).catch(() => this.setData({ loading: false }));
  },

  fallbackToLatest() {
    const typeQ = this.data.filter === 'all' ? '' : '?type=' + this.data.filter;
    request('/api/messages' + typeQ).then((all) => {
      if (!all.length) { this.setData({ list: [], loading: false }); return; }
      const latest = all.reduce((a, m) => (m.date > a ? m.date : a), all[0].date);
      this.setData({ date: latest, dateLabel: label(latest) }, () => this.load(true));
    }).catch(() => this.setData({ loading: false }));
  },
});
