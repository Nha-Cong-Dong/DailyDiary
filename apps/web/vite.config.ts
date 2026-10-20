/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const src = fileURLToPath(new URL('./src', import.meta.url))
const shared = fileURLToPath(new URL('../../shared', import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': src,
      // Giới hạn và danh mục dùng chung với backend (limits.json, icons.json, flag_colors.json)
      '@shared': shared,
    },
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
