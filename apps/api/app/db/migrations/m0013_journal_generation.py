"""Sổ chung: một cặp có thể có nhiều cuốn nối tiếp (sổ cũ lưu trữ, sổ mới đánh số lại từ 0).

- `shared_journals.generation`: lần thứ mấy của cặp (1, 2, …). Sổ có sẵn được gán 1.
- Index unique đổi từ `member_key` sang `(member_key, generation)`: mỗi lần chỉ một cuốn mỗi số thứ tự,
  nên hai người bấm chấp nhận cùng lúc vẫn chỉ tạo được một cuốn mới (DuplicateKeyError xử lý ở service).
  Trần số cuốn mỗi cặp đọc từ `shared/limits.json` (`journals_per_pair_max`), không nằm ở index.

- `journal_requests`: unique theo hướng chỉ áp cho lời mời đang chờ, để mời lại được sau khi lời mời cũ xong.

Chạy lại được: backfill chỉ chạm sổ thiếu `generation`; index tạo/xóa theo tên cố định.
"""

from pymongo import ASCENDING, IndexModel
from pymongo.asynchronous.database import AsyncDatabase

from app.db import collections as c

ID = "0013_journal_generation"


async def up(db: AsyncDatabase) -> None:
    coll = db[c.SHARED_JOURNALS]
    await coll.update_many({"generation": {"$exists": False}}, {"$set": {"generation": 1}})
    if "uq_member_key" in await coll.index_information():
        await coll.drop_index("uq_member_key")
    await coll.create_indexes(
        [
            IndexModel(
                [("member_key", ASCENDING), ("generation", ASCENDING)],
                unique=True,
                name="uq_member_key_generation",
                partialFilterExpression={"scope": "pair"},
            )
        ]
    )

    # `journal_requests`: unique (người mời, người nhận) của m0011 chặn mọi lời mời lại sau khi lời mời cũ
    # đã chấp nhận/từ chối. Đổi thành partial: chỉ một lời mời *đang chờ* mỗi hướng.
    requests = db[c.JOURNAL_REQUESTS]
    if "uq_pair_directed" in await requests.index_information():
        await requests.drop_index("uq_pair_directed")
    await requests.create_indexes(
        [
            IndexModel(
                [("requester_id", ASCENDING), ("addressee_id", ASCENDING)],
                unique=True,
                name="uq_pair_directed_pending",
                partialFilterExpression={"status": "pending"},
            )
        ]
    )
