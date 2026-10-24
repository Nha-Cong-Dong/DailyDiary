"""Sentry cho backend (Bước 13, đặc tả 4.1 "Công cụ bắt lỗi": lọc nội dung nhật ký khỏi dữ liệu gửi về).

Để trống SENTRY_DSN (local, test, CI) thì không khởi tạo gì. Khi bật, mọi sự kiện đi qua `scrub_event`
trước khi gửi. Cách làm là giữ theo danh sách cho phép (không chặn theo danh sách cấm): trường nào không có
trong danh sách dưới đây thì bỏ, để tích hợp mới của SDK có thêm trường cũng không lọt nội dung ra ngoài.

Những gì bị bỏ và vì sao:
- `request.data` (body: tiêu đề, nội dung, từ khóa), `request.query_string` và phần query của mọi URL
  (`/search?q=<từ khóa>`), `request.cookies` (phiên đăng nhập), `request.env` (IP), mọi header trừ
  vài header vô hại (user-agent, content-type, content-length).
- Token chia sẻ trong đường dẫn `/public/shares/<token>` và `/s/<token>` được che thành `***`
  (ai có token là xem được trang).
- Thông điệp của exception (`exception.values[].value`): str(exc) có thể chứa dữ liệu người dùng
  (vd. lỗi kiểm tra của Pydantic in lại giá trị đã gửi). Chỉ giữ loại exception, module và stack (tên file,
  hàm, dòng code); không giữ biến cục bộ (`include_local_variables=False`, `vars` bị xóa thêm lần nữa).
- Log thành sự kiện / thông điệp tự do: chỉ giữ mẫu log khi có tham số (`logger.error("... %s", x)`:
  mẫu là chuỗi hằng trong code); bỏ `params`, `formatted` và thông điệp không có tham số (có thể là
  f-string chứa dữ liệu).
- Breadcrumb: chỉ giữ loại, nhóm, mức và thời điểm; bỏ `message` và `data` (log tự do, câu lệnh MongoDB,
  URL có query); riêng breadcrumb HTTP giữ thêm method và mã trạng thái.
- `user` chỉ giữ `id` (mã nội bộ `request.state.user_id`; không email, tên, IP). `extra` bỏ hẳn;
  `contexts` chỉ giữ trace, runtime, os và mã trạng thái của response.
- Span của transaction: mô tả rút gọn (câu lệnh MongoDB chỉ còn tên lệnh + collection, URL bỏ query
  và che token); `data`/`tags` chỉ giữ vài khóa kỹ thuật.
"""

import re
from collections.abc import Mapping
from functools import partial
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import sentry_sdk
from fastapi import FastAPI
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import ignore_logger
from sentry_sdk.integrations.starlette import StarletteIntegration
from starlette.types import ASGIApp, Receive, Scope, Send

from app.core.config import settings

FILTERED = "[đã lọc]"

_TOKEN_PATH = re.compile(r"^(/public/shares/|/s/)[^/]+")
_SAFE_HEADERS = frozenset({"user-agent", "content-type", "content-length"})
_SAFE_CONTEXTS = frozenset({"trace", "runtime", "os"})
_SAFE_TRACE_KEYS = frozenset(
    {"trace_id", "span_id", "parent_span_id", "op", "status", "origin", "type", "dynamic_sampling_context"}
)
_SAFE_SPAN_DATA = frozenset(
    {
        "db.system",
        "db.name",
        "db.operation",
        "db.mongodb.collection",
        "http.method",
        "http.request.method",
        "http.response.status_code",
        "server.address",
        "thread.id",
        "thread.name",
    }
)
_SAFE_SPAN_KEYS = frozenset(
    {
        "trace_id",
        "span_id",
        "parent_span_id",
        "same_process_as_parent",
        "op",
        "status",
        "origin",
        "start_timestamp",
        "timestamp",
    }
)
_SAFE_EXCEPTION_KEYS = frozenset({"type", "module", "mechanism", "stacktrace", "thread_id"})
_SAFE_BREADCRUMB_KEYS = frozenset({"type", "category", "level", "timestamp"})


def redact_path(path: str) -> str:
    """Che token chia sẻ trong đường dẫn: `/public/shares/<token>`, `/s/<token>` → `.../***`."""
    return _TOKEN_PATH.sub(lambda m: m.group(1) + "***", path)


