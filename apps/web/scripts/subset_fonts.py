"""Tạo font tự host cho web (Bước 14, LCP; hệ thiết kế 1.1): file woff2 chỉ chứa ký tự tiếng Việt + Latin cơ bản.

Chạy từ apps/web:
    uv run --no-project --with "fonttools[woff]==4.67.0" python scripts/subset_fonts.py

- Commissioner (DESIGN.md mục 3): một file biến thiên cho cả giao diện. Giữ trục wght 400–800 và FLAR 0–100 (độ loe
  chân chữ của tiêu đề), cố định VOLM 0 và slnt 0. ASCII, chữ tiếng Việt, vài dấu câu/mũi tên giao diện dùng
  (UNICODES bên dưới); ký tự ngoài bộ này (emoji, chữ nước khác) trình duyệt tự lấy font hệ thống. Giấy phép OFL không
  khai báo Reserved Font Name nên bản cắt bớt giữ được tên.
- Young Serif: chỉ chữ trong logo ("Jotly").

Font gốc lấy từ google/fonts ở một commit cố định để chạy lại ra đúng file. Đổi UNICODES thì sửa luôn `unicode-range`
trong src/styles/fonts.css.
"""

import io
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl"
OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"

UNICODES = (
    "U+0020-007E,U+00A0,U+00A9,U+00B7,U+00C0-00C3,U+00C8-00CA,U+00CC-00CD,U+00D2-00D5,U+00D7,U+00D9-00DA,U+00DD,"
    "U+00E0-00E3,U+00E8-00EA,U+00EC-00ED,U+00F2-00F5,U+00F9-00FA,U+00FD,U+0102-0103,U+0110-0111,U+0128-0129,"
    "U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303,U+0309,U+0323,U+1EA0-1EF9,U+2013-2014,U+2018-2019,"
    "U+201C-201D,U+2022,U+2026,U+203A,U+20AB,U+2190,U+2192,U+2194"
)

# Trục biến thiên giữ lại (khoảng) hoặc cố định (một số) trước khi cắt ký tự.
COMMISSIONER_AXES = {"wght": (400, 800), "FLAR": (0, 100), "VOLM": 0, "slnt": 0}

FONTS = [
    # (file gốc trên google/fonts, file ra, chỉ giữ các ký tự này thay vì UNICODES, trục biến thiên)
    ("commissioner/Commissioner%5BFLAR%2CVOLM%2Cslnt%2Cwght%5D.ttf", "commissioner-vi.woff2", None, COMMISSIONER_AXES),
    ("youngserif/YoungSerif-Regular.ttf", "young-serif-logo.woff2", "Jotly", None),
]
LICENSES = [("commissioner/OFL.txt", "OFL-Commissioner.txt"), ("youngserif/OFL.txt", "OFL-YoungSerif.txt")]


def fetch(path: str) -> bytes:
    with urllib.request.urlopen(f"{GOOGLE_FONTS}/{path}", timeout=60) as resp:
        return resp.read()


def unicodes(spec: str) -> list[int]:
    result: list[int] = []
    for part in spec.split(","):
        lo, _, hi = part.removeprefix("U+").partition("-")
        result.extend(range(int(lo, 16), int(hi or lo, 16) + 1))
    return result


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    options = subset.Options()
    options.flavor = "woff2"
    for source, target, text, axes in FONTS:
        font = TTFont(io.BytesIO(fetch(source)))
        if axes:
            font = instancer.instantiateVariableFont(font, axes)
        subsetter = subset.Subsetter(options)
        if text:
            subsetter.populate(text=text)
        else:
            subsetter.populate(unicodes=unicodes(UNICODES))
        subsetter.subset(font)
        font.flavor = "woff2"
        font.save(OUT / target)
        print(f"{target}: {(OUT / target).stat().st_size} byte")
    for source, target in LICENSES:
        (OUT / target).write_bytes(fetch(source))


if __name__ == "__main__":
    main()
