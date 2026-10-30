import { defineConfig, devices } from '@playwright/test'

// Smoke test chạy trên app thật: API (uvicorn) + web (vite dev). Cần `docker compose up -d` trước.
// Cổng API mặc định 8000 như CI. Máy đã có dịch vụ khác ở cổng 8000 (vd. API production chạy bằng
// docker-compose.prod.yml) thì chạy với E2E_API_PORT=8001: API của e2e lên cổng đó và web trong e2e gọi đúng cổng đó.
const apiPort = process.env.E2E_API_PORT ?? '8000'
const apiUrl = `http://localhost:${apiPort}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: [
    {
      command: `uv run uvicorn app.main:app --port ${apiPort}`,
      cwd: '../api',
      url: `${apiUrl}/health`,
      reuseExistingServer: !process.env.CI,
      // Đăng nhập thử (POST /auth/dev-login) cho e2e; cookie không Secure vì chạy http://localhost.
      env: { PYTHONUTF8: '1', DEV_LOGIN: 'true', COOKIE_SECURE: 'false' },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      env: { VITE_API_URL: apiUrl },
    },
  ],
})
