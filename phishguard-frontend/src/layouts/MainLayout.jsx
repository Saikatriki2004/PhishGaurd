import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getHealthStatus } from '../api/client'
import {
    Shield,
    LayoutDashboard,
    History,
    Map,
    Settings,
    Menu,
    X,
    Bell,
    Search,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Activity,
    AlertCircle,
} from 'lucide-react'

const navItems = [
    { path: '/', label: 'Scanner', icon: Shield },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/history', label: 'Scan History', icon: History },
    { path: '/threat-map', label: 'Map', icon: Map },
    { path: '/settings', label: 'Settings', icon: Settings },
]

function MainLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const location = useLocation()

    // Poll health status every 30 seconds
    const { data: health } = useQuery({
        queryKey: ['health'],
        queryFn: getHealthStatus,
        refetchInterval: 30000,
        retry: false,
    })

    // Close mobile sidebar on route change
    useEffect(() => {
        setSidebarOpen(false)
    }, [location])

    // Persist collapsed state in localStorage
    useEffect(() => {
        const saved = localStorage.getItem('phishguard_sidebar_collapsed')
        if (saved !== null) {
            setSidebarCollapsed(JSON.parse(saved))
        }
    }, [])

    const toggleCollapse = () => {
        const newState = !sidebarCollapsed
        setSidebarCollapsed(newState)
        localStorage.setItem('phishguard_sidebar_collapsed', JSON.stringify(newState))
    }

    const getStatusColor = () => {
        if (!health) return 'bg-slate-500'
        if (health.status === 'ready') return 'bg-safe'
        if (health.status === 'frozen') return 'bg-suspicious'
        return 'bg-malicious'
    }

    const getStatusText = () => {
        if (!health) return 'Checking...'
        if (health.status === 'ready') return 'System Online'
        if (health.status === 'frozen') return 'System Frozen'
        if (health.status === 'degraded') return 'Degraded'
        return 'Offline'
    }

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-cyber-card border-r border-cyber-border transform transition-all duration-300 ease-in-out lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } ${sidebarCollapsed ? 'w-20' : 'w-64'}`}
            >
                {/* Logo */}
                <div className={`flex items-center gap-3 px-6 py-5 border-b border-cyber-border ${sidebarCollapsed ? 'justify-center px-4' : ''}`}>
                    <div className="p-2 bg-accent-indigo/20 rounded-lg flex-shrink-0">
                        <Shield className="w-6 h-6 text-accent-indigo" />
                    </div>
                    {!sidebarCollapsed && (
                        <span className="text-xl font-bold text-white">PhishGuard</span>
                    )}
                </div>

                {/* Navigation */}
                <nav className={`py-6 space-y-1 ${sidebarCollapsed ? 'px-2' : 'px-4'}`}>
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                title={sidebarCollapsed ? item.label : undefined}
                                className={`flex items-center gap-3 py-3 rounded-lg transition-all duration-200 ${sidebarCollapsed ? 'justify-center px-3' : 'px-4'
                                    } ${isActive
                                        ? 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30'
                                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                                    }`}
                            >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!sidebarCollapsed && (
                                    <span className="font-medium">{item.label}</span>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Collapse toggle button */}
                <button
                    onClick={toggleCollapse}
                    className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-cyber-card border border-cyber-border rounded-full items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-10"
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {sidebarCollapsed ? (
                        <ChevronRight className="w-4 h-4" />
                    ) : (
                        <ChevronLeft className="w-4 h-4" />
                    )}
                </button>

                {/* Status indicator at bottom */}
                <div className={`absolute bottom-0 left-0 right-0 p-4 border-t border-cyber-border ${sidebarCollapsed ? 'p-2' : ''}`}>
                    <div className={`flex items-center gap-3 py-3 bg-cyber-surface rounded-lg ${sidebarCollapsed ? 'justify-center px-2' : 'px-4'}`}>
                        <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse flex-shrink-0`} />
                        {!sidebarCollapsed && (
                            <span className="text-sm text-slate-400">{getStatusText()}</span>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex items-center justify-between px-6 py-4 bg-cyber-card border-b border-cyber-border">
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 text-slate-400 hover:text-white lg:hidden"
                    >
                        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    {/* Search bar */}
                    <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
                        <div className="relative w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search IP, Domain, or Hash..."
                                className="w-full pl-10 pr-4 py-2 bg-cyber-surface border border-cyber-border rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-accent-indigo"
                            />
                        </div>
                    </div>

                    {/* Right side actions */}
                    <div className="flex items-center gap-4">
                        {/* Status badge */}
                        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyber-surface rounded-lg border border-cyber-border">
                            <Activity className="w-4 h-4 text-accent-cyan" />
                            <span className="text-xs text-slate-400">
                                {health?.status === 'ready' ? 'All Systems Operational' : 'Status Unknown'}
                            </span>
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 bg-malicious rounded-full" />
                        </button>

                        {/* User avatar */}
                        <button className="flex items-center gap-2 p-1 hover:bg-slate-800 rounded-lg transition-colors">
                            <div className="w-8 h-8 bg-accent-indigo/20 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-accent-indigo">JD</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
                        </button>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-auto bg-cyber-bg p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}

export default MainLayout

