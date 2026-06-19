# QQ 群实时监听（OneBot 11 / NapCat）

> 这是非官方 QQ 客户端桥接方案，可能触发风控或封号。请使用专门 QQ 小号，
> 不要监听未获得群成员授权的群。

## 数据链路

```text
QQ 小号 + NapCat
  → OneBot 11 HTTP 事件上报
  → POST /api/integrations/onebot/events
  → 群白名单 / 老师过滤 / 消息去重 / 自动分类
  → SQLite messages 表
  → 小程序通知页
```

## 后端配置

在 `server/.env` 添加：

```env
ONEBOT_ACCESS_TOKEN=换成随机长字符串
QQ_GROUP_IDS=目标群号1,目标群号2
QQ_TEACHER_IDS=老师QQ号1,老师QQ号2
QQ_TEACHER_NAME_KEYWORDS=老师
QQ_CAPTURE_ALL=false
```

- `QQ_GROUP_IDS`：只接收这些群，强烈建议配置。
- `QQ_TEACHER_IDS`：最可靠的老师白名单。
- `QQ_TEACHER_NAME_KEYWORDS`：未填老师 QQ 号时，根据群名片判断。
- `QQ_CAPTURE_ALL=true`：接收白名单群全部文字消息，不建议默认开启。

## NapCat 事件上报

在 NapCat 的 OneBot 11 网络配置中新增 HTTP 客户端/事件上报：

```text
URL: http://你的后端地址:8000/api/integrations/onebot/events
Token: 与 ONEBOT_ACCESS_TOKEN 相同
```

如果 NapCat 和后端在同一台机器，URL 可用：

```text
http://127.0.0.1:8000/api/integrations/onebot/events
```

容器运行时不要使用容器内的 `127.0.0.1` 指向宿主机，应改用宿主机地址。

## 测试

```bash
curl -X POST http://127.0.0.1:8000/api/integrations/onebot/events \
  -H 'Authorization: Bearer 你的Token' \
  -H 'Content-Type: application/json' \
  -d '{
    "post_type": "message",
    "message_type": "group",
    "self_id": 10000,
    "group_id": 123456789,
    "user_id": 20000,
    "message_id": 90001,
    "time": 1781870400,
    "sender": {"nickname": "王老师", "card": "王老师（数学）"},
    "message": [{"type": "text", "data": {"text": "今晚作业：课本 P45 第3、5题"}}]
  }'
```
