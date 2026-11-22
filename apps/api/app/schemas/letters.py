"""Thư gửi tương lai (GĐ2): nội dung chỉ mở ra được từ `reveal_date`, tối đa 1 thư/1 ngày ghi."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.text import clean_text


class LetterWrite(BaseModel):
    """POST /letters: viết thư, hẹn ngày mở (phải là ngày sau "hôm nay" của người dùng)."""

    model_config = ConfigDict(extra="forbid")

    content: str = Field(min_length=1)
    # Ngày mở (tương lai); `reveal_date <= hôm nay` thì 422 (không hẹn ngược).
    reveal_date: date

    @property
    def clean_content(self) -> str:
        return clean_text(self.content) or ""


class LetterOut(BaseModel):
    """Một lá thư. `content` trả None khi còn niêm phong (chưa đến `reveal_date`) — giữ bất ngờ."""

    id: UUID
    content: str | None
    reveal_date: date
    # "sealed" = chưa đến ngày mở; "open" = đã đến hạn, nội dung hiện được.
    status: str
    created_at: datetime


class LetterListOut(BaseModel):
    """GET /letters: danh sách thư, thư đến hạn trước (sắp mở) đứng trước."""

    letters: list[LetterOut]
