"""Xuất mô tả OpenAPI của API ra file JSON, không cần chạy server.

    uv run python scripts/export_openapi.py ../web/src/api/openapi.json

Dùng bởi `npm run gen:api` (apps/web) và bước CI kiểm tra kiểu dữ liệu frontend không lệch với backend.
"""

import json
import sys
from pathlib import Path

sys.path.insert(
    0, str(Path(__file__).resolve().parents[1])
)  # để import được app/ khi chạy bằng đường dẫn file

from app.main import create_app


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Cách dùng: python scripts/export_openapi.py <file-đầu-ra.json>")
    spec = create_app().openapi()
    out = Path(sys.argv[1])
    text = json.dumps(spec, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    out.write_text(text, encoding="utf-8", newline="\n")  # LF cả trên Windows, để CI so sánh được
    print(f"Đã ghi {out}")


if __name__ == "__main__":
    main()
