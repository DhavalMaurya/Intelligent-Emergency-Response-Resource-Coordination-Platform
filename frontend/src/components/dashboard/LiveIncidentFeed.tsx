import React from 'react';
import { Radio, ArrowUpRight } from 'lucide-react';
import { Incident } from '../../types';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Card } from '../ui/Card';

interface LiveIncidentFeedProps {
  incidents: Incident[];
  onSelectIncident?: (incident: Incident) => void;
}

export const LiveIncidentFeed: React.FC<LiveIncidentFeedProps> = ({ incidents, onSelectIncident }) => {
  return (
    <Card
      title="LIVE INCIDENT EVENT STREAM"
      subtitle="Operational telemetry & reports"
      badge={
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          REALTIME
        </div>
      }
      className="h-full"
      bodyClassName="p-0 overflow-y-auto max-h-[380px] divide-y divide-slate-800/80"
    >
      {incidents.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">No active events in selected scope.</div>
      ) : (
        incidents.map((inc) => (
          <div
            key={inc._id}
            onClick={() => onSelectIncident?.(inc)}
            className="p-3.5 hover:bg-slate-800/50 cursor-pointer transition-colors group flex items-start justify-between gap-3"
          >
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold text-slate-200">{inc.incidentNumber}</span>
                <SeverityBadge severity={inc.severity} size="sm" />
                <StatusBadge status={inc.status} size="sm" />
              </div>

              <div className="text-xs font-semibold text-slate-100 truncate group-hover:text-rose-300 transition-colors">
                {inc.title}
              </div>

              <div className="text-[11px] text-slate-400 truncate">
                {inc.location.address} • <span className="text-slate-500">{inc.location.zone}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-slate-500 block">
                {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-slate-600 group-hover:text-rose-400 inline-block mt-2 transition-colors">
                <ArrowUpRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ))
      )}
    </Card>
  );
};
