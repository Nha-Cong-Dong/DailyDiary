from app.core.logging import redact_path


def test_redact_path_hides_share_token():
    assert redact_path("/public/shares/AbC_123-xyzAbC_123-xyz") == "/public/shares/***"


def test_redact_path_keeps_other_paths():
    assert redact_path("/entries/2026-10-18/share") == "/entries/2026-10-18/share"
    assert redact_path("/shares") == "/shares"
