import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, ShieldAlert, AlertTriangle, Check, ArrowRight, Clock, Flame } from 'lucide-react';
import { AlertNotification } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { IncidentDetailDrawer } from '../components/detail/IncidentDetailDrawer';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const AlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/analytics/overview');
      if (res.data?.data?.criticalAlerts) {
        setAlerts(res.data.data.criticalAlerts);
      }
    } catch (err) {
      console.error('[AlertsPage] Error fetching alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
          <Bell className="w-6 h-6 text-rose-500" />
          OPERATIONAL ALERTS & ESCALATION QUEUE
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Active Watch Center Threshold Warnings, Escalated Incidents & Bottleneck Triage
        </p>
      </div>

      {loading ? (
        <LoadingSkeleton count={4} height="h-28" />
      ) : (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card className="p-12 text-center text-slate-400 font-mono text-xs">
              No unacknowledged alerts pending in operational queue.
            </Card>
          ) : (
            alerts.map((alert) => {
              const isCritical = alert.level === 'CRITICAL';
              return (
                <div
                  key={alert._id}
                  className={`p-4 rounded-lg border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isCritical
                      ? 'bg-rose-950/40 border-rose-800 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
                      : 'bg-amber-950/30 border-amber-800/80'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 shrink-0 mt-0.5">
                      {isCritical ? (
                        <ShieldAlert className="w-5 h-5 text-rose-500 animate-pulse" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold font-mono text-slate-100">{alert.title}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            isCritical ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                          }`}
                        >
                          {alert.level}
                        </span>
                        {alert.zone && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {alert.zone}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{alert.message}</p>
                      <div className="text-[11px] font-mono text-slate-500 mt-2">
                        Detected: {new Date(alert.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {alert.relatedIncidentId && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        onClick={() => setSelectedIncidentId(alert.relatedIncidentId!)}
                      >
                        Inspect Call
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Check className="w-3.5 h-3.5 text-emerald-400" />}
                      onClick={() => handleAcknowledge(alert._id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Incident Investigation Drawer */}
      <IncidentDetailDrawer
        incidentId={selectedIncidentId}
        isOpen={Boolean(selectedIncidentId)}
        onClose={() => setSelectedIncidentId(null)}
        onIncidentUpdated={fetchAlerts}
      />
    </div>
  );
};
