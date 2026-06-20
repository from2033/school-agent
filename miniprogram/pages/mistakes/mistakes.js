const { request } = require('../../utils/request');
const { getCanvas, drawBars } = require('../../utils/chart');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');

Page({
  data: {
    subjects: ['全部'],   // 学科分类来自 /api/stats/subjects（核心科目 + 真实错题）
    filter: '全部',
    list: [],
    total: 0,
    chartEmpty: false,
    loading: true,
    genLoading: false,
    ic: {
      plusWhite: icon('plus', '#ffffff'),
      paperWhite: icon('file', '#ffffff'),
      chevron: icon('chevron', '#6b7a8d'),
      book: icon('book', '#9aa7b5'),
    },
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadSubjects();
    this.loadList();
    this.loadChart();
  },

  loadSubjects() {
    request('/api/stats/subjects').then((subs) => {
      this.setData({ subjects: ['全部'].concat(subs || []) });
    }).catch(() => {});
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
      const update = { list: decorated, loading: false };
      if (this.data.filter === '全部') update.total = list.length;
      this.setData(update);
    }).catch(() => this.setData({ loading: false }));
  },

  loadChart() {
    request('/api/stats/mistake-count').then((data) => {
      const totalCount = (data || []).reduce((sum, d) => sum + d.count, 0);
      if (totalCount === 0) {
        this.setData({ chartEmpty: true });
        return;
      }
      const withColor = data.map((d) => ({ ...d, color: sub(d.subject).ink }));
      this.setData({ chartEmpty: false }, () => {
        getCanvas(this, '#barChart').then(({ ctx, width, height }) => {
          drawBars(ctx, width, height, withColor);
        });
      });
    });
  },

  openDetail(e) {
    wx.navigateTo({ url: '/pages/mistake-detail/mistake-detail?id=' + e.currentTarget.dataset.id });
  },

  goUpload() {
    wx.navigateTo({ url: '/pages/upload/upload' });
  },

  // 根据最近两周错题，AI 出一份变式练习卷（试卷 + 答案 两个 PDF）
  genPaper() {
    if (this.data.genLoading) return;
    this.setData({ genLoading: true });
    request('/api/papers/generate', { method: 'POST', data: { days: 14 }, timeout: 120000 })
      .then((res) => {
        this.setData({ genLoading: false });
        wx.showModal({
          title: '练习卷已生成',
          content: `已按最近两周错题出题 ${res.count} 道，生成「试卷」和「答案」两个文件。去文件页打印？`,
          confirmText: '去文件页',
          cancelText: '稍后',
          success: (r) => {
            if (r.confirm) wx.switchTab({ url: '/pages/downloads/downloads' });
          },
        });
      })
      .catch((err) => {
        this.setData({ genLoading: false });
        const detail = err && err.data && err.data.detail;
        if (detail) wx.showToast({ title: detail, icon: 'none' });
      });
  },
});