def clean_url(url: str) -> str:
    """Bỏ query và hash, che token trong đường dẫn. URL tương đối (chỉ có đường dẫn) cũng xử lý được."""
    try:
        parts = urlsplit(url)
    except ValueError:
        return FILTERED
    return urlunsplit((parts.scheme, parts.netloc, redact_path(parts.path), "", ""))


def _clean_http_description(description: str) -> str:
    # Mô tả span/breadcrumb HTTP có dạng "GET https://host/path?query".
    method, _, url = description.partition(" ")
    return f"{method} {clean_url(url)}" if url else clean_url(method)


def _clean_request(request: Mapping[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    if isinstance(request.get("method"), str):
        out["method"] = request["method"]
    if isinstance(request.get("url"), str):
        out["url"] = clean_url(request["url"])
    headers = request.get("headers")
    if isinstance(headers, Mapping):
        out["headers"] = {k: v for k, v in headers.items() if str(k).lower() in _SAFE_HEADERS}
    return out


def _clean_frames(container: Mapping[str, Any] | None) -> None:
    stacktrace = (container or {}).get("stacktrace")
    if isinstance(stacktrace, dict):
        for frame in stacktrace.get("frames") or []:
            if isinstance(frame, dict):
                frame.pop("vars", None)


def _clean_exception(value: Mapping[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in value.items() if k in _SAFE_EXCEPTION_KEYS}
    _clean_frames(out)
    mechanism = out.get("mechanism")
    if isinstance(mechanism, dict):
        mechanism.pop("data", None)
        mechanism.pop("meta", None)
    return out


def _clean_logentry(logentry: Mapping[str, Any]) -> dict[str, Any]:
    template = logentry.get("message")
    if isinstance(template, str) and logentry.get("params"):
        return {"message": template}
    return {"message": FILTERED}


def scrub_breadcrumb(crumb: dict[str, Any], hint: Any = None) -> dict[str, Any] | None:
    """before_breadcrumb: chỉ giữ khung của breadcrumb, không giữ thông điệp hay dữ liệu đi kèm."""
    out = {k: v for k, v in crumb.items() if k in _SAFE_BREADCRUMB_KEYS}
    data = crumb.get("data")
    if crumb.get("type") == "http" and isinstance(data, Mapping):
        kept = {k: data[k] for k in ("method", "status_code") if k in data}
        if kept:
            out["data"] = kept
    return out


def _clean_breadcrumbs(breadcrumbs: Any) -> Any:
    values = breadcrumbs.get("values") if isinstance(breadcrumbs, Mapping) else breadcrumbs
    if not isinstance(values, list):
        return {"values": []}
    cleaned = [c for c in (scrub_breadcrumb(b) for b in values if isinstance(b, dict)) if c]
    return {"values": cleaned}


def _clean_span(span: Mapping[str, Any]) -> dict[str, Any]:
    out = {k: v for k, v in span.items() if k in _SAFE_SPAN_KEYS}
    data = span.get("data")
    safe_data = {k: v for k, v in data.items() if k in _SAFE_SPAN_DATA} if isinstance(data, Mapping) else {}
    if safe_data:
        out["data"] = safe_data
    tags = span.get("tags")
    if isinstance(tags, Mapping):
        safe_tags = {k: v for k, v in tags.items() if k in _SAFE_SPAN_DATA}
        if safe_tags:
            out["tags"] = safe_tags
    op = str(span.get("op") or "")
    description = span.get("description")
    if op.startswith("db"):
        # Câu lệnh MongoDB (bộ lọc, giá trị cập nhật) không gửi đi; chỉ còn tên lệnh và collection.
        summary = " ".join(
            str(safe_data.get(k, "")) for k in ("db.operation", "db.mongodb.collection")
        ).strip()
        out["description"] = summary or op
    elif isinstance(description, str):
        if op.startswith("http"):
            out["description"] = _clean_http_description(description)
        else:
            out["description"] = clean_url(description) if "/" in description else description
    return out


def _clean_contexts(contexts: Mapping[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for name, value in contexts.items():
        if not isinstance(value, Mapping):
            continue
        if name == "trace":
            trace = {k: v for k, v in value.items() if k in _SAFE_TRACE_KEYS}
            data = value.get("data")
            if isinstance(data, Mapping):
                trace["data"] = {k: v for k, v in data.items() if k in _SAFE_SPAN_DATA}
            out[name] = trace
        elif name in _SAFE_CONTEXTS:
            out[name] = dict(value)
        elif name == "response" and "status_code" in value:
            out[name] = {"status_code": value["status_code"]}
    return out


def scrub_event(event: dict[str, Any], hint: Any = None) -> dict[str, Any] | None:
    """before_send / before_send_transaction: bỏ mọi thứ có thể chứa nội dung nhật ký hay dữ liệu cá nhân."""
    if isinstance(event.get("request"), Mapping):
        event["request"] = _clean_request(event["request"])

    if isinstance(event.get("transaction"), str):
        event["transaction"] = clean_url(event["transaction"])

    exception = event.get("exception")
    if isinstance(exception, Mapping):
        values = exception.get("values") or []
        event["exception"] = {"values": [_clean_exception(v) for v in values if isinstance(v, Mapping)]}

    threads = event.get("threads")
    if isinstance(threads, Mapping):
        for thread in threads.get("values") or []:
            if isinstance(thread, dict):
                _clean_frames(thread)

    if isinstance(event.get("logentry"), Mapping):
        event["logentry"] = _clean_logentry(event["logentry"])
    if "message" in event:
        event["message"] = FILTERED

    if "breadcrumbs" in event:
        event["breadcrumbs"] = _clean_breadcrumbs(event["breadcrumbs"])

    user = event.get("user")
    user_id = user.get("id") if isinstance(user, Mapping) else None
    if user_id:
        event["user"] = {"id": str(user_id)}
    else:
        event.pop("user", None)

    event.pop("extra", None)
    if isinstance(event.get("contexts"), Mapping):
        event["contexts"] = _clean_contexts(event["contexts"])

    if isinstance(event.get("spans"), list):
        event["spans"] = [_clean_span(s) for s in event["spans"] if isinstance(s, Mapping)]
    return event


def _attach_user(event: dict[str, Any], hint: Any, asgi_scope: Scope) -> dict[str, Any]:
    # get_current_user gán request.state.user_id (ghi vào scope["state"]); đọc lúc tạo sự kiện nên thứ tự
    # middleware không quan trọng. Chưa đăng nhập thì không có user.
    user_id = (asgi_scope.get("state") or {}).get("user_id")
    if user_id:
        event["user"] = {"id": str(user_id)}
    return event


class SentryRequestMiddleware:
    """Gắn mã người dùng vào sự kiện của request và báo lỗi chưa xử lý cho Sentry.

    Phải nằm TRONG RequestLogMiddleware (thêm trước nó): RequestLogMiddleware bắt mọi exception để trả 500
    đúng định dạng, nên lớp Sentry bọc ngoài app không còn thấy lỗi.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        sentry_sdk.get_isolation_scope().add_event_processor(partial(_attach_user, asgi_scope=scope))
        try:
            await self.app(scope, receive, send)
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            raise


def sentry_options(dsn: str) -> dict[str, Any]:
    return {
        "dsn": dsn,
        "environment": settings.env,
        "send_default_pii": False,
        # Biến cục bộ trong stack có thể là tiêu đề, nội dung, từ khóa đang xử lý.
        "include_local_variables": False,
        "max_request_body_size": "never",
        "traces_sample_rate": settings.sentry_traces_sample_rate,
        "before_send": scrub_event,
        "before_send_transaction": scrub_event,
        "before_breadcrumb": scrub_breadcrumb,
        "integrations": [
            StarletteIntegration(transaction_style="url"),
            FastApiIntegration(transaction_style="url"),
        ],
    }


def init_sentry(app: FastAPI, *, transport: Any = None) -> bool:
    """Bật Sentry nếu có SENTRY_DSN. Gọi ngay sau khi tạo FastAPI(), trước các middleware khác.

    `transport` chỉ dùng trong test (ghi lại sự kiện thay vì gửi đi).
    """
    if not settings.sentry_dsn:
        return False
    options = sentry_options(settings.sentry_dsn)
    if transport is not None:
        options["transport"] = transport
    sentry_sdk.init(**options)
    # Log của RequestLogMiddleware không thành sự kiện: lỗi đã được SentryRequestMiddleware báo (tránh trùng).
    ignore_logger("dailydiary.request")
    app.add_middleware(SentryRequestMiddleware)
    return True
