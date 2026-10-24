import unicodedata
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from pymongo.errors import WriteError

from app.core.config import settings
from app.db import collections as c
from app.routers import me as me_router
from app.services import account as account_service
from app.services import users as user_service
from tests.api.test_photos import _key, _upload
from tests.fakes import WEBP

pytestmark = pytest.mark.anyio

DAYS = ["2026-10-01", "2026-10-02", "2026-10-03"]
SHARE = {
    "show_name": False,
    "show_score": True,
    "show_sub_icon": False,
    "show_flag": False,
    "show_title": False,
    "show_content": False,
    "show_keywords": False,
    "photo_ids": [],
}


async def _fill(client, db, s3) -> dict:
    """Một người dùng có đủ thứ: 3 trang (1 trang trong thùng rác), ảnh, link chia sẻ, ảnh đại diện, góp ý."""
    for day in DAYS:
        assert (await client.put(f"/entries/{day}", json={"score": 4})).status_code == 200
    photo, _ = await _upload(client, s3, day=DAYS[0])
    assert (await client.put(f"/entries/{DAYS[0]}/share", json=SHARE)).status_code == 200
    assert (await client.delete(f"/entries/{DAYS[2]}")).status_code == 200  # thùng rác
    r = await client.post("/me/avatar/upload-url", json={"content_type": "image/webp"})
    avatar_key = _key(r.json()["upload_url"])
    s3.put(avatar_key, WEBP)
    upload = {"upload_id": r.json()["upload_id"], "content_type": "image/webp"}
    assert (
        await client.patch("/me", json={"avatar_upload": upload, "custom_flag_colors": ["#3A7BD5"]})
    ).status_code == 200
    s3.put(f"{client.user['_id']}/2026/10/09/orphan.webp", WEBP)  # tải lên mà chưa xác nhận
    now = datetime.now(UTC)
    await db[c.FEEDBACK].insert_one(
        {"_id": uuid4(), "user_id": client.user["_id"], "message": "Góp ý A", "created_at": now}
    )
    await db[c.USER_ITEMS].insert_one(
        {
            "_id": uuid4(),
            "user_id": client.user["_id"],
            "item_id": "theme-x",
            "source": "beta",
            "acquired_at": now,
        }
    )
    return {"photo_key": _key(photo["upload_url"]), "avatar_key": avatar_key}


async def test_data_summary(alice, db, s3):
    await _fill(alice, db, s3)
    assert (await alice.get("/me/data-summary")).json() == {
        "pages": 2,
        "photos": 1,
        "share_links": 1,
        "trash": 1,
    }


async def test_wipe_keeps_account_settings_avatar_and_feedback(alice, bob, db, s3):
    keys = await _fill(alice, db, s3)
    await _fill(bob, db, s3)
    bob_objects = await s3.list_keys(f"{bob.user['_id']}/")

    r = await alice.request("DELETE", "/entries", json={"confirm": "XÓA"})
    assert r.status_code == 200 and r.json() == {"pages": 2, "photos": 1, "share_links": 1}

    uid = alice.user["_id"]
    assert await db[c.ENTRIES].count_documents({"user_id": uid}) == 0  # cả trang trong thùng rác
    assert await db[c.SHARE_LINKS].count_documents({"user_id": uid}) == 0
    assert await s3.list_keys(f"{uid}/") == [keys["avatar_key"]]  # ảnh nhật ký + ảnh mồ côi đã dọn
    me = await alice.get("/me")  # vẫn đăng nhập, cài đặt còn nguyên
    assert me.status_code == 200 and me.json()["custom_flag_colors"] == ["#3A7BD5"]
    assert me.json()["avatar_url"]
    assert await db[c.FEEDBACK].count_documents({"user_id": uid}) == 1
    assert (await alice.get(f"/entries/{DAYS[0]}")).status_code == 404
    assert (await alice.put(f"/entries/{DAYS[0]}", json={"score": 3})).status_code == 200  # viết tiếp được
    # Bob không bị đụng tới.
    assert await db[c.ENTRIES].count_documents({"user_id": bob.user["_id"]}) == 3
    assert await s3.list_keys(f"{bob.user['_id']}/") == bob_objects


@pytest.mark.parametrize("confirm", ["xóa", unicodedata.normalize("NFD", " XÓA ")])
async def test_wipe_accepts_case_and_unicode_variants(alice, confirm):
    assert (await alice.request("DELETE", "/entries", json={"confirm": confirm})).status_code == 200


@pytest.mark.parametrize(
    "body", [{"confirm": "XOA"}, {"confirm": "DELETE"}, {}, {"confirm": "XÓA", "user_id": "x"}]
)
async def test_wipe_requires_exact_confirmation(alice, db, s3, body):
    await _fill(alice, db, s3)
    assert (await alice.request("DELETE", "/entries", json=body)).status_code == 422
    assert await db[c.ENTRIES].count_documents({"user_id": alice.user["_id"]}) == 3


