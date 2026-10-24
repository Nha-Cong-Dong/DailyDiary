from pydantic import BaseModel, ConfigDict, field_validator

from app.core.text import clean_text


class FeedbackIn(BaseModel):
    """POST /feedback. Độ dài tối đa kiểm ở service theo limits.json (feedback.message_max)."""

    model_config = ConfigDict(extra="forbid")

    message: str

    @field_validator("message")
    @classmethod
    def _message(cls, v: str) -> str:
        v = clean_text(v)
        if not v:
            raise ValueError("góp ý không được để trống")
        return v


class FeedbackOut(BaseModel):
    """Đã nhận góp ý. Email gửi trong nền, nên không báo gửi thư thành công hay chưa."""

    received: bool = True
