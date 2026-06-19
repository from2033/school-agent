const { icon } = require('../../utils/icons');

Page({
  data: {
    ic: {
      printer: icon('printer', '#16a34a'),
      send: icon('send', '#ffffff'),
      check: icon('check-circle', '#16a34a'),
    },
    items: [
      { id: 'p1', label: '二次函数图像平移（数学）', type: 'mistake', selected: true },
      { id: 'p2', label: '牛顿第三定律应用（物理）', type: 'mistake', selected: true },
      { id: 'p3', label: '定语从句关系词选择（英语）', type: 'mistake', selected: false },
      { id: 'p4', label: '今日王老师作业通知', type: 'message', selected: true },
      { id: 'p5', label: '今日李老师家长会通知', type: 'message', selected: false },
    ],
    settings: [
      { label: '纸张大小', value: 'A4' },
      { label: '打印方向', value: '纵向' },
      { label: '份数', value: '1' },
      { label: '双面打印', value: '关闭' },
    ],
    printing: false,
    printed: false,
    selectedCount: 3,
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
  },

  recount() {
    this.setData({ selectedCount: this.data.items.filter((i) => i.selected).length });
  },

  toggle(e) {
    const id = e.currentTarget.dataset.id;
    const items = this.data.items.map((i) => (i.id === id ? { ...i, selected: !i.selected } : i));
    this.setData({ items }, () => this.recount());
  },

  selectAll() {
    this.setData({ items: this.data.items.map((i) => ({ ...i, selected: true })) }, () => this.recount());
  },

  print() {
    if (this.data.selectedCount === 0) return;
    this.setData({ printing: true });
    setTimeout(() => this.setData({ printing: false, printed: true }), 2200);
  },

  reset() { this.setData({ printed: false }); },
});
