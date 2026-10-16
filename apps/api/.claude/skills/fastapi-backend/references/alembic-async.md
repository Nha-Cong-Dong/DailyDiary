# Alembic với async engine

## Khởi tạo

```bash
cd apps/api
alembic init -t async alembic
```

Template `async` sinh sẵn `env.py` dùng `async_engine_from_config`. Bản dưới đây sửa lại để đọc URL
từ `Settings`, không ghi URL trong `alembic.ini`.

`alembic.ini`: giữ `script_location = alembic`; **xóa** dòng `sqlalchemy.url`. Có thể bật
`file_template = %%(year)d%%(month).2d%%(day).2d_%%(rev)s_%%(slug)s` để file sắp xếp theo ngày.

## `alembic/env.py`

```python
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import settings
from app.models import Base   # app/models/__init__.py import đủ mọi model

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    # Cho phép `alembic -x db_url=...` (ví dụ chạy trên DB test)
    return context.get_x_argument(as_dictionary=True).get("db_url") or settings.database_url


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    # Tạo engine trực tiếp thay vì async_engine_from_config: tránh configparser hiểu nhầm
    # ký tự '%' trong mật khẩu, và không để URL chứa bí mật trong alembic.ini.
    connectable = create_async_engine(get_url(), poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    connection = config.attributes.get("connection")
    if connection is not None:
        # Đã có connection sync truyền vào (vd. từ test qua conn.run_sync)
        do_run_migrations(connection)
    else:
        asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

Nếu đi qua PgBouncer, migration nên dùng **kết nối trực tiếp** (cổng 5432 của Supabase/Neon,
không qua pooler), vì DDL và prepared statement dễ lỗi khi đi qua transaction pooler.

## Quy trình

```bash
alembic revision --autogenerate -m "create entries"
# đọc kỹ file mới trong alembic/versions/ rồi mới chạy
alembic upgrade head
alembic downgrade -1      # thử downgrade trên local trước khi merge
alembic check             # CI: báo lỗi nếu model và migration lệch nhau
```

Autogenerate **không** tự xử lý đúng:
- Đổi tên bảng/cột: nó sinh drop + add, gây mất dữ liệu. Sửa tay thành `op.alter_column(..., new_column_name=...)`.
- Extension, function, trigger, index biểu thức (`unaccent(lower(...))`): viết tay bằng `op.execute`.
- Thay đổi `server_default` phức tạp, ENUM của PostgreSQL: kiểm tra lại.

## Migration viết tay: extension và index tìm kiếm

```python
def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
    op.create_index("ix_entry_keywords_keyword_norm", "entry_keywords", ["keyword_norm"])


def downgrade() -> None:
    op.drop_index("ix_entry_keywords_keyword_norm", table_name="entry_keywords")
    # Không DROP EXTENSION: có thể đối tượng khác đang dùng.
```

## Thêm cột NOT NULL vào bảng đã có dữ liệu

Làm ba bước để không khóa bảng lâu và không lỗi với dòng cũ:

```python
op.add_column("users", sa.Column("account_tier", sa.Text(), nullable=True))
op.execute("UPDATE users SET account_tier = 'beta' WHERE account_tier IS NULL")
op.alter_column("users", "account_tier", nullable=False, server_default="free")
```

## Khi nào chạy

- Trong pipeline triển khai, một lần, trước khi khởi động phiên bản mới: `alembic upgrade head`.
- Không gọi trong `lifespan` của app: nhiều worker cùng chạy migration sẽ tranh khóa.
- Migration nên tương thích ngược với code cũ (thêm cột trước, xóa cột ở lần deploy sau).
