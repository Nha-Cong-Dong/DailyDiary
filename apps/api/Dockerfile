# Image backend Jotly. Build từ GỐC repo để mang theo shared/ (limits.json, icons.json, flag_colors.json):
#   docker build -f apps/api/Dockerfile -t jotly-api .
# Chỉ chạy uvicorn. Migration KHÔNG chạy ở đây: user DB của app chỉ có readWrite (không có collMod); migration chạy
# tay bằng user riêng `jotly_migrate` trước khi deploy code cần nó (docs/Deploy.md). Cấu hình qua biến môi trường
# (apps/api/.env.example), không có file .env.

FROM python:3.12.14-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.12.5 /uv /bin/uv

ENV PYTHONUNBUFFERED=1 \
    PYTHONUTF8=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PATH="/app/apps/api/.venv/bin:$PATH"

WORKDIR /app/apps/api

# Cài thư viện trước (lớp cache riêng), code sau.
COPY apps/api/pyproject.toml apps/api/uv.lock apps/api/.python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY shared /app/shared
COPY apps/api/app ./app

RUN useradd --system --uid 10001 jotly && chown -R jotly /app
USER jotly

EXPOSE 8000
# --proxy-headers: lấy IP thật từ proxy của nền tảng (rate limit theo IP). Container chỉ nhận traffic qua proxy đó.
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
