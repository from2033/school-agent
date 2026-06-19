const { request } = require('../../utils/request');
const { getCanvas, drawBars } = require('../../utils/chart');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');

const SUBJECTS = ['全部', '数学', '语文', '英语', '物理', '化学', '历史'];

Page({
  data: {
    subjects: SUBJECTS,
    filter: '全部',
    list: [],
    total: 0,
    selected: {},   // id -> true
    selectedCount: 0,
    loading: true,
    ic: {
      printerWhite: icon('printer', '#ffffff'),
      plusWhite: icon('plus', '#ffffff'),
      chevron: icon('chevron', '#6b7a8d'),
      book: icon('book', '#9aa7b5'),
    },
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadList();
    this.loadChart();
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.s }, () => this.loadList());
  },

  loadList() {
    this.setData({ loading: true });
    const q = this.data.filter === '全部' ? '' : '?subject=' + this.data.filter;
    request('/api/mistakes' + q).then((list) => {
      const decorated = list.map((m) => ({
        ...m,
        ...sub(m.subject),
        subjectShort: (m.subject || '').slice(0, 1),
      }));
      this.setData({ list: decorated, loading: false });
      if (this.data.filter === '全部') this.setData({ total: list.length });
    }).catch(() => this.setData({ loading: false }));
  },

  loadChart() {
    request('/api/stats/mistake-count').then((data) => {
      const withColor = data.map((d) => ({ ...d, color: sub(d.subject).ink }));
      getCanvas(this, '#barChart').then(({ ctx, width, height }) => {
        drawBars(ctx, width, height, withColor);
      });
    });
  },

  toggleSelect(e) {
    const id = e.currentTarget.dataset.id;
    const selected = { ...this.data.selected };
    selected[id] ? delete selected[id] : (selected[id] = true);
    this.setData({ selected, selectedCount: Object.keys(selected).length });
  },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/mistake-detail/mistake-detail?id=' + e.currentTarget.dataset.id });
  },

  goUpload() {
    wx.navigateTo({ url: '/pages/upload/upload' });
  },

  printSelected() {
    wx.switchTab({ url: '/pages/print/print' });
  },
});
