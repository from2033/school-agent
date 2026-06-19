// 封装 wx.request：自动拼基址、带 JWT、统一错误提示，返回 Promise。
const { BASE_URL } = require('./config');

function request(path, options = {}, retried = false) {
  const { method = 'GET', data, header = {} } = options;
  const token = wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...header,
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          if (retried) {
            reject(res);
            return;
          }
          wx.removeStorageSync('token');
          getApp().login()
            .then(() => request(path, options, true))
            .then(resolve)
            .catch(reject);
        } else {
          wx.showToast({ title: '请求失败 ' + res.statusCode, icon: 'none' });
          reject(res);
        }
      },
      fail(err) {
        wx.showToast({ title: '网络错误', icon: 'none' });
        reject(err);
      },
    });
  });
}

// multipart 上传（错题图片）。wx.uploadFile 单独走，因为它不支持普通 JSON body。
function upload(path, filePath, formData = {}) {
  const token = wx.getStorageSync('token');
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: BASE_URL + path,
      filePath,
      name: 'image',
      formData,
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(res) {
        try {
          resolve(JSON.parse(res.data));
        } catch (e) {
          reject(res);
        }
      },
      fail: reject,
    });
  });
}

module.exports = { request, upload, BASE_URL };
