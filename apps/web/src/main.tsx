import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { i18nReady } from './lib/i18n'
import { prefetchMe } from './lib/profile'
import { createQueryClient } from './lib/query'
import { initTheme } from './lib/theme'
import { createRouter } from './routes/router'
import './index.css'

initTheme()

// Tạo một lần ở đây (không trong component) để /me và dữ liệu của màn bắt đầu tải trước khi React vẽ, song song với
// chunk của route (Bước 14, LCP): router chạy loader tải trước (routes/prefetch.ts) ngay khi được tạo.
const queryClient = createQueryClient()
prefetchMe(queryClient)
const router = createRouter(queryClient)

// Chờ ngôn ngữ sẵn sàng (tiếng Việt xong ngay; English phải tải bản dịch) rồi mới vẽ, để không nháy sai ngôn ngữ.
void i18nReady.then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App queryClient={queryClient} router={router} />
    </StrictMode>,
  )
})
