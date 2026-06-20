const { upload } = require('../../utils/request');
const { icon } = require('../../utils/icons');

const MAX = 9;

Page({
  data: {
    note: '',
    images: [],          // 本地临时路径数组
    uploading: false,
    progress: '',
    ic: {
      x: icon('x', '#ffffff'),
      camera: icon('camera', '#0d6e6e'),
      upload: icon('upload', '#ffffff'),
      plus: icon('plus', '#9aa7b5'),
    },
  },

  back() { wx.navigateBack(); },
  onNote(e) { this.setData({ note: e.detail.value }); },

  chooseImage() {
    const remain = MAX - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ title: `最多 ${MAX} 张`, icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const paths = res.tempFiles.map((f) => f.tempFilePath);
        this.setData({ images: this.data.images.concat(paths) });
      },
    });
  },

  removeImage(e) {
    const i = e.currentTarget.dataset.index;
    const images = this.data.images.slice();
    images.splice(i, 1);
    this.setData({ images });
  },

  async submit() {
    if (this.data.uploading) return;
    if (this.data.images.length === 0) {
      wx.showToast({ title: '请先选择题目图片', icon: 'none' });
      return;
    }
    this.setData({ uploading: true });

    const total = this.data.images.length;
    const formData = { note: this.data.note };
    const results = [];

    try {
      for (let i = 0; i < total; i++) {
        this.setData({ progress: `AI 分析中 ${i + 1}/${total}` });
        const res = await upload('/api/mistakes', this.data.images[i], formData);
        results.push(res);
      }
      wx.showToast({ title: '分析完成', icon: 'success' });
      setTimeout(() => {
        if (results.length === 1) {
          wx.redirectTo({ url: '/pages/mistake-detail/mistake-detail?id=' + results[0].id });
        } else {
          wx.switchTab({ url: '/pages/mistakes/mistakes' });
        }
      }, 600);
    } catch (e) {
      const detail = e && e.data && e.data.detail;
      wx.showToast({ title: detail || '上传失败，请重试', icon: 'none' });
      this.setData({ uploading: false, progress: '' });
    }
  },
});
