from datetime import date

from pydantic import BaseModel


class CalendarDayOut(BaseModel):
    """Một ngày đã ghi trong lịch tháng: không có tiêu đề, nội dung hay từ khóa."""

    entry_date: date
    score: int
    sub_icon: str | None
    flag_color: str | None
    photo_count: int
    # Trang tạo sau khi ngày đó đã qua (theo múi giờ hồ sơ): vẫn tô màu nhưng không nối chuỗi (F-02).
    backfilled: bool


class CalendarStatsOut(BaseModel):
    recorded: int
    average: float | None
    # Số ngày theo điểm 1..5 (phần tử 0 là điểm 1).
    distribution: list[int]
    photos: int
    photo_days: int
    # Chuỗi ngày ghi đúng ngày dài nhất trong tháng này.
    longest_streak: int
    # Chuỗi tính tới hôm nay (hôm nay chưa ghi thì tới hôm qua), vắt qua ranh giới tháng;
    # không phụ thuộc tháng đang xem.
    current_streak: int


class CalendarOut(BaseModel):
    """GET /calendar/{year}/{month}: một request cho lịch + thống kê tháng (F-02)."""

    month: str
    days: list[CalendarDayOut]
    stats: CalendarStatsOut
