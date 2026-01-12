import { useState, useEffect } from 'react'
import {
    Search,
    Filter,
    Download,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Eye,
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    Plus,
} from 'lucide-react'

// Mock data - in production this would come from localStorage or API
const mockHistory = [
    {
        id: 1,
        url: 'http://suspicious-login-update-account-v...',
        ip: '192.168.1.45',
        verdict: 'PHISHING',
        riskScore: 95,
        riskLevel: 'Critical',
        timestamp: '2023-10-24T10:42:00Z',
    },
    {
        id: 2,
        url: 'https://google.com',
        ip: '142.250.190.46',
        verdict: 'SAFE',
        riskScore: 5,
        riskLevel: 'Low',
        timestamp: '2023-10-24T10:30:00Z',
    },
    {
        id: 3,
        url: 'http://verify-bank-account.net',
        ip: '45.33.22.11',
        verdict: 'SUSPICIOUS',
        riskScore: 65,
        riskLevel: 'Medium',
        timestamp: '2023-10-23T04:15:00Z',
    },
    {
        id: 4,
        url: 'https://github.com',
        ip: '140.82.112.4',
        verdict: 'SAFE',
        riskScore: 0,
        riskLevel: 'None',
        timestamp: '2023-10-23T02:00:00Z',
    },
    {
        id: 5,
        url: 'http://free-gift-cards-claim-now.xy',
        ip: '103.14.25.1',
        verdict: 'PHISHING',
        riskScore: 88,
        riskLevel: 'High',
        timestamp: '2023-10-22T09:20:00Z',
    },
]

function ScanHistory() {
    const [history, setHistory] = useState([])
    const [filter, setFilter] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    useEffect(() => {
        // Load from localStorage or use mock data
        const stored = localStorage.getItem('phishguard_history')
        if (stored) {
            setHistory(JSON.parse(stored))
        } else {
            setHistory(mockHistory)
        }
    }, [])

    const filteredHistory = history.filter((item) => {
        const matchesFilter = filter === 'all' || item.verdict.toLowerCase() === filter
        const matchesSearch = item.url.toLowerCase().includes(searchQuery.toLowerCase())
        return matchesFilter && matchesSearch
    })

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage)
    const paginatedHistory = filteredHistory.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    const getVerdictBadge = (verdict) => {
        switch (verdict) {
            case 'PHISHING':
                return (
                    <span className="badge-malicious flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" />
                        Malicious
                    </span>
                )
            case 'SUSPICIOUS':
                return (
                    <span className="badge-suspicious flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Suspicious
                    </span>
                )
            default:
                return (
                    <span className="badge-safe flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        Safe
                    </span>
                )
        }
    }

    const getRiskColor = (score) => {
        if (score >= 75) return 'text-malicious-light'
        if (score >= 40) return 'text-suspicious-light'
        return 'text-safe-light'
    }

    const getRiskBarColor = (score) => {
        if (score >= 75) return 'bg-malicious'
        if (score >= 40) return 'bg-suspicious'
        return 'bg-safe'
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const formatTime = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Scan History</h1>
                    <p className="text-slate-400">View and manage your recent URL analysis reports.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="btn-secondary flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Last 30 Days
                    </button>
                    <button className="btn-secondary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                    {['all', 'phishing', 'suspicious', 'safe'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f
                                    ? 'bg-accent-indigo text-white'
                                    : 'bg-cyber-card border border-cyber-border text-slate-400 hover:text-white'
                                }`}
                        >
                            {f === 'all' ? 'All Statuses' : f === 'phishing' ? 'Malicious' : f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
                <button className="btn-secondary flex items-center gap-2 sm:ml-auto">
                    <Filter className="w-4 h-4" />
                    More Filters
                </button>
            </div>

            {/* Table */}
            <div className="card overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-cyber-border">
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    URL Analyzed
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Risk Score
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Scan Time
                                </th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-cyber-border">
                            {paginatedHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-cyber-surface transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${item.verdict === 'PHISHING' ? 'bg-malicious' :
                                                    item.verdict === 'SUSPICIOUS' ? 'bg-suspicious' :
                                                        'bg-safe'
                                                }`} />
                                            <div>
                                                <p className="text-sm font-medium text-slate-100 max-w-xs truncate">
                                                    {item.url}
                                                </p>
                                                <p className="text-xs text-slate-500">IP: {item.ip}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getVerdictBadge(item.verdict)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-sm font-medium ${getRiskColor(item.riskScore)}`}>
                                                {item.riskScore}/100
                                            </span>
                                            <span className={`text-xs ${getRiskColor(item.riskScore)}`}>
                                                {item.riskLevel}
                                            </span>
                                        </div>
                                        <div className="mt-1 w-24 h-1.5 bg-cyber-surface rounded-full overflow-hidden">
                                            <div
                                                className={`h-full ${getRiskBarColor(item.riskScore)}`}
                                                style={{ width: `${item.riskScore}%` }}
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-100">{formatDate(item.timestamp)}</p>
                                        <p className="text-xs text-slate-500">{formatTime(item.timestamp)}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 text-slate-400 hover:text-accent-cyan hover:bg-cyber-surface rounded-lg transition-colors">
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-cyber-border">
                    <p className="text-sm text-slate-400">
                        Showing <span className="font-medium text-slate-200">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium text-slate-200">
                            {Math.min(currentPage * itemsPerPage, filteredHistory.length)}
                        </span>{' '}
                        of <span className="font-medium text-slate-200">{filteredHistory.length}</span> results
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                        ? 'bg-accent-indigo text-white'
                                        : 'text-slate-400 hover:bg-cyber-surface'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                        {totalPages > 5 && <span className="text-slate-500">...</span>}
                        {totalPages > 5 && (
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${currentPage === totalPages
                                        ? 'bg-accent-indigo text-white'
                                        : 'text-slate-400 hover:bg-cyber-surface'
                                    }`}
                            >
                                {totalPages}
                            </button>
                        )}
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ScanHistory
