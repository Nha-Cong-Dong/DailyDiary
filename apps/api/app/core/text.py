"""Chuẩn hóa chữ người dùng nhập: NFC khi lưu, bản không dấu cho tìm kiếm (F-05) và chống trùng từ khóa."""

import unicodedata


def nfc(text: str) -> str:
    return unicodedata.normalize("NFC", text)


def clean_text(text: str | None) -> str | None:
    """NFC, bỏ khoảng trắng hai đầu; chuỗi rỗng → None (trường tùy chọn không lưu chuỗi rỗng)."""
    if text is None:
        return None
    text = nfc(text).strip()
    return text or None


def keyword_norm(text: str) -> str:
    """Dùng chung cho lúc ghi và lúc tìm: NFC → bỏ dấu → đ→d → chữ thường → gộp khoảng trắng."""
    text = unicodedata.normalize("NFD", nfc(text))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.replace("đ", "d").replace("Đ", "D")
    return " ".join(text.lower().split())
