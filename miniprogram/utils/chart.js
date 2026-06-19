// 轻量原生 Canvas 2D 图表：雷达图 + 柱状图。无第三方依赖。
// 用法：先在 wxml 放 <canvas type="2d" id="xxx" />，再在页面里
//   getCanvas(this, '#xxx').then(({ ctx, width, height, dpr }) => drawRadar(ctx, w, h, data))

const PRIMARY = '#0d6e6e';

// 取到 canvas 2d 上下文并按 dpr 缩放，返回逻辑宽高
function getCanvas(page, selector) {
  return new Promise((resolve) => {
    wx.createSelectorQuery()
      .in(page)
      .select(selector)
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res && res[0];
        if (!info || !info.node) return; // 节点未就绪
        const canvas = info.node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio;
        canvas.width = info.width * dpr;
        canvas.height = info.height * dpr;
        ctx.scale(dpr, dpr);
        resolve({ ctx, width: info.width, height: info.height });
      });
  });
}

// 雷达图：data = [{subject, value(0-100)}]
function drawRadar(ctx, W, H, data) {
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2;
  const cy = H / 2 + 4;
  const R = Math.min(W, H) / 2 - 26;
  const n = data.length;
  const ang = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  // 网格（4 圈）
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) {
    const r = (R * ring) / 4;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = ang(i % n);
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  // 轴线
  for (let i = 0; i < n; i++) {
    const a = ang(i);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + R * Math.cos(a), cy + R * Math.sin(a));
    ctx.stroke();
  }
  // 数据多边形
  ctx.beginPath();
  data.forEach((d, i) => {
    const a = ang(i);
    const r = (R * Math.max(0, Math.min(100, d.value))) / 100;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(13,110,110,0.18)';
  ctx.fill();
  ctx.strokeStyle = PRIMARY;
  ctx.lineWidth = 2;
  ctx.stroke();
  // 标签
  ctx.fillStyle = '#6b7a8d';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  data.forEach((d, i) => {
    const a = ang(i);
    const x = cx + (R + 14) * Math.cos(a);
    const y = cy + (R + 14) * Math.sin(a);
    ctx.fillText(d.subject, x, y);
  });
}

// 柱状图：data = [{subject, count, color}]
function drawBars(ctx, W, H, data) {
  ctx.clearRect(0, 0, W, H);
  const padL = 8;
  const padB = 22;
  const padT = 8;
  const max = Math.max(...data.map((d) => d.count), 1);
  const n = data.length;
  const gap = 14;
  const bw = (W - padL * 2 - gap * (n - 1)) / n;

  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    const x = padL + i * (bw + gap);
    const bh = ((H - padT - padB) * d.count) / max;
    const y = H - padB - bh;
    ctx.fillStyle = d.color || PRIMARY;
    const r = 4;
    // 圆角矩形（顶部圆角）
    ctx.beginPath();
    ctx.moveTo(x, y + bh);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + bw - r, y);
    ctx.arcTo(x + bw, y, x + bw, y + r, r);
    ctx.lineTo(x + bw, y + bh);
    ctx.closePath();
    ctx.fill();
    // 数值
    ctx.fillStyle = '#1a2332';
    ctx.fillText(String(d.count), x + bw / 2, y - 4);
    // 学科名
    ctx.fillStyle = '#6b7a8d';
    ctx.fillText(d.subject, x + bw / 2, H - 6);
  });
}

module.exports = { getCanvas, drawRadar, drawBars };
