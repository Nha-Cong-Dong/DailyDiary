"""Settings đọc biến môi trường: khoảng trắng đầu/cuối (hay dính khi dán secret) bị cắt bỏ."""

import boto3

from app.core.config import Settings


def test_env_values_are_stripped(monkeypatch):
    monkeypatch.setenv("BACKUP_S3_REGION", " ca-east-006 ")
    monkeypatch.setenv("BACKUP_S3_SECRET_KEY", "  khoa-bi-mat\n")
    monkeypatch.setenv("BACKUP_S3_BUCKET", "\tJotly-Bucket ")
    monkeypatch.setenv("FRONTEND_ORIGINS", '[" https://jotly.io.vn "]')

    s = Settings(_env_file=None)

    assert s.backup_s3_region == "ca-east-006"
    assert s.backup_s3_secret_key == "khoa-bi-mat"
    assert s.backup_s3_bucket == "Jotly-Bucket"
    assert s.frontend_origins == ["https://jotly.io.vn"]


def test_stripped_region_is_accepted_by_boto3(monkeypatch):
    """Tái hiện sự cố 11/2026: region có dấu cách làm boto3 ném InvalidRegionError ngay khi tạo client."""
    monkeypatch.setenv("BACKUP_S3_REGION", " ca-east-006")
    s = Settings(_env_file=None)
    boto3.client(
        "s3",
        region_name=s.backup_s3_region,
        endpoint_url="https://s3.ca-east-006.backblazeb2.com",
        aws_access_key_id="x",
        aws_secret_access_key="y",
    )


def test_inner_spaces_are_kept(monkeypatch):
    """Chỉ cắt hai đầu: App Password của Gmail hiển thị có dấu cách giữa các nhóm."""
    monkeypatch.setenv("SMTP_PASSWORD", " abcd efgh ijkl mnop ")
    assert Settings(_env_file=None).smtp_password == "abcd efgh ijkl mnop"
