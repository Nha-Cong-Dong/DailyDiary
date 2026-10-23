"""Log request: chỉ ghi user, method, đường dẫn (không query string), mã trạng thái, thời gian xử lý.

Không ghi body, query string (có thể chứa từ khóa tìm kiếm), header hay thông điệp của exception.
Token chia sẻ trong đường dẫn công khai được che (ai có token là xem được trang).
"""

import logging
import re
import time
import traceback

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.errors import INTERNAL_ERROR, error_response

logger = logging.getLogger("dailydiary.request")

_SHARE_TOKEN = re.compile(r"^(/public/shares/)[^/]+")


def redact_path(path: str) -> str:
    return _SHARE_TOKEN.sub(lambda m: m.group(1) + "***", path)


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(level=level, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    # Access log của uvicorn ghi cả query string (vd. /search?q=<từ khóa>) → tắt, dùng RequestLogMiddleware.
    logging.getLogger("uvicorn.access").disabled = True
    # Log DEBUG của PyMongo ghi nguyên câu lệnh và kết quả (từ khóa tìm kiếm, tiêu đề, nội dung)
    # → không bao giờ dưới WARNING, kể cả khi bật DEBUG cho app.
    logging.getLogger("pymongo").setLevel(logging.WARNING)


class RequestLogMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        status = 500
        response_started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal status, response_started
            if message["type"] == "http.response.start":
                status = message["status"]
                response_started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:
            # Chỉ ghi loại lỗi và vị trí trong code; str(exc) có thể chứa dữ liệu người dùng.
            frames = "".join(traceback.format_tb(exc.__traceback__))
            logger.error("unhandled %s\n%s", type(exc).__name__, frames)
            if response_started:
                raise
            status_code, code, message = INTERNAL_ERROR
            await error_response(status_code, code, message)(scope, receive, send_wrapper)
        finally:
            user_id = (scope.get("state") or {}).get("user_id", "-")
            ms = (time.perf_counter() - start) * 1000
            path = redact_path(scope["path"])
            logger.info("user=%s %s %s %d %.1fms", user_id, scope["method"], path, status, ms)
