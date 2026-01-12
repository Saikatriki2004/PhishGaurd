import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet'
import { getThreatsMapData, getLiveThreats, getThreatRegions } from '../api/client'
import {
    Search,
    Filter,
    Play,
    Pause,
    SkipBack,
    Crosshair,
    Plus,
    Minus,
    Layers,
    Radio,
    Mail,
    MessageSquare,
    Globe,
    Wifi,
    MapPin,
} from 'lucide-react'

// Dark map tiles
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

function ThreatMap() {
    const [isLive, setIsLive] = useState(true)
    const [selectedThreatTypes, setSelectedThreatTypes] = useState(['malware', 'credential', 'social'])
    const [selectedVectors, setSelectedVectors] = useState(['email', 'sms', 'web', 'network'])
    const [displayMode, setDisplayMode] = useState('heatmap')
    const [focusRegion, setFocusRegion] = useState('')

    // Fetch threat data
    const { data: threats = [] } = useQuery({
        queryKey: ['threats-map'],
        queryFn: getThreatsMapData,
        refetchInterval: isLive ? 5000 : false,
    })

    const { data: liveThreats = [] } = useQuery({
        queryKey: ['threats-live'],
        queryFn: getLiveThreats,
        refetchInterval: isLive ? 3000 : false,
    })

    const { data: regions = [] } = useQuery({
        queryKey: ['threat-regions'],
        queryFn: getThreatRegions,
    })

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical':
                return '#ef4444'
            case 'suspicious':
                return '#f59e0b'
            default:
                return '#06b6d4'
        }
    }

    const formatTimeAgo = (timestamp) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
        if (seconds < 60) return `${seconds}s ago`
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
        return `${Math.floor(seconds / 3600)}h ago`
    }

    const vectorIcons = {
        email: Mail,
        sms: MessageSquare,
        web: Globe,
        network: Wifi,
    }

    return (
        <div className="h-[calc(100vh-8rem)] flex gap-4">
            {/* Left Sidebar - Controls */}
            <div className="w-64 flex-shrink-0 space-y-4 overflow-y-auto">
                <div className="card">
                    <div className="flex items-center gap-2 mb-4">
                        <Layers className="w-5 h-5 text-accent-cyan" />
                        <h3 className="font-semibold text-slate-100">Map Controls</h3>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Configure threat visualization layers</p>

                    {/* Focus Region */}
                    <div className="mb-4">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                            Focus Region
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="E.g. Eastern Europe"
                                value={focusRegion}
                                onChange={(e) => setFocusRegion(e.target.value)}
                                className="input-dark pl-10 text-sm"
                            />
                        </div>
                    </div>

                    {/* Threat Types */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                Threat Types
                            </label>
                            <button className="text-xs text-accent-cyan hover:underline">Reset</button>
                        </div>
                        <div className="space-y-2">
                            {[
                                { id: 'malware', label: 'Malware & Ransomware' },
                                { id: 'credential', label: 'Credential Harvesting' },
                                { id: 'social', label: 'Social Engineering' },
                            ].map((type) => (
                                <label key={type.id} className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedThreatTypes.includes(type.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedThreatTypes([...selectedThreatTypes, type.id])
                                            } else {
                                                setSelectedThreatTypes(selectedThreatTypes.filter((t) => t !== type.id))
                                            }
                                        }}
                                        className="w-4 h-4 rounded border-cyber-border bg-cyber-surface text-accent-indigo focus:ring-accent-indigo/50"
                                    />
                                    <span className="text-sm text-slate-300">{type.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Attack Vector */}
                    <div className="mb-4">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                            Attack Vector
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {['email', 'sms', 'web', 'network'].map((vector) => {
                                const Icon = vectorIcons[vector]
                                const isActive = selectedVectors.includes(vector)
                                return (
                                    <button
                                        key={vector}
                                        onClick={() => {
                                            if (isActive) {
                                                setSelectedVectors(selectedVectors.filter((v) => v !== vector))
                                            } else {
                                                setSelectedVectors([...selectedVectors, vector])
                                            }
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isActive
                                                ? 'bg-accent-indigo/20 text-accent-indigo border border-accent-indigo/30'
                                                : 'bg-cyber-surface text-slate-400 border border-cyber-border hover:border-slate-600'
                                            }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {vector.charAt(0).toUpperCase() + vector.slice(1)}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Display Mode */}
                    <div className="mb-4">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 block">
                            Display Mode
                        </label>
                        <div className="space-y-2">
                            {[
                                { id: 'heatmap', label: 'Heatmap', desc: 'Density visualization' },
                                { id: 'cluster', label: 'Cluster Points', desc: 'Individual incidents' },
                            ].map((mode) => (
                                <label
                                    key={mode.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all ${displayMode === mode.id
                                            ? 'bg-cyber-surface border-accent-indigo/30'
                                            : 'border-cyber-border hover:border-slate-600'
                                        }`}
                                >
                                    <input
                                        type="radio"
                                        name="displayMode"
                                        checked={displayMode === mode.id}
                                        onChange={() => setDisplayMode(mode.id)}
                                        className="w-4 h-4 text-accent-indigo focus:ring-accent-indigo/50"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">{mode.label}</p>
                                        <p className="text-xs text-slate-500">{mode.desc}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="border-t border-cyber-border pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5" />
                                Legend
                            </h4>
                            <span className="text-xs text-accent-cyan">Medium+</span>
                        </div>
                        <div className="space-y-2 text-xs">
                            <p className="font-medium text-slate-400 mb-2">Threat Severity</p>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-malicious" />
                                <span className="text-slate-300">Critical / Malicious</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-suspicious" />
                                <span className="text-slate-300">Suspicious</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-accent-cyan" />
                                <span className="text-slate-300">Monitoring / Safe</span>
                            </div>
                            <p className="font-medium text-slate-400 mt-3 mb-2">Map Indicators</p>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-malicious animate-pulse" />
                                <span className="text-slate-300">Live Incident</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-0.5 border-t-2 border-dashed border-malicious" />
                                <span className="text-slate-300">Attack Vector</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="flex-1 rounded-xl overflow-hidden border border-cyber-border relative">
                <MapContainer
                    center={[30, 0]}
                    zoom={2}
                    className="w-full h-full"
                    zoomControl={false}
                >
                    <TileLayer
                        url={DARK_TILES}
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    />

                    {/* Attack lines */}
                    {threats.map((threat, idx) => (
                        <Polyline
                            key={idx}
                            positions={[
                                [threat.source.lat, threat.source.lng],
                                [threat.target.lat, threat.target.lng],
                            ]}
                            pathOptions={{
                                color: getSeverityColor(threat.severity),
                                weight: 2,
                                opacity: 0.6,
                                dashArray: '5, 10',
                            }}
                        />
                    ))}

                    {/* Source markers */}
                    {threats.map((threat, idx) => (
                        <CircleMarker
                            key={`source-${idx}`}
                            center={[threat.source.lat, threat.source.lng]}
                            radius={6}
                            pathOptions={{
                                color: getSeverityColor(threat.severity),
                                fillColor: getSeverityColor(threat.severity),
                                fillOpacity: 0.8,
                            }}
                        >
                            <Popup className="dark-popup">
                                <div className="text-xs">
                                    <p className="font-semibold">{threat.type}</p>
                                    <p className="text-slate-400">{threat.attack_vector}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}

                    {/* Target markers */}
                    {threats.map((threat, idx) => (
                        <CircleMarker
                            key={`target-${idx}`}
                            center={[threat.target.lat, threat.target.lng]}
                            radius={4}
                            pathOptions={{
                                color: '#475569',
                                fillColor: '#64748b',
                                fillOpacity: 0.6,
                            }}
                        />
                    ))}
                </MapContainer>

                {/* Map controls overlay */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-cyber-card/90 backdrop-blur-sm rounded-full border border-cyber-border">
                    <button className="p-2 text-slate-400 hover:text-white">
                        <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setIsLive(!isLive)}
                        className={`p-2 rounded-full ${isLive ? 'bg-malicious text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {isLive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <div className="h-8 w-24 bg-cyber-surface rounded flex items-end gap-0.5 px-1">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex-1 bg-accent-cyan/60 rounded-t"
                                style={{ height: `${Math.random() * 100}%` }}
                            />
                        ))}
                    </div>
                    <span className={`text-xs font-medium ${isLive ? 'text-malicious' : 'text-slate-400'}`}>
                        {isLive ? 'LIVE' : 'PAUSED'}
                    </span>
                </div>

                {/* Zoom controls */}
                <div className="absolute right-4 bottom-4 flex flex-col gap-2">
                    <button className="p-2 bg-cyber-card border border-cyber-border rounded-lg text-slate-400 hover:text-white">
                        <Plus className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-cyber-card border border-cyber-border rounded-lg text-slate-400 hover:text-white">
                        <Minus className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-cyber-card border border-cyber-border rounded-lg text-slate-400 hover:text-white">
                        <Crosshair className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Right Sidebar - Live Feed */}
            <div className="w-72 flex-shrink-0 space-y-4">
                {/* Live Threat Feed */}
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-malicious animate-pulse" />
                            <h3 className="font-semibold text-slate-100">Live Threat Feed</h3>
                        </div>
                        <span className="text-xs text-slate-500">REAL-TIME</span>
                    </div>

                    <div className="space-y-4">
                        {liveThreats.slice(0, 4).map((threat, idx) => (
                            <div key={idx} className="pb-4 border-b border-cyber-border last:border-0 last:pb-0">
                                <div className="flex items-center justify-between mb-1">
                                    <span className={`text-sm font-medium ${threat.severity === 'critical' ? 'text-malicious-light' :
                                            threat.severity === 'suspicious' ? 'text-suspicious-light' :
                                                'text-accent-cyan'
                                        }`}>
                                        {threat.label}
                                    </span>
                                    <span className="text-xs text-slate-500">{formatTimeAgo(threat.timestamp)}</span>
                                </div>
                                <p className="text-sm text-slate-300 font-mono">{threat.entity}</p>
                                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                                    <MapPin className="w-3 h-3" />
                                    {threat.location}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Source Regions */}
                <div className="card">
                    <h3 className="font-semibold text-slate-100 mb-4">Top Source Regions</h3>
                    <div className="space-y-3">
                        {(regions.length > 0 ? regions.slice(0, 3) : [
                            { region: 'Eastern Europe', count: 4281 },
                            { region: 'Southeast Asia', count: 2104 },
                            { region: 'North America', count: 982 },
                        ]).map((region, idx) => (
                            <div key={idx}>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm text-slate-300">{region.region}</span>
                                    <span className={`text-sm font-mono ${idx === 0 ? 'text-malicious-light' :
                                            idx === 1 ? 'text-suspicious-light' :
                                                'text-accent-cyan'
                                        }`}>
                                        {region.count.toLocaleString()}
                                    </span>
                                </div>
                                <div className="h-1.5 bg-cyber-surface rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${idx === 0 ? 'bg-malicious' :
                                                idx === 1 ? 'bg-suspicious' :
                                                    'bg-accent-cyan'
                                            }`}
                                        style={{ width: `${(region.count / 4281) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ThreatMap
