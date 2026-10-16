"""Đọc giới hạn từ shared/limits.json. Không viết cứng con số giới hạn ở nơi khác."""

import json
from functools import lru_cache
from pathlib import Path

from limits import parse_many
from pydantic import BaseModel, ConfigDict, field_validator

from app.core.config import settings


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class EntryLimits(_Strict):
    title_max: int
    content_max: int
    keywords_max: int
    keyword_len_min: int
    keyword_len_max: int


class PhotoLimits(_Strict):
    per_day_max: int
    source_max_bytes: int
    main_max_bytes: int
    thumb_max_bytes: int
    main_max_edge_px: int
    thumb_max_edge_px: int
    webp_quality: float
    allowed_types: tuple[str, ...]


class StorageLimits(_Strict):
    quota_bytes: int
    warn_ratio: float


class ProfileLimits(_Strict):
    display_name_max: int


class PaginationLimits(_Strict):
    entries_page_size: int
    search_page_size: int


class FeedbackLimits(_Strict):
    message_max: int


def _check_rate_strings(value: dict[str, str]) -> dict[str, str]:
    for name, rate in value.items():
        try:
            parse_many(rate)
        except ValueError as exc:
            raise ValueError(f"rate limit '{name}' không hợp lệ: {rate}") from exc
    return value


class TierLimits(_Strict):
    entry: EntryLimits
    photos: PhotoLimits
    storage: StorageLimits
    profile: ProfileLimits
    pagination: PaginationLimits
    feedback: FeedbackLimits
    rate_limits: dict[str, str]

    @field_validator("rate_limits")
    @classmethod
    def _valid_rates(cls, value: dict[str, str]) -> dict[str, str]:
        return _check_rate_strings(value)


class Limits(BaseModel):
    model_config = ConfigDict(frozen=True)

    version: int
    default_tier: str
    ip_rate_limits: dict[str, str]
    tiers: dict[str, TierLimits]

    @field_validator("ip_rate_limits")
    @classmethod
    def _valid_ip_rates(cls, value: dict[str, str]) -> dict[str, str]:
        return _check_rate_strings(value)

    def tier(self, name: str | None = None) -> TierLimits:
        return self.tiers[name or self.default_tier]


def load_limits(path: Path) -> Limits:
    limits = Limits.model_validate(json.loads(path.read_text(encoding="utf-8")))
    if limits.default_tier not in limits.tiers:
        raise ValueError(f"default_tier '{limits.default_tier}' không có trong tiers")
    keys = {name: set(t.rate_limits) for name, t in limits.tiers.items()}
    if len({frozenset(k) for k in keys.values()}) > 1:
        raise ValueError(f"các cấp tài khoản phải có cùng tên rate limit: {keys}")
    return limits


@lru_cache
def get_limits() -> Limits:
    return load_limits(settings.shared_dir / "limits.json")


def rate_limit(name: str) -> str:
    """Chuỗi rate limit (vd "10/minute;50/day") theo tên, dùng cho @limiter.limit(...).

    Tên theo người dùng (read, autosave, write, photo_upload, feedback) lấy theo cấp mặc định;
    tên theo IP (login) lấy từ ip_rate_limits. Tên sai sẽ báo lỗi ngay lúc import router.
    """
    limits = get_limits()
    if name in limits.ip_rate_limits:
        return limits.ip_rate_limits[name]
    return limits.tier().rate_limits[name]
