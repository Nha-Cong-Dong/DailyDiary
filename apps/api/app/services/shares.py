"""Chia sẻ một ngày nhật ký bằng link công khai (thiết kế B8 · Chia sẻ).

- Chủ trang: xem/bật/sửa/tắt link của một ngày, liệt kê các link đang bật. Mọi truy vấn lọc theo user_id.
- Người nhận: mở link theo token, không cần đăng nhập. Nội dung đọc thẳng từ `entries` mỗi lần mở.
- Link không mở được khi: link đã tắt, nhật ký đã xóa mềm/không còn, tài khoản đã xóa. Cả ba trả cùng một 404.
- Dọn dẹp: xóa tài khoản (Bước 12) và tác vụ dọn bài xóa mềm (Bước 13) phải xóa luôn share_links tương ứng.
"""

import secrets
from datetime import UTC, date, datetime
from uuid import UUID, uuid4

from pymongo import ReturnDocument
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import DuplicateKeyError

from app.core.config import settings
from app.core.errors import ApiError
from app.core.storage import Storage
from app.db import collections as c
from app.schemas.shares import PublicPhotoOut, PublicShareOut, SharedEntryOut, ShareOut, ShareUpdate
from app.services import entries as entry_service

# 16 byte ngẫu nhiên → 22 ký tự base64url (128 bit): không đoán được, đủ ngắn để chép.
TOKEN_BYTES = 16
_SHOW_FIELDS = (
    "show_name",
    "show_score",
    "show_sub_icon",
    "show_flag",
    "show_title",
    "show_content",
    "show_keywords",
)


def _not_found() -> ApiError:
    return ApiError(404, "NOT_FOUND", "Không tìm thấy")


def share_url(token: str) -> str:
    return f"{settings.frontend_url}/s/{token}"


def _share_out(doc: dict) -> ShareOut:
    return ShareOut(
        entry_date=doc["entry_date"],
        token=doc["token"],
        url=share_url(doc["token"]),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        photo_ids=doc["photo_ids"],
        **{name: doc[name] for name in _SHOW_FIELDS},
    )


async def _live_entry(
    db: AsyncDatabase, user_id: UUID, day: str, projection: dict | None = None
) -> dict | None:
    return await entry_service.find_active(db, user_id, date.fromisoformat(day), projection)


async def get_share(db: AsyncDatabase, user_id: UUID, day: str) -> ShareOut | None:
    """Link của một ngày; None nếu chưa bật (hoặc nhật ký ngày đó không còn)."""
    if await _live_entry(db, user_id, day, {"_id": 1}) is None:
        return None
    doc = await db[c.SHARE_LINKS].find_one({"user_id": user_id, "entry_date": day})
    return _share_out(doc) if doc else None


async def upsert_share(db: AsyncDatabase, user_id: UUID, day: str, data: ShareUpdate) -> ShareOut:
    """Bật link (lần đầu sinh token) hoặc đổi phần hiển thị; token giữ nguyên khi chỉ đổi phần."""
    entry = await _live_entry(db, user_id, day, {"photos.id": 1})
    if entry is None:
        raise ApiError(404, "ENTRY_NOT_FOUND", "Ngày này chưa có nhật ký")
    if not data.has_content():
        raise ApiError(422, "SHARE_EMPTY", "Bật ít nhất một phần để có thể chia sẻ")
    entry_photo_ids = {p["id"] for p in entry.get("photos", [])}
    if not set(data.photo_ids) <= entry_photo_ids:
        raise ApiError(422, "VALIDATION_ERROR", "Ảnh không thuộc trang này")

    now = datetime.now(UTC)
    # $set chỉ gồm các trường đã kiểm tra kiểu trong ShareUpdate.
    fields = {name: getattr(data, name) for name in _SHOW_FIELDS}
    fields["photo_ids"] = list(data.photo_ids)
    fields["updated_at"] = now
    update = {
        "$set": fields,
        "$setOnInsert": {"_id": uuid4(), "token": secrets.token_urlsafe(TOKEN_BYTES), "created_at": now},
    }
    query = {"user_id": user_id, "entry_date": day}
    try:
        doc = await db[c.SHARE_LINKS].find_one_and_update(
            query, update, upsert=True, return_document=ReturnDocument.AFTER
        )
    except DuplicateKeyError:
        # Hai request bật link cùng lúc: bên thua chạy lại sẽ khớp document vừa tạo.
        doc = await db[c.SHARE_LINKS].find_one_and_update(
            query, update, upsert=True, return_document=ReturnDocument.AFTER
        )
    return _share_out(doc)


