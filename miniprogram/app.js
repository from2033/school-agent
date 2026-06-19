const { BASE_URL } = require('./utils/config');

App({
  globalData: {
    openid: '',
    loginPromise: null,
  },

  onLaunch() {
    this.globalData.loginPromise = this.login();
  },

  // wx.login 拿 code → 后端换 openid + 签发 JWT → 存本地
  login() {
    if (this.globalData.loginPromise) return this.globalData.loginPromise;

    const task = new Promise((resolve, reject) => {
      wx.login({
        success: ({ code }) => {
          wx.request({
            url: BASE_URL + '/api/auth/login',
            method: 'POST',
            data: { code },
            success: (res) => {
              if (res.statusCode === 200) {
                wx.setStorageSync('token', res.data.token);
                this.globalData.openid = res.data.openid;
                resolve(res.data);
              } else {
                reject(res);
              }
            },
            fail: reject,
          });
        },
        fail: reject,
      });
    });

    this.globalData.loginPromise = task;
    task.finally(() => {
      this.globalData.loginPromise = null;
    });
    return task;
  },
});
