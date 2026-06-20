const { request, upload, BASE_URL } = require('../../utils/request');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');

Page({
  data: {
    m: null, subjectStyle: sub('数学'), images: [],
    ic: {
      x: icon('x', '#ffffff'),
      target: icon('target', '#e53e3e'),
      alert: icon('alert', '#e53e3e'),
      zap: icon('zap', '#f59e0b'),
      camera: icon('camera', '#9aa7b5'),
      uploadWhite: icon('upload', '#ffffff'),
    },
  },

  onLoad(query) {
    this.mistakeId = query.id;
    this.refresh();
  },

  refresh() {
    return request('/api/mistakes/' + this.mistakeId).then((m) => {
      this.setData({
        m,
        subjectStyle: sub(m.subject),
        images: (m.images || []).map((p) => BASE_URL + p),
      });
    });
  },

  back() { wx.navigateBack(); },

  previewImg(e) {
    wx.previewImage({ current: e.currentTarget.dataset.cur, urls: this.data.images });
  },

  // 给当前这道题再传图（可多张），后端用全部图片重新分析（只在最后一张触发分析）
  addImage() {
    wx.chooseMedia({
      count: 9,
      mediaType: ['image'],
      success: (res) => {
        const files = res.tempFiles.map((f) => f.tempFilePath);
        if (!files.length) return;
        const id = this.mistakeId;
        wx.showLoading({ title: 'AI 分析中…', mask: true });
        // 依次上传：前面的只追加不分析，最后一张触发综合重新分析
        files.reduce(
          (chain, fp, i) => chain.then(() =>
            upload('/api/mistakes/' + id + '/images', fp, {
              analyze: i === files.length - 1 ? 'true' : 'false',
            })),
          Promise.resolve()
        ).then((m) => {
          this.setData({
            m,
            subjectStyle: sub(m.subject),
            images: (m.images || []).map((p) => BASE_URL + p),
          });
          wx.hideLoading();
          wx.showToast({ title: '已加入并重新分析', icon: 'success' });
        }).catch((err) => {
          wx.hideLoading();
          const detail = err && err.data && err.data.detail;
          wx.showToast({ title: detail ? '分析失败，请重试' : '上传失败', icon: 'none' });
        });
      },
    });
  },
});
