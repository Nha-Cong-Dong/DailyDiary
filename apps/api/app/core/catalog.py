"""Đọc danh mục dùng chung với frontend: shared/icons.json (bộ main icon, sub icon)."""

import json
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
