import { createContext, useContext, useState, useCallback } from 'react'
import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'

const ToastContext = createContext(null)

// Toast types with their icons and colors
const TOAST_TYPES = {
    success: {
        icon: CheckCircle,
        bgClass: 'bg-safe/20 border-safe/30',
        textClass: 'text-safe-light',
    },
    error: {
        icon: AlertCircle,
        bgClass: 'bg-malicious/20 border-malicious/30',
        textClass: 'text-malicious-light',
    },
    warning: {
        icon: AlertTriangle,
        bgClass: 'bg-suspicious/20 border-suspicious/30',
        textClass: 'text-suspicious-light',
    },
    info: {
        icon: Info,
        bgClass: 'bg-accent-cyan/20 border-accent-cyan/30',
        textClass: 'text-accent-cyan',
    },
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])

    const addToast = useCallback((message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random()

        setToasts((prev) => [...prev, { id, message, type }])

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id))
            }, duration)
        }

        return id
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    const toast = {
        success: (msg, duration) => addToast(msg, 'success', duration),
        error: (msg, duration) => addToast(msg, 'error', duration),
        warning: (msg, duration) => addToast(msg, 'warning', duration),
        info: (msg, duration) => addToast(msg, 'info', duration),
    }

    return (
        <ToastContext.Provider value={toast}>
            {children}

            {/* Toast container - fixed at top right */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
                {toasts.map((t) => {
                    const config = TOAST_TYPES[t.type]
                    const Icon = config.icon

                    return (
                        <div
                            key={t.id}
                            className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm animate-fade-in ${config.bgClass}`}
                        >
                            <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.textClass}`} />
                            <p className="text-sm text-slate-200 flex-1">{t.message}</p>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}
