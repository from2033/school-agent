const { request, BASE_URL } = require('../../utils/request');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

Page({
  data: { list: [], loading: true, fileIcon: icon('file', '#9aa7b5') },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.load();
  },

  load() {
    this.setData({ loading: true });
    request('/api/downloads').then((list) => {
      this.setData({
        loading: false,
        list: list.map((d) => {
          const style = d.subject === '通知'
            ? { ink: '#6b7280', wash: '#eef0f5' }
            : sub(d.subject);
          return { ...d, sizeText: fmtSize(d.size_bytes), ...style, iconSrc: icon('file', style.ink) };
        }),
      });
    }).catch(() => this.setData({ loading: false }));
  },

  onDownload(e) {
    const item = e.currentTarget.dataset.item;
    wx.showLoading({ title: '下载中…' });
    wx.downloadFile({
      url: BASE_URL + '/api/downloads/' + item.id + '/file',
      success(res) {
        wx.hideLoading();
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        wx.openDocument({
          filePath: res.tempFilePath,
          showMenu: true,
          fail() { wx.showToast({ title: '已下载，但无法预览此格式', icon: 'none' }); },
        });
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },
});
