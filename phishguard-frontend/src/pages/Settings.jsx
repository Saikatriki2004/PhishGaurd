import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTrustedDomains } from '../api/client'
import { useToast } from '../context/ToastContext'
import {
    User,
    Key,
    Bell,
    Shield,
    Copy,
    RefreshCw,
    Eye,
    EyeOff,
    Check,
    Trash2,
    Plus,
    Link2,
    AlertCircle,
    Save,
} from 'lucide-react'

function Settings() {
    const toast = useToast()
    const [showApiKey, setShowApiKey] = useState(false)
    const [newDomain, setNewDomain] = useState('')

    // User profile state
    const [profile, setProfile] = useState({
        fullName: 'John Doe',
        email: 'john.doe@phishguard.io',
    })

    // Notification preferences
    const [notifications, setNotifications] = useState({
        criticalThreats: true,
        suspiciousActivity: true,
        weeklyDigest: false,
    })

    // Allowed domains (local)
    const [localDomains, setLocalDomains] = useState([
        { domain: 'google.com', addedAt: '2023-10-24' },
        { domain: 'company-intranet.net', addedAt: '2023-09-12' },
        { domain: 'secure-payments.io', addedAt: '2023-08-05' },
    ])

    // Fetch trusted domains from API
    const { data: trustedDomains } = useQuery({
        queryKey: ['trusted-domains'],
        queryFn: getTrustedDomains,
    })

    const apiKey = 'pg_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx'

    const handleCopyApiKey = () => {
        navigator.clipboard.writeText(apiKey)
        toast.success('API key copied to clipboard')
    }

    const handleRegenerateKey = () => {
        toast.warning('This would regenerate your API key in production')
    }

    const handleAddDomain = (e) => {
        e.preventDefault()
        if (!newDomain.trim()) {
            toast.warning('Please enter a domain')
            return
        }

        // Validate domain format
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/
        if (!domainRegex.test(newDomain.trim())) {
            toast.error('Please enter a valid domain (e.g., example.com)')
            return
        }

        setLocalDomains([
            { domain: newDomain.trim(), addedAt: new Date().toISOString().split('T')[0] },
            ...localDomains,
        ])
        setNewDomain('')
        toast.success(`Domain "${newDomain.trim()}" added to allowlist`)
    }

    const handleRemoveDomain = (domain) => {
        setLocalDomains(localDomains.filter((d) => d.domain !== domain))
        toast.info(`Domain "${domain}" removed from allowlist`)
    }

    const handleSaveSettings = () => {
        // Save to localStorage
        localStorage.setItem('phishguard_settings', JSON.stringify({
            profile,
            notifications,
            localDomains,
        }))
        toast.success('Settings saved successfully')
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
                <p className="text-slate-400">
                    Manage your security preferences, API access, and allowed domains.
                </p>
            </div>

            {/* User Profile */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <User className="w-5 h-5 text-accent-indigo" />
                    <div>
                        <h2 className="font-semibold text-slate-100">User Profile</h2>
                        <p className="text-sm text-slate-500">Update your personal information and account security.</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8">
                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-24 h-24 bg-gradient-to-br from-accent-indigo to-accent-purple rounded-full flex items-center justify-center">
                            <span className="text-3xl font-bold text-white">JD</span>
                        </div>
                        <button className="btn-secondary text-sm">Change Photo</button>
                        <button className="text-xs text-malicious hover:underline">Remove</button>
                    </div>

                    {/* Form fields */}
                    <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Full Name</label>
                                <input
                                    type="text"
                                    value={profile.fullName}
                                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                                    className="input-dark"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Email Address</label>
                                <input
                                    type="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="input-dark"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-cyber-border">
                            <div className="flex items-center gap-2 mb-3">
                                <Shield className="w-4 h-4 text-accent-cyan" />
                                <span className="text-sm font-medium text-slate-300">Security</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-cyber-surface rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">Password</p>
                                        <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                                    </div>
                                </div>
                                <button className="btn-secondary text-sm">Update Password</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* API Access */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <Key className="w-5 h-5 text-accent-cyan" />
                    <div>
                        <h2 className="font-semibold text-slate-100">API Access</h2>
                        <p className="text-sm text-slate-500">Manage your secret keys for external application integration.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-2">Secret Key</label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <input
                                    type={showApiKey ? 'text' : 'password'}
                                    value={apiKey}
                                    readOnly
                                    className="input-dark pr-10 font-mono text-sm"
                                />
                                <button
                                    onClick={() => setShowApiKey(!showApiKey)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                                >
                                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <button onClick={handleCopyApiKey} className="btn-primary">
                                <Copy className="w-4 h-4" />
                                Copy
                            </button>
                            <button onClick={handleRegenerateKey} className="btn-secondary">
                                <RefreshCw className="w-4 h-4" />
                                Regenerate
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 p-3 bg-suspicious/10 border border-suspicious/20 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-suspicious-light mt-0.5" />
                        <p className="text-sm text-slate-400">
                            Do not share this key with anyone. It grants full access to your account.
                        </p>
                    </div>
                </div>
            </div>

            {/* Notification Preferences */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <Bell className="w-5 h-5 text-accent-purple" />
                    <div>
                        <h2 className="font-semibold text-slate-100">Notification Preferences</h2>
                        <p className="text-sm text-slate-500">Choose how and when you want to be alerted about threats.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {[
                        {
                            id: 'criticalThreats',
                            label: 'Critical Threats',
                            desc: 'Immediate alerts for high-risk phishing URLs.',
                            color: 'text-malicious-light',
                        },
                        {
                            id: 'suspiciousActivity',
                            label: 'Suspicious Activity',
                            desc: 'Alerts for unusual login attempts or API usage spikes.',
                            color: 'text-suspicious-light',
                        },
                        {
                            id: 'weeklyDigest',
                            label: 'Weekly Digest',
                            desc: 'A summary email of all prevented attacks sent every Monday.',
                            color: 'text-accent-cyan',
                        },
                    ].map((item) => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-cyber-surface rounded-lg">
                            <div className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-lg bg-cyber-card flex items-center justify-center ${item.color}`}>
                                    <Bell className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-200">{item.label}</p>
                                    <p className="text-xs text-slate-500">{item.desc}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifications({ ...notifications, [item.id]: !notifications[item.id] })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${notifications[item.id] ? 'bg-accent-indigo' : 'bg-cyber-border'
                                    }`}
                            >
                                <span
                                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${notifications[item.id] ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Allowed Domains */}
            <div className="card">
                <div className="flex items-center gap-3 mb-6">
                    <Link2 className="w-5 h-5 text-safe-light" />
                    <div>
                        <h2 className="font-semibold text-slate-100">Allowed Domains</h2>
                        <p className="text-sm text-slate-500">Whitelisted domains that bypass phishing scans.</p>
                    </div>
                </div>

                {/* Add domain form */}
                <form onSubmit={handleAddDomain} className="flex items-center gap-2 mb-6">
                    <div className="relative flex-1">
                        <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            value={newDomain}
                            onChange={(e) => setNewDomain(e.target.value)}
                            placeholder="e.g. internal-portal.com"
                            className="input-dark pl-10"
                        />
                    </div>
                    <button type="submit" className="btn-primary">
                        <Plus className="w-4 h-4" />
                        Add Domain
                    </button>
                </form>

                {/* Domain list */}
                <div className="border border-cyber-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 px-4 py-3 bg-cyber-surface border-b border-cyber-border">
                        <span className="text-xs font-semibold text-slate-400 uppercase">Domain</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase">Date Added</span>
                        <span className="text-xs font-semibold text-slate-400 uppercase text-right">Actions</span>
                    </div>
                    <div className="divide-y divide-cyber-border">
                        {localDomains.map((item) => (
                            <div key={item.domain} className="grid grid-cols-3 px-4 py-3 items-center">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-safe" />
                                    <span className="text-sm text-slate-200">{item.domain}</span>
                                </div>
                                <span className="text-sm text-slate-500">{item.addedAt}</span>
                                <div className="text-right">
                                    <button
                                        onClick={() => handleRemoveDomain(item.domain)}
                                        className="p-2 text-slate-500 hover:text-malicious-light transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-end gap-4 pb-8">
                <button className="btn-secondary">Discard Changes</button>
                <button onClick={handleSaveSettings} className="btn-primary">
                    <Save className="w-4 h-4" />
                    Save Settings
                </button>
            </div>
        </div>
    )
}

export default Settings
