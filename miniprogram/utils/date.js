// 日期小工具：统一 YYYY-MM-DD 处理

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

// 今天，格式 YYYY-MM-DD
function today() {
  const d = new Date();
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

// 取日期部分（兼容 "2026-06-20 08:32:00" / "2026-06-20"），返回 YYYY-MM-DD
function dayOf(s) {
  if (!s) return '';
  return String(s).slice(0, 10);
}

// 展示用：YYYY-MM-DD -> MM月DD日
function label(s) {
  const d = dayOf(s);
  if (d.length < 10) return d;
  return Number(d.slice(5, 7)) + '月' + Number(d.slice(8, 10)) + '日';
}

module.exports = { today, dayOf, label };
