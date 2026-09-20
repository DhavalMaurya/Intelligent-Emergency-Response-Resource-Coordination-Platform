import React from 'react';
import { Clock, CheckCircle2, AlertTriangle, ShieldCheck, Truck, MapPin } from 'lucide-react';
import { Incident } from '../../types';

interface ResponseTimelineProps {
  incident: Incident;
}

export const ResponseTimeline: React.FC<ResponseTimelineProps> = ({ incident }) => {
  const metrics = incident.responseMetrics || {};
  const detectTime = metrics.detectionTimestamp ? new Date(metrics.detectionTimestamp) : new Date(incident.createdAt);
  const dispatchTime = metrics.dispatchedTimestamp ? new Date(metrics.dispatchedTimestamp) : null;
  const arrivedTime = metrics.arrivedTimestamp ? new Date(metrics.arrivedTimestamp) : null;
  const resolvedTime = metrics.resolvedTimestamp ? new Date(metrics.resolvedTimestamp) : null;

  const dispatchDelay = metrics.dispatchDelayMinutes !== undefined
    ? metrics.dispatchDelayMinutes
    : dispatchTime
    ? Math.max(0, Math.round((dispatchTime.getTime() - detectTime.getTime()) / 60000))
    : null;

  const totalResponse = metrics.totalResponseMinutes !== undefined
    ? metrics.totalResponseMinutes
    : resolvedTime
    ? Math.max(0, Math.round((resolvedTime.getTime() - detectTime.getTime()) / 60000))
    : null;

  const steps = [
    {
      label: 'Incident Ingested & Logged',
      time: detectTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      completed: true,
      active: incident.status === 'ACTIVE' || incident.status === 'UNDER_REVIEW',
      icon: Clock,
      color: 'text-indigo-400 border-indigo-700 bg-indigo-950/80',
    },
    {
      label: 'Resource Dispatched',
      time: dispatchTime ? dispatchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Awaiting Dispatch',
      subtext: dispatchDelay !== null ? `Delay: ${dispatchDelay} min` : undefined,
      completed: Boolean(dispatchTime),
      active: incident.status === 'ASSIGNED' || incident.status === 'EN_ROUTE',
      icon: Truck,
      color: dispatchTime ? 'text-sky-400 border-sky-700 bg-sky-950/80' : 'text-slate-500 border-slate-800 bg-slate-900',
    },
    {
      label: 'Units On Scene',
      time: arrivedTime ? arrivedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'En Route',
      completed: Boolean(arrivedTime),
      active: incident.status === 'ON_SCENE',
      icon: MapPin,
      color: arrivedTime ? 'text-amber-400 border-amber-700 bg-amber-950/80' : 'text-slate-500 border-slate-800 bg-slate-900',
    },
    {
      label: 'Incident Resolved',
      time: resolvedTime ? resolvedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'In Progress',
      subtext: totalResponse !== null ? `Total: ${totalResponse} min` : undefined,
      completed: Boolean(resolvedTime),
      active: incident.status === 'RESOLVED',
      icon: CheckCircle2,
      color: resolvedTime ? 'text-emerald-400 border-emerald-700 bg-emerald-950/80' : 'text-slate-500 border-slate-800 bg-slate-900',
    },
  ];

  const getDelayBadge = () => {
    if (incident.status === 'DELAYED') {
      return (
        <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono text-[10px] flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" /> SLA BREACH (Exceeded 5 min)
        </span>
      );
    }
    if (dispatchDelay !== null) {
      if (dispatchDelay <= 5) {
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono text-[10px]">
            SLA Compliant ({dispatchDelay} min)
          </span>
        );
      }
      return (
        <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-mono text-[10px]">
          Delayed Dispatch ({dispatchDelay} min)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">
        SLA Target: &le; 5 min
      </span>
    );
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-100 font-display uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          RESPONSE SLA METRICS & TIMELINE
        </span>
        {getDelayBadge()}
      </div>

      {/* Progress Timeline Tracker */}
      <div className="relative flex items-center justify-between">
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 -z-0" />

        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
              <div
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${step.color}`}
              >
                <Icon className="w-4 h-4" />
              </div>

              <span className="text-[11px] font-bold text-slate-200 mt-2">{step.label}</span>
              <span className="text-[10px] font-mono text-slate-400">{step.time}</span>
              {step.subtext && (
                <span className="text-[9px] font-mono text-cyan-400 font-bold">{step.subtext}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
