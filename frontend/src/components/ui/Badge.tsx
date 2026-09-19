import React from 'react';
import { AlertCircle, AlertTriangle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { Severity, IncidentStatus } from '../../types';

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1 font-semibold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3 py-1.5 gap-2 font-bold tracking-wide',
  };

  switch (severity) {
    case 'CRITICAL':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-rose-950/80 text-rose-300 border border-rose-600/60 shadow-[0_0_10px_rgba(244,63,94,0.3)] ${sizeClasses[size]} ${className}`}
        >
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping inline-block mr-0.5" />
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          CRITICAL
        </span>
      );
    case 'HIGH':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-orange-950/70 text-orange-300 border border-orange-600/50 ${sizeClasses[size]} ${className}`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
          HIGH
        </span>
      );
    case 'MEDIUM':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-amber-950/70 text-amber-300 border border-amber-600/50 ${sizeClasses[size]} ${className}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          MEDIUM
        </span>
      );
    case 'LOW':
      return (
        <span
          className={`inline-flex items-center rounded-md bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 ${sizeClasses[size]} ${className}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          LOW
        </span>
      );
    default:
      return null;
  }
};

interface StatusBadgeProps {
  status: IncidentStatus | string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
  };

  const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
    ACTIVE: { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-700/50' },
    UNDER_REVIEW: { bg: 'bg-blue-950/60', text: 'text-blue-300', border: 'border-blue-700/50' },
    ASSIGNED: { bg: 'bg-purple-950/60', text: 'text-purple-300', border: 'border-purple-700/50' },
    EN_ROUTE: { bg: 'bg-indigo-950/60', text: 'text-indigo-300', border: 'border-indigo-700/50' },
    ON_SCENE: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-700/50' },
    RESOLVED: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/50' },
    ESCALATED: { bg: 'bg-red-950/80', text: 'text-red-300', border: 'border-red-600' },
    DELAYED: { bg: 'bg-amber-950/90', text: 'text-amber-200', border: 'border-amber-500 animate-pulse' },
    AVAILABLE: { bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-700/50' },
    BUSY: { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
    MAINTENANCE: { bg: 'bg-zinc-900', text: 'text-zinc-400', border: 'border-zinc-700' },
  };

  const config = statusConfig[status] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };

  return (
    <span
      className={`inline-flex items-center font-mono font-medium rounded border ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]} ${className}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
};
