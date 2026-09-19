import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  ShieldAlert,
  Clock,
  MapPin,
  Users,
  Activity,
  CheckCircle,
  Flame,
  Radio,
  FileText,
  Thermometer,
  Wind,
  Droplets,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
  Send,
} from 'lucide-react';
import { Incident, Report, Sensor, AuditEntry, Resource } from '../../types';
import { Drawer } from '../ui/Drawer';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RoleGate } from '../ui/RoleGate';
import { useAuth } from '../../context/AuthContext';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface IncidentDetailDrawerProps {
  incidentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onIncidentUpdated?: () => void;
}

export const IncidentDetailDrawer: React.FC<IncidentDetailDrawerProps> = ({
  incidentId,
  isOpen,
  onClose,
  onIncidentUpdated,
}) => {
  const { user } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditEntry[]>([]);
  const [availableResources, setAvailableResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form states for operator actions
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('');
  const [newSeverity, setNewSeverity] = useState<string>('CRITICAL');
  const [actionReason, setActionReason] = useState<string>('');

  const fetchIncidentDetails = async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      const [detailRes, resourceRes] = await Promise.all([
        axios.get(`/api/v1/incidents/${incidentId}`),
        axios.get('/api/v1/resources?status=AVAILABLE'),
      ]);

      if (detailRes.data?.data) {
        setIncident(detailRes.data.data.incident);
        setReports(detailRes.data.data.reports || []);
        setSensors(detailRes.data.data.zoneSensors || []);
        setAuditTrail(detailRes.data.data.auditTrail || []);
      }

      if (resourceRes.data?.data?.resources) {
        setAvailableResources(resourceRes.data.data.resources);
      }
    } catch (err) {
      console.error('[Detail] Error fetching incident details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && incidentId) {
      fetchIncidentDetails();
      setSelectedAction('');
      setActionReason('');
    }
  }, [isOpen, incidentId]);

  const handleExecuteAction = async (action: string) => {
    if (!incident) return;
    try {
      setActionLoading(true);
      const payload: any = { action, reason: actionReason };

      if (action === 'ASSIGN_RESOURCE') {
        payload.resourceId = selectedResourceId;
      } else if (action === 'CHANGE_SEVERITY') {
        payload.newSeverity = newSeverity;
      }

      await axios.patch(`/api/v1/incidents/${incident._id}/action`, payload);
      await fetchIncidentDetails();
      onIncidentUpdated?.();
      setSelectedAction('');
      setActionReason('');
    } catch (err: any) {
      console.error('[Action Error]', err);
      alert(err.response?.data?.error?.message || 'Failed to execute action');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        incident ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-base">{incident.incidentNumber}</span>
            <SeverityBadge severity={incident.severity} size="sm" />
          </span>
        ) : (
          'Incident Details'
        )
      }
      subtitle={incident?.title}
      badge={incident ? <StatusBadge status={incident.status} size="sm" /> : undefined}
      width="xl"
    >
      {loading || !incident ? (
        <LoadingSkeleton count={5} height="h-28" />
      ) : (
        <div className="space-y-6">
          {/* Top Operational Metrics & Location */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Zone / Sector</span>
              <span className="font-bold text-slate-200">{incident.location.zone}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Casualties</span>
              <span className="font-bold text-rose-400">{incident.casualtiesCount} Confirmed</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Hazard Level</span>
              <span className="font-bold text-amber-400">{incident.hazardLevel}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Response Time</span>
              <span className="font-bold text-cyan-400">
                {incident.responseMetrics?.dispatchDelayMinutes || 4}m dispatch
              </span>
            </div>
          </div>

          {/* Description & Address */}
          <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>{incident.location.address}</span>
              <span className="text-slate-600">
                [{incident.location.coordinates[1].toFixed(4)}, {incident.location.coordinates[0].toFixed(4)}]
              </span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">{incident.description}</p>
          </div>

          {/* AI Situation Briefing */}
          {incident.aiSummary && (
            <div className="p-3.5 rounded-lg bg-indigo-950/30 border border-indigo-900/60 space-y-1">
              <div className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                AI Telemetry Synthesis Briefing
              </div>
              <p className="text-xs text-indigo-200 leading-relaxed">{incident.aiSummary}</p>
            </div>
          )}

          {/* Operator Action Bar & Audit Trail */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 font-display uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                OPERATOR ACTION CONTROLS & AUDIT TRAIL
              </span>
              <span className="text-[10px] font-mono text-slate-500">Active Role: {user?.role}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <RoleGate allowedRoles={['OPERATOR', 'CONTROL_ROOM', 'ADMIN']}>
                <Button
                  size="sm"
                  variant={selectedAction === 'ACKNOWLEDGE' ? 'primary' : 'outline'}
                  onClick={() => setSelectedAction('ACKNOWLEDGE')}
                >
                  Acknowledge Call
                </Button>
              </RoleGate>

              <RoleGate allowedRoles={['OPERATOR', 'CONTROL_ROOM', 'ADMIN']}>
                <Button
                  size="sm"
                  variant={selectedAction === 'ASSIGN_RESOURCE' ? 'primary' : 'outline'}
                  onClick={() => setSelectedAction('ASSIGN_RESOURCE')}
                >
                  Dispatch Unit
                </Button>
              </RoleGate>

              <RoleGate allowedRoles={['CONTROL_ROOM', 'ADMIN']}>
                <Button
                  size="sm"
                  variant={selectedAction === 'CHANGE_SEVERITY' ? 'primary' : 'outline'}
                  onClick={() => setSelectedAction('CHANGE_SEVERITY')}
                >
                  Override Severity
                </Button>
              </RoleGate>

              <RoleGate allowedRoles={['CONTROL_ROOM', 'ADMIN']}>
                <Button
                  size="sm"
                  variant={selectedAction === 'ESCALATE' ? 'urgent' : 'outline'}
                  onClick={() => setSelectedAction('ESCALATE')}
                >
                  Escalate Incident
                </Button>
              </RoleGate>

              <RoleGate allowedRoles={['OPERATOR', 'CONTROL_ROOM', 'ADMIN']}>
                <Button
                  size="sm"
                  variant={selectedAction === 'RESOLVE' ? 'secondary' : 'outline'}
                  onClick={() => setSelectedAction('RESOLVE')}
                >
                  Mark Resolved
                </Button>
              </RoleGate>
            </div>

            {/* Expanded Action Form */}
            {selectedAction && (
              <div className="mt-3 p-3 rounded-lg bg-slate-900 border border-slate-700/80 space-y-3">
                <div className="text-xs font-bold text-slate-200">
                  Executing Action:{' '}
                  <span className="font-mono text-rose-400">{selectedAction.replace(/_/g, ' ')}</span>
                </div>

                {selectedAction === 'ASSIGN_RESOURCE' && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Select Available Unit to Dispatch:</label>
                    <select
                      value={selectedResourceId}
                      onChange={(e) => setSelectedResourceId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-2 text-slate-200"
                    >
                      <option value="">-- Choose Unit --</option>
                      {availableResources.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.identifier} - {r.name} ({r.zone})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedAction === 'CHANGE_SEVERITY' && (
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Select New Severity Level:</label>
                    <select
                      value={newSeverity}
                      onChange={(e) => setNewSeverity(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-2 text-slate-200"
                    >
                      <option value="CRITICAL">CRITICAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Operational Reason / Notes (Audit Log):</label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Enter justification for audit log..."
                    className="w-full bg-slate-950 border border-slate-800 text-xs rounded p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedAction('')}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actionLoading || (selectedAction === 'ASSIGN_RESOURCE' && !selectedResourceId)}
                    onClick={() => handleExecuteAction(selectedAction)}
                  >
                    {actionLoading ? 'Recording...' : 'Confirm & Log Action'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Assigned Fleet Units */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              Assigned Response Units ({incident.assignedResources?.length || 0})
            </span>
            {(!incident.assignedResources || incident.assignedResources.length === 0) ? (
              <div className="p-3 text-xs text-rose-400 bg-rose-950/20 border border-rose-900/40 rounded-lg">
                No fleet units currently assigned. Dispatch required.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {incident.assignedResources.map((res: any) => (
                  <div key={res._id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-200">{res.identifier}</span>
                      <div className="text-[11px] text-slate-400">{res.name}</div>
                    </div>
                    <StatusBadge status={res.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Telemetry Sensor Readings */}
          {sensors.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
                Zone Telemetry Sensors
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sensors.map((s) => (
                  <div key={s._id} className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[10px]">{s.sensorCode}</span>
                      <span
                        className={`text-[9px] px-1 rounded ${
                          s.status === 'CRITICAL'
                            ? 'bg-rose-950 text-rose-300'
                            : s.status === 'WARNING'
                            ? 'bg-amber-950 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-100">
                      {s.currentReading} <span className="text-xs font-normal text-slate-400">{s.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consolidated Reports Stream */}
          {reports.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
                Supporting Call & Citizen Reports ({reports.length})
              </span>
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r._id} className="p-3 rounded bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Source: <strong className="text-slate-300">{r.source}</strong></span>
                      <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-sans">{r.rawText}</p>
                    {r.callerInfo?.name && (
                      <div className="text-[10px] text-slate-500 font-mono">
                        Caller: {r.callerInfo.name} ({r.callerInfo.phone || 'Private'})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Complete Operator Audit Trail */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              Official Incident Audit Trail ({auditTrail.length} entries)
            </span>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {auditTrail.map((entry) => (
                <div key={entry._id} className="p-2.5 rounded bg-slate-950/60 border border-slate-800/80 text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-slate-300">
                      {entry.actorName} ({entry.actorRole})
                    </span>
                    <span className="text-slate-500">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200 font-medium">{entry.summary}</div>
                  {entry.reason && (
                    <div className="text-[11px] text-slate-400 italic">Reason: "{entry.reason}"</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
};
