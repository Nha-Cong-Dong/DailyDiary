"""Sentry backend (Bước 13): sự kiện gửi đi không còn tiêu đề, nội dung, từ khóa, email, token, cookie."""

import json
import logging
from functools import partial
from typing import ClassVar

import pytest
import sentry_sdk
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from sentry_sdk.transport import Transport

import app.main as main_module
from app.core import observability as obs
from app.core.config import settings
from app.main import create_app

TITLE = "Chuyến đi Đà Lạt bí mật"
CONTENT = "Hôm nay mình đã khóc rất nhiều vì chuyện riêng"
KEYWORD = "tukhoariengtu"
EMAIL = "ban.be@example.com"
TOKEN = "AbC_123-xyzAbC_123-xyzSECRETTOKEN"
SESSION = "phien-dang-nhap-bi-mat"
SECRETS = (TITLE, CONTENT, KEYWORD, EMAIL, TOKEN, SESSION)


def _dump(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, default=str)


def _assert_clean(text: str) -> None:
    for secret in SECRETS:
        assert secret not in text, f"lọt chuỗi nhạy cảm: {secret!r}"


def _fake_event() -> dict:
    return {
        "level": "error",
        "transaction": f"/public/shares/{TOKEN}?q={KEYWORD}",
        "message": f"Lỗi khi lưu {TITLE}",
        "logentry": {"message": f"lưu {CONTENT}", "params": [], "formatted": f"lưu {CONTENT}"},
        "request": {
            "method": "PUT",
            "url": f"https://api.jotly.vn/s/{TOKEN}?q={KEYWORD}#{EMAIL}",
            "query_string": f"q={KEYWORD}",
            "data": {"title": TITLE, "content": CONTENT, "keywords": [KEYWORD]},
            "cookies": {"dd_session": SESSION},
            "headers": {
                "User-Agent": "Mozilla/5.0",
                "Cookie": f"dd_session={SESSION}",
                "X-CSRF-Token": SESSION,
                "Referer": f"https://jotly.vn/search?q={KEYWORD}",
                "X-Forwarded-For": "203.0.113.9",
            },
            "env": {"REMOTE_ADDR": "203.0.113.9"},
        },
        "exception": {
            "values": [
                {
                    "type": "ValueError",
                    "module": "builtins",
                    "value": f"title={TITLE} content={CONTENT} email={EMAIL}",
                    "mechanism": {"type": "asgi", "handled": False, "data": {"note": CONTENT}},
                    "stacktrace": {
                        "frames": [
                            {
                                "filename": "app/services/entries.py",
                                "function": "save",
                                "lineno": 10,
                                "vars": {"body": {"title": TITLE, "content": CONTENT}},
                            }
                        ]
                    },
                }
            ]
        },
        "breadcrumbs": {
            "values": [
                {"type": "default", "category": "app", "level": "info", "message": f"đang lưu {TITLE}"},
                {
                    "type": "http",
                    "category": "httplib",
                    "data": {
                        "url": f"https://api.jotly.vn/search?q={KEYWORD}",
                        "method": "GET",
                        "status_code": 200,
                        "http.query": f"q={KEYWORD}",
                    },
                },
                {"type": "query", "category": "query", "message": f'{{"find": "entries", "q": "{KEYWORD}"}}'},
            ]
        },
        "user": {
            "id": "665f00000000000000000001",
            "email": EMAIL,
            "username": TITLE,
            "ip_address": "1.2.3.4",
        },
        "extra": {"body": CONTENT},
        "contexts": {
            "trace": {"trace_id": "a" * 32, "span_id": "b" * 16, "data": {"url": f"/search?q={KEYWORD}"}},
            "runtime": {"name": "CPython", "version": "3.12"},
            "response": {"status_code": 500, "body": CONTENT},
            "entry": {"title": TITLE},
        },
        "spans": [
            {
                "op": "db",
                "description": f'{{"find": "entries", "filter": {{"keywords": "{KEYWORD}"}}}}',
                "data": {"db.operation": "find", "db.mongodb.collection": "entries", "db.query": KEYWORD},
                "tags": {"db.operation": "find", "query": KEYWORD},
            },
            {
                "op": "http.client",
                "description": f"PUT https://s3.example.com/bucket/x?X-Amz-Signature={TOKEN}",
                "data": {"url": f"https://s3.example.com/?sig={TOKEN}", "http.method": "PUT"},
            },
        ],
    }


def test_scrub_event_removes_all_sensitive_values():
    out = obs.scrub_event(_fake_event(), {})
    assert out is not None
    _assert_clean(_dump(out))

    req = out["request"]
    assert set(req) == {"method", "url", "headers"}
    assert req["url"] == "https://api.jotly.vn/s/***"
    assert req["headers"] == {"User-Agent": "Mozilla/5.0"}
    assert out["transaction"] == "/public/shares/***"
    assert out["user"] == {"id": "665f00000000000000000001"}
    assert "extra" not in out
    assert set(out["contexts"]) == {"trace", "runtime", "response"}
    # Loại exception và vị trí trong code vẫn còn để sửa lỗi; không còn thông điệp, biến cục bộ.
    exc = out["exception"]["values"][0]
    assert exc["type"] == "ValueError"
    assert "value" not in exc
    assert exc["stacktrace"]["frames"][0]["function"] == "save"
    assert "vars" not in exc["stacktrace"]["frames"][0]
    assert out["logentry"] == {"message": obs.FILTERED}
    assert out["breadcrumbs"]["values"][1] == {
        "type": "http",
        "category": "httplib",
        "data": {"method": "GET", "status_code": 200},
    }
    assert out["spans"][0]["description"] == "find entries"
    assert out["spans"][1]["description"] == "PUT https://s3.example.com/bucket/x"