async def delete_share(db: AsyncDatabase, user_id: UUID, day: str) -> None:
    """Tắt link: xóa hẳn, bật lại sẽ có token mới."""
    result = await db[c.SHARE_LINKS].delete_one({"user_id": user_id, "entry_date": day})
    if result.deleted_count == 0:
        raise _not_found()


async def list_shares(db: AsyncDatabase, user_id: UUID) -> list[SharedEntryOut]:
    """Các link đang mở được, mới nhất trước. Link của nhật ký đã xóa mềm không hiện (cũng không mở được)."""
    links = [doc async for doc in db[c.SHARE_LINKS].find({"user_id": user_id}).sort("entry_date", -1)]
    if not links:
        return []
    entries = {
        e["entry_date"]: e
        async for e in db[c.ENTRIES].find(
            {"user_id": user_id, "entry_date": {"$in": [d["entry_date"] for d in links]}, "deleted_at": None},
            {
                "entry_date": 1,
                "title": 1,
                "score": 1,
                "sub_icon": 1,
                "flag_color": 1,
                "photos.id": 1,
                "keywords.keyword": 1,
                # Chỉ cần biết có nội dung hay không: tính ở DB, không đọc cả bài ra.
                "has_content": {
                    "$gt": [{"$strLenCP": {"$trim": {"input": {"$ifNull": ["$content", ""]}}}}, 0]
                },
            },
        )
    }
    out: list[SharedEntryOut] = []
    for doc in links:
        entry = entries.get(doc["entry_date"])
        if entry is None:
            continue
        out.append(
            SharedEntryOut(
                **_share_out(doc).model_dump(),
                title=entry.get("title"),
                score=entry["score"],
                sub_icon=entry.get("sub_icon"),
                flag_color=entry.get("flag_color"),
                photo_count=len(entry.get("photos", [])),
                has_content=entry["has_content"],
                keyword_count=len(entry.get("keywords", [])),
            )
        )
    return out


def valid_token(token: str) -> bool:
    return 22 <= len(token) <= 64 and all(ch.isascii() and (ch.isalnum() or ch in "-_") for ch in token)


async def read_public(db: AsyncDatabase, token: str, storage: Storage | None = None) -> PublicShareOut:
    """Trang người nhận xem. Chỉ đặt các trường được chọn (router trả với exclude_unset)."""
    if not valid_token(token):
        raise _not_found()
    link = await db[c.SHARE_LINKS].find_one({"token": token})
    if link is None:
        raise _not_found()
    user = await db[c.USERS].find_one(
        {"_id": link["user_id"], "deleted_at": None}, {"display_name": 1, "icon_set_id": 1}
    )
    entry = await _live_entry(db, link["user_id"], link["entry_date"]) if user else None
    if entry is None:
        raise _not_found()

    fields: dict = {"entry_date": link["entry_date"]}
    if link["show_name"]:
        fields["author_name"] = user["display_name"]
    if link["show_score"]:
        fields["score"] = entry["score"]
        fields["icon_set_id"] = user.get("icon_set_id")
    if link["show_sub_icon"]:
        fields["sub_icon"] = entry.get("sub_icon")
    if link["show_flag"]:
        fields["flag_color"] = entry.get("flag_color")
    if link["show_title"]:
        fields["title"] = entry.get("title")
    if link["show_content"]:
        fields["content"] = entry.get("content")
    if link["show_keywords"]:
        fields["keywords"] = [k["keyword"] for k in entry.get("keywords", [])]
    if link["photo_ids"]:
        # Ảnh đã bị xóa khỏi trang thì bỏ qua. Chỉ ký cho key lấy từ trang của chủ link.
        selected = set(link["photo_ids"])
        shared = sorted(
            (p for p in entry.get("photos", []) if p["id"] in selected), key=lambda p: p["position"]
        )
        fields["photo_count"] = len(shared)
        if storage is not None:
            fields["photos"] = [
                PublicPhotoOut(
                    url=storage.view_url(p["storage_key"]),
                    thumb_url=storage.view_url(p["thumb_key"]),
                    width=p["width"],
                    height=p["height"],
                )
                for p in shared
            ]
    return PublicShareOut(**fields)
