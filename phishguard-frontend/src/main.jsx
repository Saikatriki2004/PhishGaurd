import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// CRITICAL: Import Leaflet CSS BEFORE App to prevent broken tiles
import 'leaflet/dist/leaflet.css'

// Global styles
import './index.css'

// App component
import App from './App.jsx'

// Toast provider for global notifications
import { ToastProvider } from './context/ToastContext.jsx'

// Configure React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30 * 1000, // 30 seconds
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <ToastProvider>
                    <App />
                </ToastProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>,
)
