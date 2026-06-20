// 后端基址 = 部署在服务器上的 FastAPI。
// 开发者工具需在「详情 → 本地设置」勾选「不校验合法域名」才能连 http 地址。
// 注意：仓库若为 public，此 IP 会被公开；介意可改回 localhost 或将仓库设为 private。
const BASE_URL = 'http://139.224.226.80:8000';

module.exports = { BASE_URL };
