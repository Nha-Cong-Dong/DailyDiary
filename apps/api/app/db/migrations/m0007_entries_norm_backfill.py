"""entries: điền `title_norm` / `content_norm` cho trang cũ chưa có (tìm kiếm F-05, Bước 11).

- Từ Bước 5, mỗi lần lưu đã ghi hai trường này (m0004 thêm vào validator). Trang tạo trước đó (dữ liệu
  nạp tay, bản thử) có thể còn thiếu → tìm không dấu không thấy. Tính lại bằng đúng hàm lúc ghi
  (`keyword_norm`).
- Chạy lại được: chỉ đọc document còn thiếu một trong hai trường; ghi từng lô bằng bulk_write.
"""

from pymongo import UpdateOne
from pymongo.asynchronous.database import AsyncDatabase

from app.core.text import keyword_norm
from app.db import collections as c

ID = "0007_entries_norm_backfill"
BATCH = 500


async def up(db: AsyncDatabase) -> None:
    missing = {"$or": [{"title_norm": {"$exists": False}}, {"content_norm": {"$exists": False}}]}
    ops: list[UpdateOne] = []
    async for doc in db[c.ENTRIES].find(missing, {"title": 1, "content": 1}):
        title, content = doc.get("title"), doc.get("content")
        ops.append(
            UpdateOne(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "title_norm": keyword_norm(title) if title else None,
                        "content_norm": keyword_norm(content) if content else None,
                    }
                },
            )
        )
        if len(ops) >= BATCH:
            await db[c.ENTRIES].bulk_write(ops, ordered=False)
            ops = []
    if ops:
        await db[c.ENTRIES].bulk_write(ops, ordered=False)
