from pydantic import BaseModel


class PixelsStatsOut(BaseModel):
    # Chuỗi ngày ghi đúng ngày dài nhất trong năm (trang ghi bù không nối chuỗi, F-02).
    longest_streak: int
    # Chuỗi tính tới hôm nay, vắt qua tháng/năm (như GET /calendar).
    current_streak: int


class PixelsOut(BaseModel):
    """GET /pixels/{year}: Year in Pixels trong một request, dạng gọn để cả năm chỉ vài KB (F-03).

    Ngày thứ i của năm (0 = 1/1) ứng với ký tự `scores[i]`: "1".."5" là điểm, "0" là chưa ghi.
    """

    year: int
    # Các năm có ít nhất một trang chưa xóa, tăng dần (chọn năm chỉ trong các năm này).
    years: list[int]
    scores: str
    # Ngày có cờ hiệu: chỉ số ngày trong năm → mã "#RRGGBB".
    flags: dict[int, str]
    # Chỉ số ngày trong năm của các trang ghi bù.
    backfilled: list[int]
    stats: PixelsStatsOut
