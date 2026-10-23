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


def _fold_char(ch: str) -> str:
    lower = ch.lower()
    if lower == "đ":
        return "d"
    base = "".join(c for c in unicodedata.normalize("NFD", lower) if unicodedata.category(c) != "Mn")
    return base if len(base) == 1 else lower


def fold(text: str) -> str:
    """Bỏ dấu + chữ thường TỪNG KÝ TỰ, giữ nguyên độ dài (khác keyword_norm: không gộp khoảng trắng).

    Vị trí khớp trên chuỗi đã fold cũng là vị trí trên chuỗi gốc (NFC) — để cắt đoạn trích quanh chỗ khớp.
    """
    return "".join(_fold_char(ch) for ch in nfc(text))


def has_diacritics(query: str) -> bool:
    """Câu tìm có dấu thì so đúng dấu; không dấu thì so không dấu (F-05)."""
    q = nfc(query).lower()
    return fold(q) != q