async def test_delete_account_removes_everything_but_anonymized_feedback(alice, bob, db, s3):
    await _fill(alice, db, s3)
    await _fill(bob, db, s3)
    uid = alice.user["_id"]
    feedback_id = (await db[c.FEEDBACK].find_one({"user_id": uid}))["_id"]

    r = await alice.request("DELETE", "/me", json={"confirm_email": " ALICE@example.com "})
    assert r.status_code == 204
    cleared = r.headers.get_list("set-cookie")
    assert any(h.startswith("dd_session=") and "Max-Age=0" in h for h in cleared)

    for name in c.ALL:  # không còn document nào mang user_id của Alice (kể cả users, phiên)
        assert await db[name].count_documents({"user_id": uid}) == 0, name
    assert await db[c.USERS].count_documents({"_id": uid}) == 0
    assert await s3.list_keys(f"{uid}/") == []  # kho không còn object nào, kể cả ảnh đại diện
    kept = await db[c.FEEDBACK].find_one({"_id": feedback_id})
    assert kept["message"] == "Góp ý A" and kept["anonymized"] is True and kept["user_id"] != uid
    assert await db[c.USERS].count_documents({"user_id": kept["user_id"]}) == 0
    assert (await alice.get("/me")).status_code == 401  # phiên cũ hết hiệu lực
    # Bob còn nguyên.
    assert await db[c.ENTRIES].count_documents({"user_id": bob.user["_id"]}) == 3
    assert (await bob.get("/me")).status_code == 200