def test_logentry_keeps_template_only_when_it_has_params():
    out = obs.scrub_event(
        {"logentry": {"message": "unhandled %s", "params": [CONTENT], "formatted": CONTENT}}
    )
    assert out == {"logentry": {"message": "unhandled %s"}}


def test_event_without_user_id_has_no_user():
    out = obs.scrub_event({"user": {"email": EMAIL, "ip_address": "1.2.3.4"}})
    assert out is not None and "user" not in out


def test_scrub_breadcrumb_drops_message_and_data():
    crumb = {
        "type": "default",
        "category": "app.services",
        "level": "info",
        "message": CONTENT,
        "data": {"t": TITLE},
    }
    assert obs.scrub_breadcrumb(crumb, {}) == {"type": "default", "category": "app.services", "level": "info"}


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        (f"/public/shares/{TOKEN}", "/public/shares/***"),
        (f"/public/shares/{TOKEN}/photos", "/public/shares/***/photos"),
        (f"/s/{TOKEN}", "/s/***"),
        ("/entries/2026-10-18/share", "/entries/2026-10-18/share"),
        ("/shares", "/shares"),
    ],
)
def test_redact_path(path, expected):
    assert obs.redact_path(path) == expected


def test_no_dsn_no_init(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", None)
    called = []
    monkeypatch.setattr(obs.sentry_sdk, "init", lambda **kw: called.append(kw))
    app = create_app()
    assert called == []
    assert all(m.cls is not obs.SentryRequestMiddleware for m in app.user_middleware)


def test_options_never_send_pii(monkeypatch):
    opts = obs.sentry_options("https://public@o0.ingest.sentry.io/0")
    assert opts["send_default_pii"] is False
    assert opts["include_local_variables"] is False
    assert opts["max_request_body_size"] == "never"
    assert opts["environment"] == settings.env
    assert opts["before_send"] is obs.scrub_event
    assert opts["before_send_transaction"] is obs.scrub_event
    assert opts["before_breadcrumb"] is obs.scrub_breadcrumb


class RecordingTransport(Transport):
    """Ghi lại envelope thay vì gửi lên Sentry."""

    envelopes: ClassVar[list] = []

    def capture_envelope(self, envelope) -> None:
        RecordingTransport.envelopes.append(envelope)


def _items(envelope) -> list[tuple[str, dict]]:
    out = []
    for item in envelope.items:
        payload = item.payload.json
        if payload is None:
            payload = json.loads(item.payload.get_bytes() or b"null")
        out.append((item.type or "", payload))
    return out


@pytest.fixture
def sentry_app(monkeypatch):
    monkeypatch.setattr(settings, "sentry_dsn", "https://public@o0.ingest.sentry.io/0")
    monkeypatch.setattr(settings, "sentry_traces_sample_rate", 1.0)
    RecordingTransport.envelopes = []
    monkeypatch.setattr(main_module, "init_sentry", partial(obs.init_sentry, transport=RecordingTransport))
    app = create_app()

    async def boom(token: str, request: Request):
        body = await request.json()  # biến cục bộ chứa nội dung nhật ký
        request.state.user_id = "665f00000000000000000001"
        logging.getLogger("app.services.entries").info("đang lưu %s", body["title"])
        logging.getLogger("app.services.entries").error(f"không lưu được {body['content']}")
        raise ValueError(f"title={body['title']} email={EMAIL} token={token}")

    app.add_api_route("/public/shares/{token}/boom", boom, methods=["POST"])
    yield app
    sentry_sdk.flush()
    sentry_sdk.get_client().close()
    sentry_sdk.get_global_scope().set_client(None)


@pytest.mark.anyio
async def test_real_error_sends_only_clean_events(sentry_app):
    async with AsyncClient(transport=ASGITransport(app=sentry_app), base_url="http://testserver") as client:
        response = await client.post(
            f"/public/shares/{TOKEN}/boom",
            params={"q": KEYWORD},
            json={"title": TITLE, "content": CONTENT, "keywords": [KEYWORD]},
            headers={"X-Note": EMAIL, "Referer": f"http://testserver/search?q={KEYWORD}"},
            cookies={"theme": SESSION},
        )
    assert response.status_code == 500
    sentry_sdk.flush()

    items = [it for env in RecordingTransport.envelopes for it in _items(env)]
    events = [p for t, p in items if t == "event"]
    transactions = [p for t, p in items if t == "transaction"]
    assert events, "lỗi thật phải tạo sự kiện Sentry"
    assert transactions, "traces_sample_rate=1 phải gửi transaction"
    _assert_clean(_dump([p for _, p in items]))

    errors = [e for e in events if e.get("exception")]
    assert errors, "phải có sự kiện mang exception (SentryRequestMiddleware)"
    err = errors[0]
    assert err["exception"]["values"][-1]["type"] == "ValueError"
    assert err["user"] == {"id": "665f00000000000000000001"}
    assert err["request"]["url"] == "http://testserver/public/shares/***/boom"
    assert "data" not in err["request"] and "cookies" not in err["request"]
