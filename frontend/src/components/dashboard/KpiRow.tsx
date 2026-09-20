import React from 'react';
import {
  AlertOctagon,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Truck,
  TrendingUp,
  Activity,
  Flame,
} from 'lucide-react';
import { KPIOverview } from '../../types';
import { useFilters } from '../../context/FilterContext';

interface KpiRowProps {
  kpis: KPIOverview;
  loading?: boolean;
}

export const KpiRow: React.FC<KpiRowProps> = ({ kpis, loading = false }) => {
  const { setSeverity, setStatus, filters } = useFilters();

  const cards = [
    {
      id: 'active',
      label: 'Active Incidents',
      value: kpis.activeIncidents,
      delta: '+2 from 1h ago',
      deltaType: 'increase',
      icon: Activity,
      color: 'text-rose-400',
      borderColor: 'border-rose-900/60',
      activeFilter: filters.status === 'ACTIVE',
      onClick: () => setStatus(filters.status === 'ACTIVE' ? 'ALL' : 'ACTIVE'),
    },
    {
      id: 'critical',
      label: 'Critical Incidents',
      value: kpis.criticalIncidents,
      delta: 'Immediate Dispatch',
      deltaType: 'alert',
      icon: ShieldAlert,
      color: 'text-red-500',
      borderColor: 'border-red-600/70',
      pulse: kpis.criticalIncidents > 0,
      activeFilter: filters.severity === 'CRITICAL',
      onClick: () => setSeverity(filters.severity === 'CRITICAL' ? 'ALL' : 'CRITICAL'),
    },
    {
      id: 'high',
      label: 'High Priority',
      value: kpis.highPriorityIncidents,
      delta: 'Active Monitoring',
      deltaType: 'neutral',
      icon: AlertTriangle,
      color: 'text-orange-400',
      borderColor: 'border-orange-900/60',
      activeFilter: filters.severity === 'HIGH',
      onClick: () => setSeverity(filters.severity === 'HIGH' ? 'ALL' : 'HIGH'),
    },
    {
      id: 'delayed',
      label: 'Delayed Responses',
      value: kpis.delayedResponses,
      delta: 'Threshold Breaches',
      deltaType: 'alert',
      icon: Clock,
      color: 'text-amber-400',
      borderColor: 'border-amber-700/60',
      activeFilter: filters.status === 'DELAYED',
      onClick: () => setStatus(filters.status === 'DELAYED' ? 'ALL' : 'DELAYED'),
    },
    {
      id: 'available',
      label: 'Available Units',
      value: kpis.availableResources,
      delta: 'Fleet Ready',
      deltaType: 'positive',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-900/60',
      onClick: undefined,
    },
    {
      id: 'in-use',
      label: 'Units Deployed',
      value: kpis.resourcesInUse,
      delta: 'On Scene / En Route',
      deltaType: 'neutral',
      icon: Truck,
      color: 'text-purple-400',
      borderColor: 'border-purple-900/60',
      onClick: undefined,
    },
    {
      id: 'escalated',
      label: 'Escalations',
      value: kpis.escalatedIncidents,
      delta: 'Supervisor Queue',
      deltaType: 'alert',
      icon: Flame,
      color: 'text-rose-500',
      borderColor: 'border-rose-800/60',
      activeFilter: filters.status === 'ESCALATED',
      onClick: () => setStatus(filters.status === 'ESCALATED' ? 'ALL' : 'ESCALATED'),
    },
    {
      id: 'response-time',
      label: 'Avg Response Time',
      value: `${kpis.averageResponseTime}m`,
      delta: `Target: <${kpis.targetThresholdMinutes}m`,
      deltaType: kpis.averageResponseTime <= kpis.targetThresholdMinutes ? 'positive' : 'alert',
      icon: TrendingUp,
      color: 'text-cyan-400',
      borderColor: 'border-cyan-900/60',
      onClick: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 2xl:grid-cols-8 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={card.onClick}
            title={`${card.label}: ${card.value} (${card.delta})`}
            className={`p-3.5 sm:p-4 rounded-xl bg-slate-900/95 border backdrop-blur-md transition-all duration-200 group flex flex-col justify-between ${card.borderColor} ${
              card.onClick ? 'cursor-pointer hover:bg-slate-850 hover:border-slate-500 hover:shadow-lg hover:-translate-y-0.5' : ''
            } ${card.activeFilter ? 'ring-2 ring-rose-500 shadow-lg shadow-rose-950/60 bg-slate-850' : ''}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-300 group-hover:text-white transition-colors truncate">
                {card.label}
              </span>
              <div className="p-1.5 rounded-lg bg-slate-950/80 border border-slate-800 shrink-0 group-hover:border-slate-700 transition-colors">
                <Icon className={`w-4 h-4 ${card.color} ${card.pulse ? 'animate-bounce' : ''}`} />
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2 mt-1">
              <span className="text-2xl font-black text-slate-100 font-mono tracking-tight">
                {loading ? '...' : card.value}
              </span>
              <span
                className={`text-[11px] font-mono font-semibold truncate ${
                  card.deltaType === 'alert'
                    ? 'text-rose-400 font-bold'
                    : card.deltaType === 'positive'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-slate-400'
                }`}
              >
                {card.delta}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
