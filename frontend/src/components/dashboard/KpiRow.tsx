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
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            onClick={card.onClick}
            className={`p-3.5 rounded-lg bg-slate-900/90 border transition-all duration-150 ${card.borderColor} ${
              card.onClick ? 'cursor-pointer hover:bg-slate-850 hover:border-slate-600' : ''
            } ${card.activeFilter ? 'ring-2 ring-rose-500 shadow-md shadow-rose-950' : ''}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 truncate">
                {card.label}
              </span>
              <Icon className={`w-4 h-4 ${card.color} ${card.pulse ? 'animate-bounce' : ''}`} />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-slate-100 font-mono tracking-tight">
                {loading ? '...' : card.value}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
              <span
                className={`truncate ${
                  card.deltaType === 'alert'
                    ? 'text-rose-400 font-semibold'
                    : card.deltaType === 'positive'
                    ? 'text-emerald-400 font-medium'
                    : 'text-slate-500'
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
