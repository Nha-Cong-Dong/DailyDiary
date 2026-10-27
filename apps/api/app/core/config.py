from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

API_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=API_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: str = "local"  # local | test | staging | production

    # Giá trị mặc định chỉ dùng cho Docker Compose ở máy local; môi trường thật phải đặt biến môi trường.
    mongodb_uri: str = "mongodb://dd:dd@localhost:27017/?authSource=admin"
    mongodb_db: str = "dailydiary"
    mongodb_test_db: str = "dailydiary_test"  # test XÓA SẠCH DB này; tên bắt buộc kết thúc bằng "_test"

    # Thư mục shared/ (limits.json, icons.json, flag_colors.json). Mặc định: <repo>/shared.
    # Khi triển khai, phải copy shared/ đi kèm hoặc đặt SHARED_DIR.
    shared_dir: Path = API_DIR.parents[1] / "shared"

    frontend_url: str = "http://localhost:5173"
    frontend_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    rate_limit_storage_uri: str = "memory://"

    # Dùng từ bước 3 (đăng nhập) và bước 7 (ảnh); để trống được ở bước 1.
    cookie_domain: str | None = None
    cookie_secure: bool = True
    session_secret: str | None = None
    session_ttl_days: int = 30
    # Đăng nhập thử không cần Google (POST /auth/dev-login). Chỉ có hiệu lực khi env là local/test;
    # create_app() từ chối khởi động nếu bật ở môi trường khác.
    dev_login: bool = False
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"
    s3_endpoint_url: str | None = None
    s3_public_endpoint_url: str | None = None
    s3_region: str = "us-east-1"
    s3_bucket: str = "dailydiary-photos"
    s3_access_key: str | None = None
    s3_secret_key: str | None = None

    # Bước 12 (góp ý): gửi email góp ý về hộp thư của chủ sản phẩm qua SMTP. Thiếu SMTP_HOST hoặc
    # FEEDBACK_TO_EMAIL thì chỉ lưu vào collection `feedback`, không gửi.
    # Gmail: smtp.gmail.com:587, STARTTLS, App Password.
    # Local: Mailpit trong docker-compose.yml (localhost:1025, không TLS, không đăng nhập; xem thư ở :8025).
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_starttls: bool = True
    smtp_user: str | None = None
    smtp_password: str | None = None
    mail_from: str | None = None  # để trống = SMTP_USER
    feedback_to_email: str | None = None

    # Bước 13 — sao lưu. Kho sao lưu riêng (nên khác nhà cung cấp với kho ảnh chính), chuẩn S3.
    # Để trống BACKUP_S3_BUCKET = tác vụ sao lưu báo "chưa cấu hình" và thoát, không làm gì.
    # Local: bucket phụ trên MinIO (vd. dailydiary-backups) với cùng khóa minioadmin.
    backup_s3_endpoint_url: str | None = None
    backup_s3_region: str = "us-east-1"
    backup_s3_bucket: str | None = None
    backup_s3_access_key: str | None = None
    backup_s3_secret_key: str | None = None
    backup_keep: int = 21  # bản sao lưu DB giữ lại: 3 bản/ngày × 7 ngày (đặc tả 4.2)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
