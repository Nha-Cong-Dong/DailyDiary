import unicodedata

from pydantic import BaseModel, ConfigDict, field_validator


class DataSummaryOut(BaseModel):
    """GET /me/data-summary: những gì sẽ mất khi xóa (để hộp thoại báo đúng con số) và dung lượng ảnh
    đã dùng so với hạn mức (mục 4.5 của đặc tả: cảnh báo khi đạt `warn_ratio`)."""

    # Trang chưa xóa (trang trong thùng rác 30 ngày cũng bị xóa nhưng không đếm ở đây).
    pages: int
    photos: int
    share_links: int
    # Trang trong thùng rác còn khôi phục được (GET /entries/trash).
    trash: int
    # Byte ảnh nhật ký đang chiếm (ảnh chính + ảnh thu nhỏ), cùng cách tính với lúc chặn tải ảnh
    # (STORAGE_QUOTA): gồm cả trang trong thùng rác vì ảnh còn trong kho tới khi dọn. Ảnh đại diện không tính.
    used_bytes: int
    # Hạn mức và ngưỡng cảnh báo (0–1) theo cấp tài khoản, lấy từ shared/limits.json (`storage`).
    quota_bytes: int
    warn_ratio: float


class WipeIn(BaseModel):
    """DELETE /entries: phải gửi đúng chữ "XÓA" (backend kiểm tra lại, không chỉ dựa vào giao diện)."""

    model_config = ConfigDict(extra="forbid")

    confirm: str

    @field_validator("confirm")
    @classmethod
    def _confirm(cls, v: str) -> str:
        if unicodedata.normalize("NFC", v).strip().upper() != "XÓA":
            raise ValueError('gõ "XÓA" để xác nhận')
        return v


class WipeOut(BaseModel):
    """Đã xóa bao nhiêu (ảnh trong kho được dọn trong nền ngay sau đó)."""

    pages: int
    photos: int
    share_links: int


class DeleteAccountIn(BaseModel):
    """DELETE /me: phải gửi đúng email của tài khoản (so ở service, không phân biệt hoa thường)."""

    model_config = ConfigDict(extra="forbid")

    confirm_email: str
