"""Mốc ngày theo múi giờ hồ sơ (skill date-timezone-rules)."""

from datetime import UTC, date, datetime

import pytest

from app.services.entries import user_today

VN = "Asia/Ho_Chi_Minh"
LA = "America/Los_Angeles"


@pytest.mark.parametrize(
    ("utc", "tz", "expected"),
    [
        # 23:59 giờ Việt Nam ngày 18 = 16:59 UTC ngày 18
        (datetime(2026, 10, 18, 16, 59, tzinfo=UTC), VN, date(2026, 10, 18)),
        # 00:01 giờ Việt Nam ngày 19 = 17:01 UTC ngày 18
        (datetime(2026, 10, 18, 17, 1, tzinfo=UTC), VN, date(2026, 10, 19)),
        # 06:00 sáng Việt Nam ngày 19: theo UTC vẫn là 23:00 ngày 18
        (datetime(2026, 10, 18, 23, 0, tzinfo=UTC), VN, date(2026, 10, 19)),
        # Múi giờ âm: 05:00 UTC ngày 19 vẫn là 22:00 ngày 18 ở Los Angeles (PDT, UTC-7)
        (datetime(2026, 10, 19, 5, 0, tzinfo=UTC), LA, date(2026, 10, 18)),
    ],
)
def test_user_today_follows_profile_timezone(utc, tz, expected):
    assert user_today(tz, utc) == expected
