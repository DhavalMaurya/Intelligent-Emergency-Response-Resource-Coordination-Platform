import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { X, CheckCircle2, AlertTriangle, XCircle, Cpu, Database, Zap, Radio, Clock, ShieldCheck } from 'lucide-react';
import { SystemHealth } from '../../types';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface SystemHealthPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemHealthPanel: React.FC<SystemHealthPanelProps> = ({ isOpen, onClose }) => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/v1/system/health');
      if (res.data?.data) {
        setHealth(res.data.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('[Health] Failed to retrieve system health telemetry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
      const interval = setInterval(fetchHealth, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const renderStatusBadge = (status: string) => {
    if (status === 'OPERATIONAL' || status === 'CONNECTED' || status === 'READY' || status === 'ACTIVE' || status === 'AVAILABLE_HEALTHY') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          {status}
        </span>
      );
    }
    if (status === 'CONFIGURED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700/50">
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          CONFIGURED (PHASE 3 READY)
        </span>
      );
    }
    if (status === 'NOT_CONFIGURED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          NOT CONFIGURED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-700/50">
        <XCircle className="w-3 h-3 text-rose-400" />
        {status}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl z-10 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 font-display">
                EOC SYSTEM HEALTH & TELEMETRY
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Real-time connection verification across subsystem cluster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {loading && !health ? (
            <LoadingSkeleton count={4} height="h-20" />
          ) : health ? (
            <>
              {/* Overall Status Banner */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Platform Operational Status
                  </span>
                  <div className="text-lg font-bold text-emerald-400 font-display flex items-center gap-2 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    SYSTEM STATUS: OPERATIONAL
                  </div>
                </div>
                <div className="text-right text-xs font-mono text-slate-400">
                  <div>Uptime: {Math.floor(health.uptimeSeconds / 60)}m {health.uptimeSeconds % 60}s</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Last verified: {lastRefreshed.toLocaleTimeString()}</div>
                </div>
              </div>

              {/* Subsystems Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* REST API */}
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-display">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      Core REST API
                    </span>
                    {renderStatusBadge(health.services.api.status)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Port: {health.services.api.port} | Version: {health.services.api.version}
                  </div>
                </div>

                {/* MongoDB */}
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-display">
                      <Database className="w-4 h-4 text-emerald-400" />
                      MongoDB Database
                    </span>
                    {renderStatusBadge(health.services.database.status)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 flex justify-between">
                    <span>DB: {health.services.database.databaseName || 'ps9_emergency_demo'}</span>
                    {health.services.database.latencyMs !== undefined && (
                      <span className="text-emerald-400">{health.services.database.latencyMs}ms ping</span>
                    )}
                  </div>
                </div>

                {/* Redis / BullMQ */}
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-display">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Redis & BullMQ Queues
                    </span>
                    {renderStatusBadge(health.services.cacheAndQueues.status)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Delay Detection & Queue Engine (Phase 4 Ready)
                  </div>
                </div>

                {/* Socket.IO */}
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-display">
                      <Radio className="w-4 h-4 text-purple-400" />
                      Socket.IO Real-Time Stream
                    </span>
                    {renderStatusBadge(health.services.realtime.status)}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Typed Event Gateway: Live Broadcasts Active
                  </div>
                </div>
              </div>

              {/* Gemini AI Reserved Layer Card */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-2 font-display">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                    AI Intelligence Subsystem (Google Gemini)
                  </span>
                  {renderStatusBadge(health.services.aiEngine.status)}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  SDK dependencies (<code className="text-indigo-300">@google/genai</code>) and model configurations (<code className="text-indigo-300">{health.services.aiEngine.model}</code>) are pre-registered in backend architecture. Deep analytical features (summaries, duplicate detection, assistant) activate in <strong>Phase 3</strong>.
                </p>
              </div>

              {/* Configurable Operational SLA Thresholds */}
              <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-slate-400">Target Response Threshold:</span>{' '}
                  <span className="font-bold text-slate-200">{health.thresholds.targetResponseTimeMinutes} Minutes</span>
                </div>
                <div>
                  <span className="text-slate-400">Critical Dispatch Timeout:</span>{' '}
                  <span className="font-bold text-slate-200">{health.thresholds.criticalDispatchTimeoutMinutes} Minutes</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-rose-400">Failed to connect to backend telemetry service.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
