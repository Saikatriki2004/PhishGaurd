import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { scanUrl } from '../api/client'
import { useToast } from '../context/ToastContext'
import {
    Link2,
    Search,
    Shield,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    Globe,
    Lock,
    Clock,
    ExternalLink,
    Share2,
    Ban,
    ChevronDown,
    ChevronUp,
    Loader2,
    Zap,
    Cpu,
} from 'lucide-react'

function Scanner() {
    const [url, setUrl] = useState('')
    const [expanded, setExpanded] = useState({ positive: true, risk: true, inconclusive: false })
    const toast = useToast()

    const scanMutation = useMutation({
        mutationFn: scanUrl,
        onError: (error) => {
            if (error.type !== 'network') {
                toast.error(error.message || 'Failed to scan URL')
            }
        },
    })

    const handleScan = (e) => {
        e.preventDefault()
        if (!url.trim()) {
            toast.warning('Please enter a URL to scan')
            return
        }
        scanMutation.mutate(url.trim())
    }

    const result = scanMutation.data
    const isLoading = scanMutation.isPending
    const isPhishing = result?.verdict === 'PHISHING'
    const isSuspicious = result?.verdict === 'SUSPICIOUS'
    const isSafe = result?.verdict === 'SAFE'

    const getVerdictConfig = () => {
        if (isPhishing) {
            return {
                icon: ShieldAlert,
                label: 'MALICIOUS DETECTED',
                color: 'text-malicious-light',
                bgColor: 'bg-malicious/20',
                borderColor: 'border-malicious/30',
                glowClass: 'glow-danger',
            }
        }
        if (isSuspicious) {
            return {
                icon: AlertTriangle,
                label: 'SUSPICIOUS',
                color: 'text-suspicious-light',
                bgColor: 'bg-suspicious/20',
                borderColor: 'border-suspicious/30',
                glowClass: '',
            }
        }
        return {
            icon: ShieldCheck,
            label: 'SAFE',
            color: 'text-safe-light',
            bgColor: 'bg-safe/20',
            borderColor: 'border-safe/30',
            glowClass: 'glow-safe',
        }
    }

    const verdictConfig = getVerdictConfig()
    const VerdictIcon = verdictConfig.icon

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold">
                    Scan any URL for{' '}
                    <span className="text-gradient">hidden threats</span>
                </h1>
                <p className="text-slate-400 max-w-2xl mx-auto">
                    Enter a link below to instantly analyze SSL certificates, domain age,
                    redirects, and potential phishing vectors.
                </p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleScan} className="relative max-w-3xl mx-auto">
                <div className="flex items-center bg-cyber-card border border-cyber-border rounded-xl overflow-hidden focus-within:border-accent-indigo focus-within:ring-1 focus-within:ring-accent-indigo/50 transition-all">
                    <div className="pl-5">
                        <Link2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://example.com/suspicious-page"
                        className="flex-1 px-4 py-4 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="m-2 px-6 py-3 bg-accent-indigo hover:bg-indigo-600 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Scanning...
                            </>
                        ) : (
                            <>
                                <Search className="w-5 h-5" />
                                Scan URL
                            </>
                        )}
                    </button>
                </div>

                {/* Feature badges */}
                <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-safe" />
                        Real-time Analysis
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-accent-cyan" />
                        AI-Powered Engine
                    </div>
                </div>
            </form>

            {/* Results */}
            {result && (
                <div className="space-y-6 animate-fade-in">
                    {/* Verdict Header */}
                    <div className={`card ${verdictConfig.glowClass}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="space-y-2">
                                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${verdictConfig.bgColor} ${verdictConfig.color} ${verdictConfig.borderColor} border`}>
                                    <VerdictIcon className="w-3.5 h-3.5" />
                                    {verdictConfig.label}
                                    {result.scan_id && (
                                        <span className="text-slate-400 ml-2">Scan ID: #{result.scan_id || 'N/A'}</span>
                                    )}
                                </div>
                                <h2 className="text-lg font-mono text-slate-200 break-all">{url}</h2>
                            </div>

                            <div className="flex items-center gap-2">
                                <button className="btn-secondary flex items-center gap-2">
                                    <Share2 className="w-4 h-4" />
                                    Export Report
                                </button>
                                {isPhishing && (
                                    <button className="btn-danger flex items-center gap-2">
                                        <Ban className="w-4 h-4" />
                                        Block Domain
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Risk Score */}
                        <div className="card">
                            <div className="text-sm text-slate-400 mb-2">Risk Score</div>
                            <div className="flex items-end gap-2">
                                <span className={`text-4xl font-bold ${result.risk_score >= 75 ? 'text-malicious-light' :
                                        result.risk_score >= 40 ? 'text-suspicious-light' :
                                            'text-safe-light'
                                    }`}>
                                    {Math.round(result.risk_score)}
                                </span>
                                <span className="text-slate-500 mb-1">/ 100</span>
                            </div>
                            <div className="mt-3 h-2 bg-cyber-surface rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 ${result.risk_score >= 75 ? 'bg-malicious' :
                                            result.risk_score >= 40 ? 'bg-suspicious' :
                                                'bg-safe'
                                        }`}
                                    style={{ width: `${result.risk_score}%` }}
                                />
                            </div>
                            <div className={`mt-2 text-xs font-medium ${result.risk_score >= 75 ? 'text-malicious-light' :
                                    result.risk_score >= 40 ? 'text-suspicious-light' :
                                        'text-safe-light'
                                }`}>
                                {result.risk_level || (result.risk_score >= 75 ? '⚠ Critical Threat' : result.risk_score >= 40 ? '⚠ Medium Risk' : '✓ Low Risk')}
                            </div>
                        </div>

                        {/* Primary Threat */}
                        <div className="card">
                            <div className="text-sm text-slate-400 mb-2">Primary Threat</div>
                            <div className="text-xl font-semibold text-slate-100">
                                {result.verdict === 'PHISHING' ? 'Phishing' :
                                    result.verdict === 'SUSPICIOUS' ? 'Suspicious Activity' :
                                        'None Detected'}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                {result.is_trusted_domain
                                    ? 'Verified trusted domain'
                                    : isPhishing
                                        ? 'Impersonating financial institution login page.'
                                        : 'No immediate threats identified.'}
                            </p>
                        </div>

                        {/* Trusted Domain */}
                        <div className="card">
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Globe className="w-4 h-4" />
                                Domain Trust
                            </div>
                            <div className="text-xl font-semibold text-slate-100">
                                {result.is_trusted_domain ? 'Trusted' : 'Unknown'}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                {result.is_trusted_domain
                                    ? '✓ On allowlist'
                                    : 'Not on trusted domain list'}
                            </p>
                        </div>

                        {/* ML Status */}
                        <div className="card">
                            <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                                <Cpu className="w-4 h-4" />
                                ML Analysis
                            </div>
                            <div className="text-xl font-semibold text-slate-100">
                                {result.ml_bypassed ? 'Bypassed' : 'Analyzed'}
                            </div>
                            <p className="mt-2 text-sm text-slate-500">
                                {result.ml_bypassed
                                    ? 'Trusted domain - ML skipped'
                                    : 'Full ML inference completed'}
                            </p>
                        </div>
                    </div>

                    {/* Explanation Accordion */}
                    {result.explanation && (
                        <div className="card">
                            <h3 className="text-lg font-semibold text-slate-100 mb-4">Detailed Intelligence</h3>

                            <div className="space-y-3">
                                {/* Positive Factors */}
                                {result.explanation.positive?.length > 0 && (
                                    <div className="border border-safe/20 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpanded(p => ({ ...p, positive: !p.positive }))}
                                            className="w-full flex items-center justify-between p-4 bg-safe/10 hover:bg-safe/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <ShieldCheck className="w-5 h-5 text-safe-light" />
                                                <span className="font-medium text-safe-light">
                                                    Positive Factors ({result.explanation.positive.length})
                                                </span>
                                            </div>
                                            {expanded.positive ? (
                                                <ChevronUp className="w-5 h-5 text-safe-light" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-safe-light" />
                                            )}
                                        </button>
                                        {expanded.positive && (
                                            <ul className="p-4 space-y-2 bg-cyber-surface">
                                                {result.explanation.positive.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                        <span className="text-safe mt-0.5">✓</span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Risk Factors */}
                                {result.explanation.risk?.length > 0 && (
                                    <div className="border border-malicious/20 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpanded(p => ({ ...p, risk: !p.risk }))}
                                            className="w-full flex items-center justify-between p-4 bg-malicious/10 hover:bg-malicious/20 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <ShieldAlert className="w-5 h-5 text-malicious-light" />
                                                <span className="font-medium text-malicious-light">
                                                    Risk Factors ({result.explanation.risk.length})
                                                </span>
                                            </div>
                                            {expanded.risk ? (
                                                <ChevronUp className="w-5 h-5 text-malicious-light" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-malicious-light" />
                                            )}
                                        </button>
                                        {expanded.risk && (
                                            <ul className="p-4 space-y-2 bg-cyber-surface">
                                                {result.explanation.risk.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                                        <span className="text-malicious mt-0.5">⚠</span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Inconclusive Factors */}
                                {result.explanation.inconclusive?.length > 0 && (
                                    <div className="border border-slate-700 rounded-lg overflow-hidden">
                                        <button
                                            onClick={() => setExpanded(p => ({ ...p, inconclusive: !p.inconclusive }))}
                                            className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <AlertTriangle className="w-5 h-5 text-slate-400" />
                                                <span className="font-medium text-slate-400">
                                                    Inconclusive ({result.explanation.inconclusive.length})
                                                </span>
                                            </div>
                                            {expanded.inconclusive ? (
                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </button>
                                        {expanded.inconclusive && (
                                            <ul className="p-4 space-y-2 bg-cyber-surface">
                                                {result.explanation.inconclusive.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                                        <span className="mt-0.5">•</span>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className="card bg-accent-indigo/10 border-accent-indigo/30">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-accent-indigo/20 rounded-full">
                                <Shield className="w-6 h-6 text-accent-indigo" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-semibold text-slate-100 mb-1">How to interpret these results</h4>
                                <p className="text-sm text-slate-400">
                                    A Risk Score above 75 indicates a high probability of malicious intent.
                                    Check the domain age—phishing sites are often less than 1 week old.
                                    Mismatched SSL certificates on banking domains are a primary indicator of credential harvesting.
                                </p>
                            </div>
                            <button className="btn-secondary text-sm">View Documentation</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Scanner
