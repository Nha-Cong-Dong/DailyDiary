import logging
import unicodedata

import pytest
from limits import parse_many

from app.core.config import settings
from app.core.limits import get_limits, rate_limit
from app.core.rate_limit import limiter
from app.db import collections as c
from app.services import feedback as feedback_service

pytestmark = pytest.mark.anyio

MAX = get_limits().tier("beta").feedback.message_max


@pytest.fixture
def outbox(monkeypatch):
    """Bật gửi thư (như đã cấu hình SMTP) và giữ thư lại thay vì gửi thật."""
    sent = []

    async def fake_send(mail):
        sent.append(mail)
        return True

    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(settings, "feedback_to_email", "owner@jotly.test")
    monkeypatch.setattr(feedback_service, "send_mail", fake_send)
    return sent


async def test_feedback_is_stored_then_emailed_with_reply_to(alice, db, outbox):
    nfd = unicodedata.normalize("NFD", "  Nút lưu hơi khó thấy trên điện thoại.  ")
    r = await alice.post("/feedback", json={"message": nfd})
    assert r.status_code == 201 and r.json() == {"received": True}

    doc = await db[c.FEEDBACK].find_one({"user_id": alice.user["_id"]})
    assert doc["message"] == unicodedata.normalize("NFC", "Nút lưu hơi khó thấy trên điện thoại.")
    assert doc["emailed_at"] is not None

    (mail,) = outbox
    assert mail.to == "owner@jotly.test"
    assert mail.reply_to == ("alice", "alice@example.com")
    assert mail.subject == "[Jotly] Góp ý từ alice"
    assert doc["message"] in mail.body and "alice@example.com" in mail.body and str(doc["_id"]) in mail.body


async def test_without_smtp_feedback_is_only_stored(alice, db, monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", None)
    sent = []
    monkeypatch.setattr(feedback_service, "send_mail", lambda mail: sent.append(mail))
    assert (await alice.post("/feedback", json={"message": "Thêm chế độ tối đậm hơn"})).status_code == 201
    doc = await db[c.FEEDBACK].find_one({"user_id": alice.user["_id"]})
    assert doc["emailed_at"] is None and sent == []


async def test_email_failure_keeps_feedback(alice, db, outbox, monkeypatch):
    async def broken(mail):
        return False

    monkeypatch.setattr(feedback_service, "send_mail", broken)
    assert (await alice.post("/feedback", json={"message": "Ý kiến"})).status_code == 201
    doc = await db[c.FEEDBACK].find_one({"user_id": alice.user["_id"]})
    assert doc["message"] == "Ý kiến" and doc["emailed_at"] is None  # còn trong DB để gửi lại sau


@pytest.mark.parametrize(
    "body",
    [{"message": ""}, {"message": "   "}, {}, {"message": 5}, {"message": "ok", "user_id": "x"}],
)
async def test_invalid_feedback_is_rejected(alice, db, body):
    assert (await alice.post("/feedback", json=body)).status_code == 422
    assert await db[c.FEEDBACK].count_documents({}) == 0


async def test_feedback_length_comes_from_limits(alice, outbox):
    assert (await alice.post("/feedback", json={"message": "a" * MAX})).status_code == 201
    r = await alice.post("/feedback", json={"message": "a" * (MAX + 1)})
    assert r.status_code == 422 and r.json()["error"]["code"] == "FEEDBACK_TOO_LONG"


async def test_feedback_is_tied_to_session_user(alice, bob, db, outbox):
    await bob.post("/feedback", json={"message": "Của Bob"})
    doc = await db[c.FEEDBACK].find_one({})
    assert doc["user_id"] == bob.user["_id"]
    assert outbox[0].reply_to == ("bob", "bob@example.com")


async def test_feedback_needs_login_and_csrf(anon, alice):
    assert (await anon.post("/feedback", json={"message": "x"})).status_code == 401
    del alice.headers["X-CSRF-Token"]
    assert (await alice.post("/feedback", json={"message": "x"})).status_code == 403


async def test_feedback_is_rate_limited(alice, outbox):
    allowed = parse_many(rate_limit("feedback"))[0].amount
    limiter.enabled = True
    limiter.reset()
    try:
        for i in range(allowed):
            assert (await alice.post("/feedback", json={"message": f"góp ý {i}"})).status_code == 201
        assert (await alice.post("/feedback", json={"message": "thêm nữa"})).status_code == 429
    finally:
        limiter.reset()


async def test_feedback_text_is_not_logged(alice, outbox, caplog):
    caplog.set_level(logging.DEBUG)
    await alice.post("/feedback", json={"message": "bí mật quokka"})
    app_logs = "\n".join(r.getMessage() for r in caplog.records if not r.name.startswith("httpx"))
    assert "quokka" not in app_logs and "POST /feedback 201" in app_logs


def test_mail_header_cannot_be_injected():
    """Tên hiển thị đã gộp khoảng trắng khi lưu; nếu lọt ký tự xuống dòng thì EmailMessage từ chối."""
    from email.message import EmailMessage

    msg = EmailMessage()
    with pytest.raises(ValueError):
        msg["Subject"] = "[Jotly] Góp ý từ x\r\nBcc: attacker@example.com"