async def test_delete_account_requires_matching_email(alice, db, s3):
    await _fill(alice, db, s3)
    r = await alice.request("DELETE", "/me", json={"confirm_email": "bob@example.com"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "CONFIRM_MISMATCH"
    assert (await alice.get("/me")).status_code == 200
    assert await db[c.ENTRIES].count_documents({"user_id": alice.user["_id"]}) == 3


async def test_pending_deletion_blocks_login_then_job_finishes_and_new_account_starts_empty(
    alice, db, s3, monkeypatch
):
    await _fill(alice, db, s3)
    uid = alice.user["_id"]

    async def storage_down(prefix, *, keep=None):
        raise ConnectionError

    monkeypatch.setattr(s3, "delete_prefix", storage_down)
    assert (
        await alice.request("DELETE", "/me", json={"confirm_email": "alice@example.com"})
    ).status_code == 204
    # Kho lỗi: tài khoản còn ở trạng thái chờ xóa, dữ liệu trong DB đã xóa, đăng nhập lại bị chặn.
    assert (await db[c.USERS].find_one({"_id": uid}))["deleted_at"] is not None
    assert await db[c.ENTRIES].count_documents({"user_id": uid}) == 0
    with pytest.raises(user_service.AccountDeleted):
        await user_service.upsert_google_user(
            db,
            google_sub=alice.user["google_sub"],
            email="alice@example.com",
            display_name="A",
            avatar_url=None,
            timezone="Asia/Ho_Chi_Minh",
        )

    monkeypatch.undo()
    assert await account_service.purge_pending(db, s3) == 1
    assert await account_service.purge_pending(db, s3) == 0  # chạy lại không còn gì
    assert await db[c.USERS].count_documents({"_id": uid}) == 0 and await s3.list_keys(f"{uid}/") == []

    fresh = await user_service.upsert_google_user(
        db,
        google_sub=alice.user["google_sub"],
        email="alice@example.com",
        display_name="A",
        avatar_url=None,
        timezone="Asia/Ho_Chi_Minh",
    )
    assert fresh.id != uid and fresh.onboarded_at is None and fresh.custom_flag_colors == ()
    assert await db[c.ENTRIES].count_documents({"user_id": fresh.id}) == 0


async def test_purge_ignores_live_accounts(alice, db, s3):
    await _fill(alice, db, s3)
    assert await account_service.purge_account(db, s3, alice.user["_id"]) is False
    assert await db[c.ENTRIES].count_documents({"user_id": alice.user["_id"]}) == 3


async def test_deletes_need_login_and_csrf(anon, alice):
    assert (await anon.request("DELETE", "/entries", json={"confirm": "XÓA"})).status_code == 401
    assert (await anon.request("DELETE", "/me", json={"confirm_email": "a@b.c"})).status_code == 401
    assert (await anon.get("/me/data-summary")).status_code == 401
    del alice.headers["X-CSRF-Token"]
    assert (await alice.request("DELETE", "/entries", json={"confirm": "XÓA"})).status_code == 403
    assert (
        await alice.request("DELETE", "/me", json={"confirm_email": "alice@example.com"})
    ).status_code == 403


async def test_dev_login_reports_pending_deletion(anon, db):
    r = await anon.post("/auth/dev-login", json={"email": "x@example.com"})
    assert r.status_code == 200
    await db[c.USERS].update_one(
        {"google_sub": "dev:x@example.com"}, {"$set": {"deleted_at": datetime.now(UTC)}}
    )
    anon.cookies.clear()  # lần đăng nhập trên đã gắn cookie phiên
    r = await anon.post("/auth/dev-login", json={"email": "x@example.com"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "ACCOUNT_DELETED"


async def test_delete_account_needs_recent_login(alice, db, s3):
    await _fill(alice, db, s3)
    old = datetime.now(UTC) - account_service.REAUTH_WINDOW - timedelta(minutes=1)
    await db[c.USER_SESSIONS].update_many({"user_id": alice.user["_id"]}, {"$set": {"created_at": old}})
    r = await alice.request("DELETE", "/me", json={"confirm_email": "alice@example.com"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "REAUTH_REQUIRED"
    assert (await alice.get("/me")).status_code == 200  # không có gì bị xóa
    assert await db[c.ENTRIES].count_documents({"user_id": alice.user["_id"]}) == 3
    # Xóa dữ liệu (giữ tài khoản) không đòi đăng nhập lại.
    assert (await alice.request("DELETE", "/entries", json={"confirm": "XÓA"})).status_code == 200


async def test_deletion_log_has_counts_but_nothing_personal(alice, bob, db, s3):
    await _fill(alice, db, s3)
    await _fill(bob, db, s3)
    await alice.request("DELETE", "/entries", json={"confirm": "XÓA"})
    await bob.request("DELETE", "/me", json={"confirm_email": "bob@example.com"})
    logs = await db[c.DELETION_LOG].find({}, {"_id": 0, "at": 0}).sort("kind", -1).to_list()
    # Xóa dữ liệu đếm cả trang trong thùng rác (3 trang); xóa tài khoản đếm cả góp ý đã ẩn danh.
    assert logs == [
        {"kind": "journal", "pages": 3, "photos": 1, "share_links": 1},
        {"kind": "account", "pages": 3, "photos": 1, "share_links": 1, "feedback_anonymized": 1},
    ]
    text = str(await db[c.DELETION_LOG].find().to_list())
    for secret in ("alice", "bob", str(alice.user["_id"]), str(bob.user["_id"])):
        assert secret not in text
    with pytest.raises(WriteError):  # validator chặn trường lạ, vd. user_id
        await db[c.DELETION_LOG].insert_one(
            {
                "_id": uuid4(),
                "kind": "account",
                "at": datetime.now(UTC),
                "pages": 0,
                "photos": 0,
                "share_links": 0,
                "user_id": uuid4(),
            }
        )


@pytest.fixture
def outbox(monkeypatch):
    sent = []

    async def fake_send(mail):
        sent.append(mail)
        return True

    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(settings, "feedback_to_email", "owner@jotly.test")
    monkeypatch.setattr(me_router, "send_mail", fake_send)
    return sent


async def test_account_deleted_email_goes_to_owner_without_journal_content(alice, db, s3, outbox):
    await _fill(alice, db, s3)
    await db[c.ENTRIES].update_many({"user_id": alice.user["_id"]}, {"$set": {"title": "Bí mật tuyệt đối"}})
    assert (
        await alice.request("DELETE", "/me", json={"confirm_email": "alice@example.com"})
    ).status_code == 204
    (mail,) = outbox
    assert mail.to == "alice@example.com"
    assert mail.subject == "Tài khoản Jotly của bạn đã được xóa"
    assert mail.reply_to == ("Jotly", "owner@jotly.test")
    assert "3 trang nhật ký" in mail.body and "7 ngày" in mail.body
    assert "Bí mật" not in mail.body


async def test_no_email_for_dev_login_accounts_or_without_smtp(make_client, db, s3, outbox, monkeypatch):
    dev = await make_client("dev-user@example.com", google_sub="dev:dev-user@example.com")
    assert (
        await dev.request("DELETE", "/me", json={"confirm_email": "dev-user@example.com"})
    ).status_code == 204
    assert outbox == []
    monkeypatch.setattr(settings, "smtp_host", None)
    real = await make_client("real@example.com")
    assert (
        await real.request("DELETE", "/me", json={"confirm_email": "real@example.com"})
    ).status_code == 204
    assert outbox == []


async def test_trash_lists_restorable_pages_newest_deleted_first(alice, bob, db):
    for day in DAYS:
        await alice.put(f"/entries/{day}", json={"score": 4, "title": f"Trang {day}"})
    await alice.delete(f"/entries/{DAYS[0]}")
    await alice.delete(f"/entries/{DAYS[1]}")
    expired = datetime.now(UTC) - timedelta(days=31)
    await db[c.ENTRIES].update_one(
        {"user_id": alice.user["_id"], "entry_date": DAYS[0]}, {"$set": {"deleted_at": expired}}
    )
    items = (await alice.get("/entries/trash")).json()
    assert [i["entry_date"] for i in items] == [DAYS[1]]  # quá 30 ngày thì không còn khôi phục được
    assert items[0]["title"] == f"Trang {DAYS[1]}" and "content" not in items[0]
    assert (await bob.get("/entries/trash")).json() == []
    assert (await alice.get("/me/data-summary")).json()["trash"] == 1

    assert (await alice.post(f"/entries/{DAYS[1]}/restore")).status_code == 200
    assert (await alice.get("/entries/trash")).json() == []


async def test_trash_needs_login(anon):
    assert (await anon.get("/entries/trash")).status_code == 401
