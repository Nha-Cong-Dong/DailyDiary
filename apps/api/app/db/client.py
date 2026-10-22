from typing import Annotated

from fastapi import Depends, Request
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase


def make_client(uri: str) -> AsyncMongoClient:
    """Một client cho mỗi process (tạo trong lifespan). Client tự quản lý pool kết nối."""
    return AsyncMongoClient(
        uri,
        uuidRepresentation="standard",  # lưu uuid.UUID dạng BSON binary subtype 4
        tz_aware=True,  # datetime đọc ra luôn có múi giờ (UTC)
        serverSelectionTimeoutMS=3000,  # DB sập thì báo lỗi sau 3 giây, không treo 30 giây
        appname="dailydiary-api",
    )


async def get_db(request: Request) -> AsyncDatabase:
    return request.app.state.db


Db = Annotated[AsyncDatabase, Depends(get_db)]
