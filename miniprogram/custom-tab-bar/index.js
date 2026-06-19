const { icon } = require('../utils/icons');

const ACTIVE = '#0d6e6e';
const INACTIVE = '#6b7a8d';

const TABS = [
  { page: '/pages/home/home', text: '首页', name: 'home' },
  { page: '/pages/mistakes/mistakes', text: '错题本', name: 'book' },
  { page: '/pages/messages/messages', text: '通知', name: 'message' },
  { page: '/pages/downloads/downloads', text: '下载', name: 'download' },
  { page: '/pages/print/print', text: '打印', name: 'printer' },
];

Component({
  data: {
    selected: 0,
    list: TABS.map((t) => ({
      page: t.page,
      text: t.text,
      icon: icon(t.name, INACTIVE),
      iconActive: icon(t.name, ACTIVE),
    })),
  },
  methods: {
    onTap(e) {
      const idx = e.currentTarget.dataset.index;
      const url = TABS[idx].page;
      wx.switchTab({ url });
      this.setData({ selected: idx });
    },
  },
});
