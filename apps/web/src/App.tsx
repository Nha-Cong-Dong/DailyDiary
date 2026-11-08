import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { RouterProvider } from 'react-router'
import type { createRouter } from '@/routes/router'

export function App({ queryClient, router }: { queryClient: QueryClient; router: ReturnType<typeof createRouter> }) {
  // Đổi ngôn ngữ thì dựng lại cây giao diện, để cả chữ dịch bằng `t` ngoài component (lib/) cũng đổi theo.
  const { i18n } = useTranslation()
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider key={i18n.language} router={router} />
    </QueryClientProvider>
  )
}
