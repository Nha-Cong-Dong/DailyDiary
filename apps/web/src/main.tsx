import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { initAnalytics, startPageviews } from './lib/analytics'
import { initSentry, rootErrorOptions } from './lib/sentry'
import { initTheme } from './lib/theme'
import { router } from './routes/router'
import './index.css'

// Bước 13: thiếu VITE_SENTRY_DSN / VITE_UMAMI_SRC + VITE_UMAMI_WEBSITE_ID thì ba lời gọi này không làm gì.
initSentry()
initAnalytics()
startPageviews(router)
initTheme()

createRoot(document.getElementById('root')!, rootErrorOptions()).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
