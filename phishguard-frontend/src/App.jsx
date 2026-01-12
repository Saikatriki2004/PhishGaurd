import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { onApiError } from './api/client'
import { useToast } from './context/ToastContext'
import MainLayout from './layouts/MainLayout'
import Scanner from './pages/Scanner'
import ScanHistory from './pages/ScanHistory'
import ThreatMap from './pages/ThreatMap'
import Dashboard from './pages/Dashboard'
import Settings from './pages/Settings'

function App() {
    const toast = useToast()

    // Subscribe to API errors for global toast notifications
    useEffect(() => {
        const unsubscribe = onApiError((error) => {
            if (error.type === 'network') {
                toast.error(error.message)
            } else if (error.type === 'http' && error.status >= 500) {
                toast.error(`Server Error: ${error.message}`)
            }
        })
        return unsubscribe
    }, [toast])

    return (
        <MainLayout>
            <Routes>
                <Route path="/" element={<Scanner />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/history" element={<ScanHistory />} />
                <Route path="/threat-map" element={<ThreatMap />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </MainLayout>
    )
}

export default App
