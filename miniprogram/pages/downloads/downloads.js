const { request, BASE_URL } = require('../../utils/request');
const { icon } = require('../../utils/icons');
const { sub } = require('../../utils/subjects');
const { today, label, dayOf } = require('../../utils/date');

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

Page({
  data: {
    all: [],            // 当天全部文件（已装饰）
    list: [],           // 按当前学科过滤后展示的文件
    subjects: ['全部'], // 学科筛选条，从当天文件中提取
    filter: '全部',
    loading: true,
    date: today(),
    dateLabel: label(today()),
    fileIcon: icon('file', '#9aa7b5'),
    calendarIcon: icon('clock', '#ffffff'),
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    // 每次进入都从「今天」重新开始：刚生成的练习卷（今天）才不会被上次回退的旧日期挡住；
    // 今天没文件时 load() 仍会自动回退到最近有文件的日期。
    this.setData({ date: today(), dateLabel: label(today()), filter: '全部' }, () => this.load());
  },

  onDate(e) {
    const date = e.detail.value;
    this.setData({ date, dateLabel: label(date), filter: '全部' }, () => this.load());
  },

  onFilter(e) {
    this.setData({ filter: e.currentTarget.dataset.s }, () => this.applyFilter());
  },

  // 从全部文件提取学科作为筛选条；再按当前 filter 过滤展示列表
  applyFilter() {
    const all = this.data.all;
    const subjects = ['全部'];
    all.forEach((d) => {
      if (d.subject && subjects.indexOf(d.subject) === -1) subjects.push(d.subject);
    });
    const filter = subjects.indexOf(this.data.filter) === -1 ? '全部' : this.data.filter;
    const list = filter === '全部' ? all : all.filter((d) => d.subject === filter);
    this.setData({ subjects, filter, list });
  },

  decorate(list) {
    return list.map((d) => {
      const style = d.subject === '通知'
        ? { ink: '#6b7280', wash: '#eef0f5' }
        : sub(d.subject);
      return {
        ...d,
        sizeText: fmtSize(d.size_bytes),
        dateText: label(dayOf(d.created_at)),
        ...style,
        iconSrc: icon('file', style.ink),
      };
    });
  },

  load(noFallback) {
    this.setData({ loading: true });
    const q = this.data.date ? '?date=' + this.data.date : '';
    request('/api/downloads' + q).then((list) => {
      // 今天没有文件时，自动跳到最近一个有文件的日期（避免默认空白）
      if (list.length === 0 && !noFallback) {
        this.fallbackToLatest();
        return;
      }
      this.setData({ loading: false, all: this.decorate(list) }, () => this.applyFilter());
    }).catch(() => this.setData({ loading: false }));
  },

  fallbackToLatest() {
    request('/api/downloads').then((all) => {
      if (!all.length) { this.setData({ all: [], list: [], subjects: ['全部'], loading: false }); return; }
      const latest = all.reduce((a, d) => {
        const day = dayOf(d.created_at);
        return day > a ? day : a;
      }, dayOf(all[0].created_at));
      this.setData({ date: latest, dateLabel: label(latest) }, () => this.load(true));
    }).catch(() => this.setData({ loading: false }));
  },

  onDownload(e) {
    const item = e.currentTarget.dataset.item;
    const url = BASE_URL + '/api/downloads/' + item.id + '/file';
    // 下载链接本身无扩展名，必须靠文件名后缀让系统识别格式，否则 openDocument 会失败
    const ext = (item.name.split('.').pop() || '').toLowerCase();
    const IMG = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const DOC = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf'];

    // 图片：openDocument 不支持，直接走图片预览
    if (IMG.indexOf(ext) !== -1) {
      wx.previewImage({ urls: [url], fail() { wx.showToast({ title: '无法预览图片', icon: 'none' }); } });
      return;
    }

    wx.showLoading({ title: '打开中…' });
    // 指定带正确后缀的保存路径，临时文件就有扩展名，系统才能识别格式
    const filePath = ext ? `${wx.env.USER_DATA_PATH}/dl_${item.id}.${ext}` : undefined;
    wx.downloadFile({
      url,
      filePath,
      success(res) {
        wx.hideLoading();
        if (res.statusCode !== 200) {
          wx.showToast({ title: '下载失败', icon: 'none' });
          return;
        }
        const opts = {
          filePath: res.filePath || res.tempFilePath,
          showMenu: true,
          fail() { wx.showToast({ title: '已下载，但无法预览此格式', icon: 'none' }); },
        };
        if (DOC.indexOf(ext) !== -1) opts.fileType = ext;
        wx.openDocument(opts);
      },
      fail() {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
    });
  },
});
