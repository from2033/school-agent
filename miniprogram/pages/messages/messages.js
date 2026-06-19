const { request } = require('../../utils/request');
const { icon } = require('../../utils/icons');

const TYPE_STYLE = {
  homework: { label: '作业', ink: '#2563eb', wash: '#eff6ff' },
  notice: { label: '通知', ink: '#b45309', wash: '#fef3c7' },
  praise: { label: '表扬', ink: '#047857', wash: '#d1fae5' },
  reminder: { label: '提醒', ink: '#b91c1c', wash: '#fee2e2' },
};

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'homework', label: '作业' },
  { key: 'notice', label: '通知' },
  { key: 'praise', label: '表扬' },
  { key: 'reminder', label: '提醒' },
];

Page({
  data: {
    filters: FILTERS,
    filter: 'all',
    list: [],
    loading: true,
    ic: {
      star: icon('star', '#f59e0b', { fill: '#f59e0b' }),
      clock: icon('clock', '#6b7a8d'),
      printer: icon('printer', '#0d6e6e'),
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

  load() {
    this.setData({ loading: true });
    const q = this.data.filter === 'all' ? '' : '?type=' + this.data.filter;
    request('/api/messages' + q).then((list) => {
      const decorated = list.map((m) => ({
        ...m,
        style: TYPE_STYLE[m.type] || { label: m.type, ink: '#6b7280', wash: '#eef0f5' },
      }));
      this.setData({ list: decorated, loading: false });
    }).catch(() => this.setData({ loading: false }));
  },
});
