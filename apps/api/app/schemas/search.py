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
    # Số trang khớp cả từ khóa lẫn bộ lọc (mọi trang kết quả, không chỉ trang này).
    total: int
    # Có thêm trang cũ hơn: gửi lại làm `cursor` để lấy trang kế tiếp (null = hết).
    next_cursor: date | None


class SubIconCount(BaseModel):
    icon: str
    count: int


class TopSubIconsOut(BaseModel):
    """GET /sub-icons/top: sub icon dùng nhiều nhất của chính người dùng, nhiều trước."""

    icons: list[SubIconCount]


class TopKeywordsOut(BaseModel):
    """GET /keywords/top: từ khóa dùng nhiều nhất của chính người dùng (gộp theo dạng không dấu)."""

    keywords: list[str]
