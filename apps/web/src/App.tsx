import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import type { createRouter } from '@/routes/router'

export function App({ queryClient, router }: { queryClient: QueryClient; router: ReturnType<typeof createRouter> }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
