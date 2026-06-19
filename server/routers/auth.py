from fastapi import APIRouter

import auth as auth_mod
from models import LoginRequest, LoginResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(req: LoginRequest):
    openid = await auth_mod.code_to_openid(req.code)
    user_id = auth_mod.upsert_user(openid)
    token = auth_mod.create_token(user_id, openid)
    return LoginResponse(token=token, openid=openid)
