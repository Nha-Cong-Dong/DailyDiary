"""Định dạng lỗi thống nhất: {"error": {"code": ..., "message": ...}} (xem skill api-conventions)."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(
        self, status_code: int, code: str, message: str, headers: dict[str, str] | None = None
    ) -> None:
        super().__init__(code)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers


def error_response(
    status_code: int, code: str, message: str, headers: dict[str, str] | None = None
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
        headers=headers,
    )


_HTTP_CODES = {
    400: ("BAD_REQUEST", "Yêu cầu không hợp lệ"),
    401: ("AUTH_REQUIRED", "Bạn cần đăng nhập"),
    403: ("FORBIDDEN", "Không có quyền thực hiện"),
    404: ("NOT_FOUND", "Không tìm thấy"),
    405: ("METHOD_NOT_ALLOWED", "Phương thức không được hỗ trợ"),
    409: ("CONFLICT", "Dữ liệu đã thay đổi"),
    413: ("PAYLOAD_TOO_LARGE", "Dữ liệu quá lớn"),
}

INTERNAL_ERROR = (500, "INTERNAL_ERROR", "Có lỗi xảy ra, vui lòng thử lại")


async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message, exc.headers)


async def _http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code, message = _HTTP_CODES.get(exc.status_code, ("HTTP_ERROR", "Yêu cầu không thành công"))
    return error_response(exc.status_code, code, message, getattr(exc, "headers", None))


async def _validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
    # Chỉ nêu vị trí trường sai; không trả lại giá trị người dùng gửi (có thể là nội dung nhật ký).
    first = exc.errors()[0] if exc.errors() else {}
    loc = ".".join(str(p) for p in first.get("loc", ()) if p != "body")
    message = f"Dữ liệu không hợp lệ: {loc}" if loc else "Dữ liệu không hợp lệ"
    return error_response(422, "VALIDATION_ERROR", message)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _api_error)
    app.add_exception_handler(StarletteHTTPException, _http_error)
    app.add_exception_handler(RequestValidationError, _validation_error)
    # Lỗi 500 không bắt ở đây mà ở RequestLogMiddleware (nằm trong CORS), để response 500 vẫn có header CORS.
