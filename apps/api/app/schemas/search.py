from datetime import date

from pydantic import BaseModel


class SearchHitOut(BaseModel):
    """Một trang khớp: tiêu đề, đoạn trích quanh chỗ khớp (không phải cả nội dung), từ khóa."""

    entry_date: date
    score: int
    title: str | None
    # Đoạn nội dung quanh chỗ khớp đầu tiên (tối đa EXCERPT_CHARS ký tự); null khi trang không có nội dung.
    excerpt: str | None
    keywords: list[str]
    sub_icon: str | None
    flag_color: str | None
    photo_count: int


class SearchOut(BaseModel):
    """GET /search. `matched`: số trang khớp từ khóa trước khi áp bộ lọc (để báo trang bị bộ lọc ẩn)."""

    results: list[SearchHitOut]
    matched: int
    # Có thêm trang cũ hơn: gửi lại làm `cursor` để lấy trang kế tiếp (null = hết).
    next_cursor: date | None


class TopKeywordsOut(BaseModel):
    """GET /keywords/top: từ khóa dùng nhiều nhất của chính người dùng (gộp theo dạng không dấu)."""

    keywords: list[str]
