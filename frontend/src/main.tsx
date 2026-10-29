import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import CatalogPage from './pages/CatalogPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import './styles/tokens.css'

const queryClient = new QueryClient()

// The server falls back to index.html for any path, so unknown routes land here.
const router = createBrowserRouter([
  { path: '/', element: <CatalogPage />, errorElement: <NotFoundPage /> },
  { path: '*', element: <NotFoundPage /> },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
