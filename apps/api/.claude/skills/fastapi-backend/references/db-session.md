# Engine, session, model và truy vấn async

## Cài đặt

```
sqlalchemy[postgresql-asyncpg]>=2.0,<2.2   # kéo theo asyncpg + greenlet
alembic
```

Từ SQLAlchemy 2.1, `greenlet` chỉ có trong extra `asyncio`. Nếu thiếu, engine async báo lỗi ngay lần chạy đầu.

## `app/core/db.py`

```python
from collections.abc import AsyncIterator
from typing import Annotated
from uuid import uuid4

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings


def make_engine(url: str) -> AsyncEngine:
    if settings.db_behind_pgbouncer:
        # PgBouncer chế độ transaction (Supabase pooler, Neon pooled): prepared statement
        # không sống qua các transaction, nên đặt tên ngẫu nhiên và để pooler giữ kết nối.
        return create_async_engine(
            url,
            poolclass=NullPool,
            connect_args={"prepared_statement_name_func": lambda: f"__asyncpg_{uuid4()}__"},
        )
    return create_async_engine(
        url,
        pool_size=5,
        max_overflow=5,
        pool_pre_ping=True,      # bỏ kết nối chết sau khi DB/pooler restart
        pool_recycle=1800,
    )


async def get_db(request: Request) -> AsyncIterator[AsyncSession]:
    async with request.app.state.sessionmaker() as session:
        yield session


DbSession = Annotated[AsyncSession, Depends(get_db)]
```

Vì sao `get_db` không commit: lỗi khi commit (UNIQUE, serialization) cần đến client dưới dạng
409/422 theo api-conventions. Nếu commit nằm trong teardown của dependency, lỗi xảy ra muộn và
khó đổi thành response đúng. Service tự `await db.commit()`. Session đóng mà chưa commit sẽ tự rollback.

## `app/models/base.py`

```python
from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import DateTime, MetaData, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(AsyncAttrs, DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING_CONVENTION)
    type_annotation_map = {datetime: DateTime(timezone=True)}   # luôn timestamptz (UTC)


class UUIDPk:
    id: Mapped[UUID] = mapped_column(primary_key=True, default=uuid4)


class Timestamps:
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())
```

## Model có quan hệ

```python
from datetime import date

from sqlalchemy import ForeignKey, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Entry(UUIDPk, Timestamps, Base):
    __tablename__ = "entries"
    __table_args__ = (UniqueConstraint("user_id", "entry_date"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    entry_date: Mapped[date]
    title: Mapped[str | None] = mapped_column(String(100))
    score: Mapped[int] = mapped_column(SmallInteger)
    deleted_at: Mapped[datetime | None]

    photos: Mapped[list["EntryPhoto"]] = relationship(
        back_populates="entry",
        lazy="raise",                 # lazy load ngầm là lỗi trong async, nên báo lỗi ngay
        order_by="EntryPhoto.position",
        cascade="all, delete-orphan",
    )
```

`app/models/__init__.py` import đủ mọi model (`from .user import User`, `from .entry import Entry`, ...)
để Alembic autogenerate thấy toàn bộ bảng.

## Mẫu truy vấn trong service

```python
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload


async def get_entry(db: AsyncSession, user_id: UUID, day: date) -> Entry | None:
    stmt = (
        select(Entry)
        .where(Entry.user_id == user_id, Entry.entry_date == day, Entry.deleted_at.is_(None))
        .options(selectinload(Entry.photos))
    )
    return await db.scalar(stmt)


async def list_entries(db: AsyncSession, user_id: UUID, before: date | None, limit: int) -> list[Entry]:
    stmt = select(Entry).where(Entry.user_id == user_id, Entry.deleted_at.is_(None))
    if before:
        stmt = stmt.where(Entry.entry_date < before)
    stmt = stmt.order_by(Entry.entry_date.desc()).limit(limit + 1)   # +1 để biết còn trang sau
    return list((await db.scalars(stmt)).all())
```

- `db.scalar(stmt)` lấy một object hoặc `None`; `db.scalars(stmt).all()` lấy danh sách;
  `db.execute(stmt)` lấy các dòng nhiều cột.
- `await db.get(Entry, id)` lấy theo khóa chính nhưng **không** lọc `user_id`, nên ít dùng.
- Nếu đã lỡ có object mà cần quan hệ chưa nạp: `await entry.awaitable_attrs.photos` (nhờ `AsyncAttrs`).
  Nhưng nạp sẵn bằng `selectinload` vẫn tốt hơn.

## UPDATE có điều kiện (chống ghi đè khi tự động lưu)

Phát hiện xung đột ngay trong một câu lệnh, không cần SELECT trước rồi so sánh (cách đó có race):

```python
async def update_entry(db: AsyncSession, user_id: UUID, day: date, known_updated_at: datetime, data: dict) -> Entry | None:
    stmt = (
        update(Entry)
        .where(
            Entry.user_id == user_id,
            Entry.entry_date == day,
            Entry.updated_at == known_updated_at,
        )
        .values(**data, updated_at=func.now())
        .returning(Entry)
        .execution_options(synchronize_session=False)
    )
    entry = await db.scalar(stmt)
    if entry is None:
        await db.rollback()
        return None            # router đổi thành 409 hoặc 404 theo api-conventions
    await db.commit()
    return entry
```

**Độ chính xác của `updated_at`:** PostgreSQL lưu tới micro giây, còn `Date` của JS chỉ giữ mili giây.
Nếu frontend parse `updated_at` thành `Date` rồi gửi lại, điều kiện `==` không bao giờ đúng và autosave
luôn nhận 409. Chọn một trong các cách:
- frontend giữ nguyên **chuỗi** `updated_at` nhận từ API và gửi lại đúng chuỗi đó;
- hoặc làm tròn ngay khi ghi: `func.date_trunc("milliseconds", func.now())` cho cả `server_default` lẫn giá trị update;
- hoặc dùng cột `version: int` tăng dần thay cho so sánh thời gian.

Upsert ("tạo hoặc cập nhật") dùng `sqlalchemy.dialects.postgresql.insert(...).on_conflict_do_update(...)`.
Xem ví dụ upsert user trong `auth-google-cookie.md`.

## Những điều không làm

- Không `asyncio.gather` nhiều truy vấn trên **cùng** một `AsyncSession`, vì session không an toàn
  khi dùng đồng thời. Cần song song thì mỗi task mở session riêng từ `request.app.state.sessionmaker`.
- Không dùng chung session giữa request và background task. Background task tự mở session mới.
- Không trả object ORM ra ngoài sau khi session đóng rồi mới truy cập quan hệ chưa nạp.
- Không gọi hàm sync chặn (boto3, đọc file lớn, Pillow) trực tiếp trong endpoint `async def`;
  bọc bằng `anyio.to_thread.run_sync`.
