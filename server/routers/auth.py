from secrets import compare_digest

from fastapi import APIRouter, HTTPException

import auth as auth_mod
import config
from models import LoginRequest, LoginResponse, WebLoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    openid = await auth_mod.code_to_openid(req.code)
    user_id = auth_mod.upsert_user(openid)
    token = auth_mod.create_token(user_id, openid)
    return LoginResponse(token=token, openid=openid)


@router.post("/web-login", response_model=LoginResponse)
def web_login(req: WebLoginRequest):
    """Safari/PWA 登录：共享访问码 + 本机随机设备 ID。"""
    if not config.WEB_ACCESS_CODE:
        raise HTTPException(status_code=503, detail="Web 访问码尚未配置")
    if not compare_digest(req.access_code.strip(), config.WEB_ACCESS_CODE):
        raise HTTPException(status_code=401, detail="访问码错误")
    safe_device = "".join(ch for ch in req.device_id if ch.isalnum() or ch in "-_")[:80]
    if not safe_device:
        raise HTTPException(status_code=400, detail="设备标识无效")
    openid = f"web_{safe_device}"
    user_id = auth_mod.upsert_user(openid)
    token = auth_mod.create_token(user_id, openid)
    return LoginResponse(token=token, openid=openid)
