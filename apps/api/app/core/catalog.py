"""Danh mục dùng chung với frontend: shared/icons.json (bộ main icon, sub icon), shared/flag_colors.json."""

import json
import re
from functools import lru_cache

from pydantic import BaseModel, ConfigDict

from app.core.config import settings


class IconSet(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    id: str
    name: str


class Icons(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    default_icon_set: str
    icon_sets: tuple[IconSet, ...]
    sub_icons: tuple[str, ...]

    @property
    def icon_set_ids(self) -> frozenset[str]:
        return frozenset(s.id for s in self.icon_sets)


@lru_cache
def get_icons() -> Icons:
    icons = Icons.model_validate(json.loads((settings.shared_dir / "icons.json").read_text(encoding="utf-8")))
    if icons.default_icon_set not in icons.icon_set_ids:
        raise ValueError(f"default_icon_set '{icons.default_icon_set}' không có trong icon_sets")
    return icons


class FlagColor(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    id: str
    hex: str


class FlagColors(BaseModel):
    model_config = ConfigDict(extra="ignore", frozen=True)

    colors: tuple[FlagColor, ...]

    @property
    def hexes(self) -> frozenset[str]:
        """Nhật ký lưu `hex` bản nền sáng (chữ hoa), giao diện tối tự đổi sang `hex_dark`."""
        return frozenset(color.hex.upper() for color in self.colors)


_HEX = re.compile(r"#[0-9A-F]{6}")


def normalize_hex(value: str) -> str:
    """Mã màu cờ "#RRGGBB" (chữ hoa). Cờ nhận màu trong bảng hoặc màu tùy chỉnh từ bảng pha màu."""
    value = value.strip().upper()
    if not _HEX.fullmatch(value):
        raise ValueError("màu cờ phải có dạng #RRGGBB")
    return value


@lru_cache
def get_flag_colors() -> FlagColors:
    path = settings.shared_dir / "flag_colors.json"
    return FlagColors.model_validate(json.loads(path.read_text(encoding="utf-8")))
