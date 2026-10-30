import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { createQueryClient } from './api/index.ts'
import AppShell from './components/AppShell.tsx'
import { markNavigated } from './lib/page.ts'
import { applyTheme, readTheme } from './lib/theme.ts'
import CatalogPage from './pages/CatalogPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import './styles/tokens.css'
import './styles/base.css'

// Before React mounts, so the first paint is already in the chosen theme.
applyTheme(readTheme())

const queryClient = createQueryClient()

// The server falls back to index.html for any path, so unknown routes land here.
const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: (
      <AppShell>
        <NotFoundPage />
      </AppShell>
    ),
    children: [
      { path: '/', element: <CatalogPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
// Once the location changes (link, Back, Forward), every later page's h1 takes focus.
const initialLocation = router.state.location
const unsubscribe = router.subscribe((state) => {
  if (state.location !== initialLocation) {
    markNavigated()
    unsubscribe()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
