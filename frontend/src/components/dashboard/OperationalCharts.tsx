import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card } from '../ui/Card';

interface OperationalChartsProps {
  data: {
    incidentTrend: Array<{ time: string; active: number; resolved: number }>;
    severityDistribution: Array<{ name: string; count: number; percentage: number }>;
    incidentsByType: Array<{ type: string; rawType: string; count: number }>;
    responseTimeBySector: Array<{ sector: string; fullName: string; avgMinutes: number; targetThresholdMinutes: number }>;
    resourceUtilization: Array<{ fleet: string; available: number; busy: number; total: number; utilizationRate: number }>;
    delayedBreakdown: Array<{ reason: string; count: number }>;
    zoneDensity: Array<{ zone: string; fullName: string; count: number }>;
  };
  targetResponseMinutes?: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
};

export const OperationalCharts: React.FC<OperationalChartsProps> = ({ data, targetResponseMinutes = 8 }) => {
  const [activeTab, setActiveTab] = useState<'trends' | 'response' | 'fleets'>('trends');

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-mono">
          <div className="font-bold text-slate-200 mb-1">{label}</div>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: entry.color }} className="flex items-center justify-between gap-3">
              <span>{entry.name}:</span>
              <span className="font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card
      title="OPERATIONAL ANALYTICS & TREND VISUALIZERS"
      subtitle="EOC mission-critical metrics & SLA tracking"
      actions={
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'trends' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Incident Trends & Types
          </button>
          <button
            onClick={() => setActiveTab('response')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'response' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Response Times (SLA)
          </button>
          <button
            onClick={() => setActiveTab('fleets')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'fleets' ? 'bg-rose-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Fleet Utilization & Delays
          </button>
        </div>
      }
      className="w-full"
    >
      {activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 1. Incident Trend Over Time */}
          <div className="lg:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
                1. Incident Volume vs. Resolution Progression
              </span>
              <span className="text-[10px] font-mono text-slate-500">Hourly Telemetry</span>
            </div>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.incidentTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolvedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                  <Area type="monotone" dataKey="active" name="Active Incidents" stroke="#ef4444" fillOpacity={1} fill="url(#activeGrad)" />
                  <Area type="monotone" dataKey="resolved" name="Resolved Incidents" stroke="#10b981" fillOpacity={1} fill="url(#resolvedGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 2. Severity Distribution Donut */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              2. Severity Distribution
            </span>
            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                  >
                    {data.severityDistribution.map((entry) => (
                      <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 3. Incidents by Category / Type */}
          <div className="lg:col-span-3 space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              3. Incident Volume by Category
            </span>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.incidentsByType} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="type" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Total Incidents" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'response' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 4. Response Times by Sector vs Configurable SLA Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
                4. Sector Response Times vs. Configurable Target SLA
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Target: &lt;{targetResponseMinutes}m</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.responseTimeBySector} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="sector" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="m" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={targetResponseMinutes}
                    label={{ value: `Target SLA (${targetResponseMinutes}m)`, fill: '#10b981', fontSize: 10, position: 'top' }}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                  />
                  <Bar dataKey="avgMinutes" name="Average Response (Min)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 7. Sector Incident Density */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              7. Geographic Sector Incident Density
            </span>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.zoneDensity} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="zone" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Total Incidents" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'fleets' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 5. Resource Utilization by Fleet */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              5. Fleet Readiness & Deployment Utilization
            </span>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.resourceUtilization} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="fleet" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="available" name="Available Units" fill="#10b981" stackId="a" />
                  <Bar dataKey="busy" name="Deployed / Busy Units" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 6. Delayed Response Root-Cause Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              6. Response Delay Attribution
            </span>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.delayedBreakdown} layout="vertical" margin={{ top: 15, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                  <YAxis dataKey="reason" type="category" stroke="#64748b" fontSize={10} tickLine={false} width={130} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Delayed Incidents" fill="#eab308" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
