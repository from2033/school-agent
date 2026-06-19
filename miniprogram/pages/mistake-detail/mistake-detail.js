const { request, BASE_URL } = require('../../utils/request');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');

Page({
  data: {
    m: null, subjectStyle: sub('数学'), imageUrl: '',
    ic: {
      x: icon('x', '#ffffff'),
      target: icon('target', '#e53e3e'),
      alert: icon('alert', '#e53e3e'),
      zap: icon('zap', '#f59e0b'),
      camera: icon('camera', '#9aa7b5'),
      printerWhite: icon('printer', '#ffffff'),
      upload: icon('upload', '#0d6e6e'),
    },
  },

  onLoad(query) {
    request('/api/mistakes/' + query.id).then((m) => {
      this.setData({
        m,
        subjectStyle: sub(m.subject),
        imageUrl: m.image_path ? BASE_URL + m.image_path : '',
      });
    });
  },

  back() { wx.navigateBack(); },
  reupload() { wx.redirectTo({ url: '/pages/upload/upload' }); },
});
