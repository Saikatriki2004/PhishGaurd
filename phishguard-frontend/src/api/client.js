import axios from 'axios'

/**
 * PhishGuard API Client
 * 
 * Uses environment variable for production, falls back to relative URL for dev
 * The Vite proxy handles /api -> localhost:5000 in development
 */

// PRODUCTION-READY: Use env var or default to relative path
const baseURL = import.meta.env.VITE_API_BASE_URL || ''

// Create axios instance
const apiClient = axios.create({
    baseURL,
    timeout: 30000, // 30 second timeout
    headers: {
        'Content-Type': 'application/json',
    },
})

// Global error event for toast notifications
const errorListeners = new Set()

export const onApiError = (callback) => {
    errorListeners.add(callback)
    return () => errorListeners.delete(callback)
}

const notifyError = (error) => {
    errorListeners.forEach((callback) => callback(error))
}

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // Add admin key if available (for governance endpoints)
        const adminKey = localStorage.getItem('phishguard_admin_key')
        if (adminKey && config.url?.includes('/api/governance')) {
            config.headers['X-Admin-Key'] = adminKey
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor for global error handling
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle network errors
        if (!error.response) {
            const networkError = {
                type: 'network',
                message: 'Unable to connect to PhishGuard backend. Is the server running?',
                details: error.message,
            }
            notifyError(networkError)
            return Promise.reject(networkError)
        }

        // Handle HTTP errors
        const httpError = {
            type: 'http',
            status: error.response.status,
            message: error.response.data?.error || `Request failed with status ${error.response.status}`,
            details: error.response.data,
        }

        // Only notify for server errors (5xx), not client errors (4xx)
        if (error.response.status >= 500) {
            notifyError(httpError)
        }

        return Promise.reject(httpError)
    }
)

// ============================================
// API Methods
// ============================================

/**
 * Scan a single URL for phishing
 */
export const scanUrl = async (url) => {
    const response = await apiClient.post('/scan', { url })
    return response.data
}

/**
 * Batch scan multiple URLs
 */
export const batchScan = async (urls) => {
    const response = await apiClient.post('/api/batch-scan', { urls })
    return response.data
}

/**
 * Get threat map data
 */
export const getThreatsMapData = async () => {
    const response = await apiClient.get('/api/threats/map-data')
    return response.data
}

/**
 * Get live threat feed
 */
export const getLiveThreats = async () => {
    const response = await apiClient.get('/api/threats/live')
    return response.data
}

/**
 * Get threat regions
 */
export const getThreatRegions = async () => {
    const response = await apiClient.get('/api/threats/regions')
    return response.data
}

/**
 * Get telemetry summary
 */
export const getTelemetrySummary = async () => {
    const response = await apiClient.get('/api/telemetry/summary')
    return response.data
}

/**
 * Get system health status
 */
export const getHealthStatus = async () => {
    const response = await apiClient.get('/health/ready')
    return response.data
}

/**
 * Get trusted domains list
 */
export const getTrustedDomains = async () => {
    const response = await apiClient.get('/api/trusted-domains')
    return response.data
}

/**
 * Get governance status
 */
export const getGovernanceStatus = async () => {
    const response = await apiClient.get('/api/governance/status')
    return response.data
}

export default apiClient
