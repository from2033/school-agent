"""鉴权：wx.login 的 code 换 openid，签发 / 校验 JWT。

- 配了 WX_APPID/WX_SECRET：调用微信 jscode2session 换真实 openid。
- 未配置：用 code 派生一个 mock openid，方便本地联调（无需真小程序 appid）。
"""
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

import config
from db import db

_bearer = HTTPBearer(auto_error=True)


async def code_to_openid(code: str) -> str:
    if not (config.WX_APPID and config.WX_SECRET):
        # 本地 mock：保证同一个 code 映射到稳定的 openid
        return f"mock_{abs(hash(code)) % 10_000_000}"

    url = "https://api.weixin.qq.com/sns/jscode2session"
    params = {
        "appid": config.WX_APPID,
        "secret": config.WX_SECRET,
        "js_code": code,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url, params=params)
    data = resp.json()
    openid = data.get("openid")
    if not openid:
        raise HTTPException(status_code=400, detail=f"微信登录失败: {data}")
    return openid


def upsert_user(openid: str) -> int:
    with db() as conn:
        row = conn.execute("SELECT id FROM users WHERE openid = ?", (openid,)).fetchone()
        if row:
            return row["id"]
        cur = conn.execute("INSERT INTO users (openid) VALUES (?)", (openid,))
        return cur.lastrowid


def create_token(user_id: int, openid: str) -> str:
    payload = {
        "sub": str(user_id),
        "openid": openid,
        "exp": datetime.now(timezone.utc) + timedelta(days=config.JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


async def current_user(
    cred: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    try:
        payload = jwt.decode(cred.credentials, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无效或过期的 token")
    return {"user_id": int(payload["sub"]), "openid": payload.get("openid")}
