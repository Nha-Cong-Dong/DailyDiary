import unicodedata

from app.core.text import clean_text, keyword_norm


def test_keyword_norm_strips_vietnamese_diacritics():
    assert keyword_norm("Đà Lạt") == "da lat"
    assert keyword_norm("  Trà   GỪNG ") == "tra gung"
    assert keyword_norm("mưa") == keyword_norm("mua")


def test_keyword_norm_same_for_nfc_and_nfd_input():
    nfd = unicodedata.normalize("NFD", "Hé nở")
    assert keyword_norm(nfd) == keyword_norm("Hé nở") == "he no"


def test_clean_text_normalizes_and_drops_empty():
    nfd = unicodedata.normalize("NFD", " Chiều mưa ")
    assert clean_text(nfd) == unicodedata.normalize("NFC", "Chiều mưa")
    assert clean_text("   ") is None
    assert clean_text(None) is None
