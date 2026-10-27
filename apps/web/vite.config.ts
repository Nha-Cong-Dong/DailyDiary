/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const src = fileURLToPath(new URL('./src', import.meta.url))
const shared = fileURLToPath(new URL('../../shared', import.meta.url))

// Font dùng ngay ở màn đầu (chữ thường, tiêu đề h1 = Lora 700): tải cùng lúc với JS thay vì chờ trang vẽ xong mới
// phát hiện (LCP). Chỉ vài file: preload nhiều quá thì tranh băng thông với JS.
const PRELOAD_FONTS = [/be-vietnam-pro-400-/, /lora-latin-700-normal-/, /lora-vietnamese-700-normal-/]

function preloadFonts(): Plugin {
  return {
    name: 'jotly-preload-fonts',
    apply: 'build',
    transformIndexHtml(_html, ctx) {
      const files = Object.keys(ctx.bundle ?? {}).filter((f) => f.endsWith('.woff2') && PRELOAD_FONTS.some((re) => re.test(f)))
      return files.map((f) => ({
        tag: 'link',
        attrs: { rel: 'preload', href: `/${f}`, as: 'font', type: 'font/woff2', crossorigin: '' },
        injectTo: 'head' as const,
      }))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts()],
  resolve: {
    alias: {
      '@': src,
      // Giới hạn và danh mục dùng chung với backend (limits.json, icons.json, flag_colors.json)
      '@shared': shared,
    },
  },
  build: {
    // Font nhỏ (logo, ~3 KB) không nhúng vào CSS: CSS chặn vẽ trang, còn file font tải song song và được cache riêng.
    assetsInlineLimit: (file) => (file.endsWith('.woff2') ? false : undefined),
  },
  server: {
    port: 5173,
    strictPort: true,
    // Chỉ cho dev server đọc thư mục dự án và shared/, không mở rộng ra cả repo.
    fs: { allow: ['.', shared] },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Test render cả màn (dùng userEvent) có thể quá 5 s mặc định khi cả bộ chạy song song trên máy chậm.
    testTimeout: 15_000,
  },
})
