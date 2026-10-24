"""Tạo font tự host cho web (Bước 14, LCP): mỗi độ đậm một file woff2 chỉ chứa ký tự tiếng Việt + Latin cơ bản.

Chạy từ apps/web:
    uv run --no-project --with "fonttools[woff]==4.67.0" python scripts/subset_fonts.py

- Be Vietnam Pro (400/500/600/700): ASCII, chữ tiếng Việt, vài dấu câu/mũi tên giao diện dùng (UNICODES bên dưới).
  Ký tự ngoài bộ này (emoji, chữ nước khác) trình duyệt tự lấy font hệ thống. Nhỏ hơn khoảng 35% so với cặp file
  latin + vietnamese của fontsource.
- Young Serif: chỉ chữ trong logo ("Jotly").
- Lora giữ nguyên bản fontsource: giấy phép có Reserved Font Name "Lora", bản cắt bớt không được mang tên đó.

Font gốc lấy từ google/fonts ở một commit cố định để chạy lại ra đúng file. Đổi UNICODES thì sửa luôn `unicode-range`
trong src/styles/fonts.css.
"""

import io
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

GOOGLE_FONTS = "https://raw.githubusercontent.com/google/fonts/e7db6ca603fd4862010383ff17ffd6cc4ffac1c0/ofl"
OUT = Path(__file__).resolve().parent.parent / "src" / "assets" / "fonts"

UNICODES = (
    "U+0020-007E,U+00A0,U+00A9,U+00B7,U+00C0-00C3,U+00C8-00CA,U+00CC-00CD,U+00D2-00D5,U+00D7,U+00D9-00DA,U+00DD,"
    "U+00E0-00E3,U+00E8-00EA,U+00EC-00ED,U+00F2-00F5,U+00F9-00FA,U+00FD,U+0102-0103,U+0110-0111,U+0128-0129,"
    "U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303,U+0309,U+0323,U+1EA0-1EF9,U+2013-2014,U+2018-2019,"
    "U+201C-201D,U+2022,U+2026,U+203A,U+20AB,U+2190,U+2192,U+2194"
)

FONTS = [
    # (file gốc trên google/fonts, file ra, chỉ giữ các ký tự này thay vì UNICODES)
    ("bevietnampro/BeVietnamPro-Regular.ttf", "be-vietnam-pro-400.woff2", None),
    ("bevietnampro/BeVietnamPro-Medium.ttf", "be-vietnam-pro-500.woff2", None),
    ("bevietnampro/BeVietnamPro-SemiBold.ttf", "be-vietnam-pro-600.woff2", None),
    ("bevietnampro/BeVietnamPro-Bold.ttf", "be-vietnam-pro-700.woff2", None),
    ("youngserif/YoungSerif-Regular.ttf", "young-serif-logo.woff2", "Jotly"),
]
LICENSES = [("bevietnampro/OFL.txt", "OFL-BeVietnamPro.txt"), ("youngserif/OFL.txt", "OFL-YoungSerif.txt")]


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
    for source, target, text in FONTS:
        font = TTFont(io.BytesIO(fetch(source)))
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
