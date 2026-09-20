import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, ArrowRight, Check } from 'lucide-react';
import { AlertNotification } from '../../types';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { RoleGate } from '../ui/RoleGate';

interface CriticalAlertsPanelProps {
  alerts: AlertNotification[];
  onAcknowledgeAlert?: (alertId: string) => void;
  onInspectAlert?: (incidentId?: string) => void;
}

export const CriticalAlertsPanel: React.FC<CriticalAlertsPanelProps> = ({
  alerts,
  onAcknowledgeAlert,
  onInspectAlert,
}) => {
  return (
    <Card
      title="CRITICAL OPERATIONAL ALERTS"
      subtitle="Immediate attention required"
      badge={
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700 font-bold">
          {alerts.length} URGENT
        </span>
      }
      className="w-full"
      bodyClassName="space-y-2.5 overflow-y-auto max-h-[380px]"
    >
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400">No unacknowledged critical alerts in queue.</div>
      ) : (
        alerts.map((alert) => {
          const isCritical = alert.level === 'CRITICAL';
          return (
            <div
              key={alert._id}
              className={`p-3 rounded-lg border transition-all ${
                isCritical
                  ? 'bg-rose-950/40 border-rose-800/80 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                  : 'bg-amber-950/30 border-amber-800/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isCritical ? (
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span
                    className={`text-xs font-bold font-mono tracking-wide ${
                      isCritical ? 'text-rose-200' : 'text-amber-200'
                    }`}
                  >
                    {alert.title}
                  </span>
                </div>
                {alert.zone && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 shrink-0">
                    {alert.zone.split(' - ')[0]}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-sans">{alert.message}</p>

              <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">
                  {new Date(alert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <div className="flex items-center gap-2">
                  {alert.relatedIncidentId && onInspectAlert && (
                    <button
                      onClick={() => onInspectAlert(alert.relatedIncidentId)}
                      className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors"
                    >
                      Inspect <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  {onAcknowledgeAlert && (
                    <RoleGate allowedRoles={['OPERATOR', 'CONTROL_ROOM', 'ADMIN']}>
                      <button
                        onClick={() => onAcknowledgeAlert(alert._id)}
                        className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 transition-colors"
                      >
                        <Check className="w-3 h-3 text-emerald-400" /> Ack
                      </button>
                    </RoleGate>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
};
