import { useQuery } from '@tanstack/react-query'
import { getTelemetrySummary, getHealthStatus, getThreatRegions } from '../api/client'
import {
    Shield,
    ShieldAlert,
    ShieldCheck,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    BarChart3,
    PieChart,
    Globe,
    Zap,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell } from 'recharts'

function Dashboard() {
    const { data: telemetry } = useQuery({
        queryKey: ['telemetry'],
        queryFn: getTelemetrySummary,
    })

    const { data: health } = useQuery({
        queryKey: ['health'],
        queryFn: getHealthStatus,
    })

    const { data: regions = [] } = useQuery({
        queryKey: ['threat-regions'],
        queryFn: getThreatRegions,
    })

    // Mock stats for demo
    const stats = {
        totalScans: telemetry?.total_scans || 12847,
        phishingDetected: telemetry?.phishing_count || 2341,
        safeUrls: telemetry?.safe_count || 9892,
        avgResponseTime: telemetry?.avg_response_ms || 145,
    }

    const verdictData = [
        { name: 'Safe', value: stats.safeUrls, color: '#10b981' },
        { name: 'Suspicious', value: Math.round(stats.totalScans * 0.05), color: '#f59e0b' },
        { name: 'Phishing', value: stats.phishingDetected, color: '#ef4444' },
    ]

    const regionData = regions.length > 0 ? regions.slice(0, 5) : [
        { region: 'Eastern Europe', count: 4281 },
        { region: 'Southeast Asia', count: 2104 },
        { region: 'North America', count: 982 },
        { region: 'South America', count: 756 },
        { region: 'Africa', count: 543 },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
                    <p className="text-slate-400">PhishGuard threat intelligence overview</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${health?.status === 'ready'
                            ? 'bg-safe/10 border-safe/30 text-safe-light'
                            : health?.status === 'frozen'
                                ? 'bg-suspicious/10 border-suspicious/30 text-suspicious-light'
                                : 'bg-cyber-card border-cyber-border text-slate-400'
                        }`}>
                        <Activity className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            {health?.status === 'ready' ? 'System Online' :
                                health?.status === 'frozen' ? 'System Frozen' : 'Checking...'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Total Scans</p>
                            <p className="text-3xl font-bold text-slate-100 mt-1">
                                {stats.totalScans.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-accent-indigo/20 rounded-xl">
                            <Shield className="w-6 h-6 text-accent-indigo" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-sm">
                        <TrendingUp className="w-4 h-4 text-safe" />
                        <span className="text-safe">+12.5%</span>
                        <span className="text-slate-500">from last week</span>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Phishing Detected</p>
                            <p className="text-3xl font-bold text-malicious-light mt-1">
                                {stats.phishingDetected.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-malicious/20 rounded-xl">
                            <ShieldAlert className="w-6 h-6 text-malicious-light" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-sm">
                        <TrendingDown className="w-4 h-4 text-safe" />
                        <span className="text-safe">-3.2%</span>
                        <span className="text-slate-500">from last week</span>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Safe URLs</p>
                            <p className="text-3xl font-bold text-safe-light mt-1">
                                {stats.safeUrls.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-safe/20 rounded-xl">
                            <ShieldCheck className="w-6 h-6 text-safe-light" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-sm">
                        <span className="text-slate-400">
                            {((stats.safeUrls / stats.totalScans) * 100).toFixed(1)}% of total
                        </span>
                    </div>
                </div>

                <div className="card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-slate-400">Avg Response Time</p>
                            <p className="text-3xl font-bold text-accent-cyan mt-1">
                                {stats.avgResponseTime}ms
                            </p>
                        </div>
                        <div className="p-3 bg-accent-cyan/20 rounded-xl">
                            <Zap className="w-6 h-6 text-accent-cyan" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-sm">
                        <Clock className="w-4 h-4 text-slate-500" />
                        <span className="text-slate-400">Real-time analysis</span>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Threats by Region */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart3 className="w-5 h-5 text-accent-cyan" />
                        <h3 className="font-semibold text-slate-100">Threats by Region</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={regionData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis type="number" stroke="#64748b" fontSize={12} />
                                <YAxis dataKey="region" type="category" stroke="#64748b" fontSize={12} width={100} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111827',
                                        border: '1px solid #1e293b',
                                        borderRadius: '8px',
                                    }}
                                    labelStyle={{ color: '#e2e8f0' }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Verdict Distribution */}
                <div className="card">
                    <div className="flex items-center gap-2 mb-6">
                        <PieChart className="w-5 h-5 text-accent-indigo" />
                        <h3 className="font-semibold text-slate-100">Verdict Distribution</h3>
                    </div>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsPie>
                                <Pie
                                    data={verdictData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {verdictData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#111827',
                                        border: '1px solid #1e293b',
                                        borderRadius: '8px',
                                    }}
                                />
                            </RechartsPie>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                        {verdictData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                <span className="text-sm text-slate-400">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent-cyan" />
                        <h3 className="font-semibold text-slate-100">Recent Activity</h3>
                    </div>
                    <button className="text-sm text-accent-indigo hover:underline">View All</button>
                </div>
                <div className="space-y-4">
                    {[
                        { type: 'phishing', url: 'secure-login-bank.com', time: '2 min ago' },
                        { type: 'safe', url: 'google.com', time: '5 min ago' },
                        { type: 'suspicious', url: 'verify-account-now.net', time: '12 min ago' },
                        { type: 'phishing', url: 'paypal-secure-update.xyz', time: '18 min ago' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-3 border-b border-cyber-border last:border-0">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${item.type === 'phishing' ? 'bg-malicious/20' :
                                        item.type === 'suspicious' ? 'bg-suspicious/20' :
                                            'bg-safe/20'
                                    }`}>
                                    {item.type === 'phishing' ? (
                                        <ShieldAlert className="w-4 h-4 text-malicious-light" />
                                    ) : item.type === 'suspicious' ? (
                                        <AlertTriangle className="w-4 h-4 text-suspicious-light" />
                                    ) : (
                                        <ShieldCheck className="w-4 h-4 text-safe-light" />
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{item.url}</p>
                                    <p className="text-xs text-slate-500 capitalize">{item.type} detected</p>
                                </div>
                            </div>
                            <span className="text-xs text-slate-500">{item.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Dashboard
