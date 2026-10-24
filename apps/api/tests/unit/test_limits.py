import json

import pytest
from limits import parse_many

from app.core.config import settings
from app.core.limits import get_limits, load_limits, rate_limit

USER_RATE_NAMES = {
    "read",
    "me",
    "autosave",
    "write",
    "destructive",
    "photo_upload",
    "avatar_upload",
    "feedback",
    "search",
}
IP_RATE_NAMES = {"login", "logout", "share_view"}


def test_shared_limits_load_and_match_spec():
    limits = get_limits()
    assert set(limits.tiers) == {"beta", "free", "premium"}
    beta = limits.tier("beta")
    # Đặc tả F-01, mục 4.4, 4.5
    assert beta.entry.title_max == 100
    assert beta.entry.content_max == 20000
    assert beta.entry.keywords_max == 10
    assert beta.photos.per_day_max == 10
    assert beta.storage.quota_bytes == 500 * 1024 * 1024
    assert beta.storage.warn_ratio == 0.8
    assert rate_limit("login") == "5/minute"
    assert rate_limit("photo_upload") == "10/minute;50/day"
    assert rate_limit("share_view") == "60/minute"
    assert rate_limit("read") == "30/minute"
    assert rate_limit("me") == "120/minute"
    assert rate_limit("write") == "10/minute"
    assert int(rate_limit("autosave").split("/")[0]) in range(15, 21)


def _per_minute(rate: str) -> int:
    return next(item.amount for item in parse_many(rate) if item.GRANULARITY.name == "minute")


def test_dangerous_actions_are_stricter_than_their_base_group():
    """Thao tác không hoàn tác (xóa dữ liệu/tài khoản) chặt hơn "write"; ảnh đại diện (không tính hạn mức
    dung lượng) chặt hơn ảnh nhật ký; mọi nhóm có tác động lâu dài đều có trần theo ngày."""
    for tier in get_limits().tiers.values():
        rates = tier.rate_limits
        assert _per_minute(rates["destructive"]) < _per_minute(rates["write"])
        assert _per_minute(rates["avatar_upload"]) < _per_minute(rates["photo_upload"])
        for name in ("destructive", "photo_upload", "avatar_upload", "feedback"):
            assert any(item.GRANULARITY.name == "day" for item in parse_many(rates[name])), name


def test_ip_rate_limit_names():
    assert set(get_limits().ip_rate_limits) == IP_RATE_NAMES


def test_every_tier_defines_the_same_rate_limit_names():
    for tier in get_limits().tiers.values():
        assert set(tier.rate_limits) == USER_RATE_NAMES


def test_unknown_rate_limit_name_fails_fast():
    with pytest.raises(KeyError):
        rate_limit("khong-co")


def test_invalid_rate_string_is_rejected(tmp_path):
    data = json.loads((settings.shared_dir / "limits.json").read_text(encoding="utf-8"))
    data["tiers"]["beta"]["rate_limits"]["read"] = "ba mươi mỗi phút"
    bad = tmp_path / "limits.json"
    bad.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    with pytest.raises(ValueError):
        load_limits(bad)


def test_shared_catalogs_are_valid_utf8_json():
    icons = json.loads((settings.shared_dir / "icons.json").read_text(encoding="utf-8"))
    flags = json.loads((settings.shared_dir / "flag_colors.json").read_text(encoding="utf-8"))
    assert icons["default_icon_set"] in {s["id"] for s in icons["icon_sets"]}
    assert len({c["hex"] for c in flags["colors"]}) == len(flags["colors"])
