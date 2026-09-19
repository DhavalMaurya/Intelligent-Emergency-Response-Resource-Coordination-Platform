import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <ShieldCheck className="w-10 h-10 text-emerald-400/80 mb-2" />,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-slate-900/40 rounded-lg border border-dashed border-slate-800 ${className}`}
    >
      <div className="p-3 bg-slate-800/40 rounded-full mb-3">{icon}</div>
      <h4 className="text-sm font-semibold text-slate-200 uppercase tracking-wide font-display">{title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
