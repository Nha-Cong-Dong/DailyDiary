# DailyDiary

**DailyDiary** là ứng dụng nhật ký trên web giúp bạn ghi lại mỗi ngày thật nhanh: chọn một biểu tượng tâm trạng,
thêm vài dòng chữ, từ khóa hoặc ảnh nếu muốn. Sau đó bạn có thể nhìn lại hành trình của mình qua dòng thời gian,
lịch tháng và bức tranh cả năm (Year in Pixels).

> Dự án đang trong giai đoạn xây dựng MVP. Bản hiện tại mới có trang chủ kiểm tra kết nối; các tính năng nhật ký
> sẽ được bổ sung dần.

## Cài đặt để chạy thử

Hướng dẫn dành cho Windows (PowerShell).

### 1. Cài các công cụ cần thiết

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [uv](https://docs.astral.sh/uv/getting-started/installation/): mở PowerShell và chạy
  `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`
- [Node.js 24](https://nodejs.org/)
- [Git](https://git-scm.com/)

### 2. Tải mã nguồn

```powershell
git clone <url-repo> DailyDiary
cd DailyDiary
```

### 3. Bật cơ sở dữ liệu và kho ảnh

Mở Docker Desktop, chờ tới khi nó báo đang chạy, rồi:

```powershell
docker compose up -d
```

### 4. Cài và khởi động phần máy chủ (cửa sổ PowerShell thứ nhất)

```powershell
$env:PYTHONUTF8 = "1"
cd apps/api
uv python install 3.12
uv sync
Copy-Item .env.example .env
uv run python -m app.db.migrate
uv run uvicorn app.main:app --reload --port 8000
```

### 5. Cài và khởi động giao diện web (cửa sổ PowerShell thứ hai)

```powershell
cd apps/web
npm install
npm run dev
```

### 6. Mở ứng dụng

Truy cập <http://localhost:5173>. Nếu trang hiện **"API: ok"** là mọi thứ đã chạy đúng.

## Dừng ứng dụng

Nhấn `Ctrl+C` ở hai cửa sổ PowerShell, rồi chạy `docker compose stop`.
Lần sau chỉ cần `docker compose up -d` và lệnh cuối cùng của bước 4 và bước 5.
