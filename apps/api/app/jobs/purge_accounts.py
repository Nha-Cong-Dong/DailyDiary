"""Làm nốt việc xóa tài khoản còn dang dở: `uv run python -m app.jobs.purge_accounts`.

Xóa tài khoản dọn kho ảnh và document `users` trong nền; nếu server tắt giữa chừng, tài khoản còn
`deleted_at`.
Tác vụ này tìm và dọn nốt; chạy lại không hỏng gì. Bước 13 đặt lịch chạy định kỳ.
"""

import asyncio

from app.core.config import settings
from app.core.logging import configure_logging
from app.core.storage import make_storage
from app.db.client import make_client
from app.services.account import purge_pending


async def main() -> int:
    client = make_client(settings.mongodb_uri)
    try:
        return await purge_pending(client[settings.mongodb_db], make_storage())
    finally:
        await client.close()


if __name__ == "__main__":
    configure_logging()
    print(f"Đã dọn xong {asyncio.run(main())} tài khoản.")
