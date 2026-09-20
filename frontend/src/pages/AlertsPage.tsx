import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  CheckCircle,
  Radio,
  Clock,
  Filter,
  CheckCircle2,
  Send,
  Zap,
  Tag,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  level: 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'DELAY_BREACH' | 'RESOURCE_SHORTAGE' | 'ESCALATION' | 'HAZARD_ALERT' | 'SYSTEM_ALERT';
  zone?: string;
  acknowledged: boolean;
  acknowledgedBy?: any;
  acknowledgedAt?: string;
  relatedIncidentId?: any;
  createdAt: string;
}

export const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unacknowledgedCount, setUnacknowledgedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [showUnacknowledgedOnly, setShowUnacknowledgedOnly] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [showUnacknowledgedOnly, selectedType]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      fetchNotifications();
    };

    const handleNewAlert = (data: any) => {
      fetchNotifications();
    };

    socket.on('notification.created', handleNewNotification);
    socket.on('alert.created', handleNewAlert);

    return () => {
      socket.off('notification.created', handleNewNotification);
      socket.off('alert.created', handleNewAlert);
    };
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (showUnacknowledgedOnly) params.acknowledged = 'false';
      if (selectedType !== 'ALL') params.type = selectedType;

      const res = await axios.get('/api/v1/notifications', { params });
      if (res.data?.data) {
        setNotifications(res.data.data.notifications || []);
        setUnacknowledgedCount(res.data.data.unacknowledgedCount || 0);
      }
    } catch (err) {
      console.error('[Alerts] Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      setActionLoadingId(id);
      await axios.patch(`/api/v1/notifications/${id}/acknowledge`);
      await fetchNotifications();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to acknowledge notification');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'DELAY_BREACH':
        return <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-mono text-[10px]">SLA Delay Breach</span>;
      case 'RESOURCE_SHORTAGE':
        return <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono text-[10px]">Resource Shortage</span>;
      case 'ESCALATION':
        return <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-mono text-[10px]">Supervisor Escalation</span>;
      case 'SENSOR_ALERT':
        return <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 font-mono text-[10px]">Sensor Spike Alert</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[10px]">System Alert</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            EOC ESCALATION CENTER & SYSTEM ALERTS
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-Time SLA Delays, Resource Shortages & Critical Telemetry Warnings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800/80 font-mono text-xs text-rose-300 font-bold flex items-center gap-1.5">
            <Bell className="w-4 h-4 text-rose-400 animate-pulse" />
            {unacknowledgedCount} Unacknowledged Alert(s)
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex items-center gap-2 overflow-x-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-slate-500 uppercase">Alert Type:</span>
          {['ALL', 'DELAY_BREACH', 'RESOURCE_SHORTAGE', 'ESCALATION', 'SENSOR_ALERT'].map((t) => (
            <button
              key={t}
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded border transition-colors ${
                selectedType === t
                  ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
          <input
            type="checkbox"
            checked={showUnacknowledgedOnly}
            onChange={(e) => setShowUnacknowledgedOnly(e.target.checked)}
            className="rounded bg-slate-900 border-slate-800 text-rose-600 focus:ring-0"
          />
          <span>Show Unacknowledged Only</span>
        </label>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 font-mono animate-pulse">
            Fetching active system escalation stream...
          </div>
        ) : notifications.length === 0 ? (
          <Card bodyClassName="p-8 text-center space-y-2">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-200 font-display">No System Escalations Active</h3>
            <p className="text-xs text-slate-400 font-mono">All response SLAs compliant and resources fully operational.</p>
          </Card>
        ) : (
          notifications.map((item) => (
            <div
              key={item._id}
              className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                !item.acknowledged
                  ? 'bg-slate-900/90 border-rose-800/80 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {getTypeBadge(item.type)}
                  {item.zone && (
                    <span className="text-xs font-mono font-bold text-slate-300">
                      Zone: {item.zone}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(item.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-100 font-display flex items-center gap-2">
                  {!item.acknowledged && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  {item.title}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.message}</p>
              </div>

              {/* Action Bar */}
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono">
                <div>
                  {item.acknowledged ? (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged by {item.acknowledgedBy?.name || 'Operator'}
                    </span>
                  ) : (
                    <span className="text-[11px] text-rose-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Requires Operator Action
                    </span>
                  )}
                </div>

                {!item.acknowledged && (
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actionLoadingId === item._id}
                    onClick={() => handleAcknowledge(item._id)}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    {actionLoadingId === item._id ? 'Acknowledging...' : 'Acknowledge Alert'}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
