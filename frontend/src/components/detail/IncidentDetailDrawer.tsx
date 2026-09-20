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
  Sparkles,
  Award,
} from 'lucide-react';
import { Incident, Report, Sensor, AuditEntry, Resource } from '../../types';
import { Drawer } from '../ui/Drawer';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { RoleGate } from '../ui/RoleGate';
import { useAuth } from '../../context/AuthContext';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';
import { ResourceRecommendationCard } from '../resources/ResourceRecommendationCard';
import { ResponseTimeline } from './ResponseTimeline';

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

  // Phase 3 AI States
  const [aiSummary, setAiSummary] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState<boolean>(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState<boolean>(false);

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
      setAiSummary(null);
      setRecommendations([]);
      setSelectedAction('');
      setActionReason('');
    }
  }, [isOpen, incidentId]);

  const handleGenerateSummary = async () => {
    if (!incidentId) return;
    setSummaryLoading(true);
    try {
      const res = await axios.post(`/api/v1/ai/summarize/${incidentId}`);
      if (res.data?.data) {
        setAiSummary(res.data.data);
      }
    } catch (err: any) {
      console.error('[AI Summary Error]', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleFetchRecommendations = async () => {
    if (!incidentId) return;
    setRecommendationsLoading(true);
    try {
      const res = await axios.post('/api/v1/ai/recommend-resources', { incidentId });
      if (res.data?.data?.recommendations) {
        setRecommendations(res.data.data.recommendations);
      }
    } catch (err: any) {
      console.error('[AI Recommendations Error]', err);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const handleHumanDispatchConfirm = async (resourceId: string, callSign: string) => {
    if (!incident) return;
    try {
      setActionLoading(true);
      await axios.patch(`/api/v1/incidents/${incident._id}/action`, {
        action: 'ASSIGN_RESOURCE',
        resourceId,
        reason: `Operator confirmed dispatch of recommended unit ${callSign} via SENTINEL AI Optimization Engine.`,
      });
      await fetchIncidentDetails();
      onIncidentUpdated?.();
      handleFetchRecommendations();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to dispatch unit');
    } finally {
      setActionLoading(false);
    }
  };

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
              <span className="text-slate-500 block text-[10px] uppercase">Response Delay</span>
              <span className="font-bold text-cyan-400">
                {incident.responseMetrics?.dispatchDelayMinutes || 4}m dispatch
              </span>
            </div>
          </div>

          {/* Phase 4 Visual Response SLA Timeline */}
          <ResponseTimeline incident={incident} />

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

          {/* Phase 3 Grounded AI Situation Summary */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-extrabold text-indigo-200">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>GROUNDED AI SITUATION SUMMARY</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                icon={<Sparkles className="w-3.5 h-3.5" />}
              >
                {summaryLoading ? 'Synthesizing...' : 'Generate Grounded AI Briefing'}
              </Button>
            </div>

            {aiSummary ? (
              <div className="space-y-2.5 text-xs text-slate-200 font-sans">
                <p className="p-2.5 rounded bg-slate-900/90 border border-slate-800 leading-relaxed text-indigo-200 font-medium">
                  {aiSummary.operationalOverview}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-emerald-400 block uppercase">Confirmed Facts</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {aiSummary.confirmedFacts?.map((f: string, i: number) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-amber-400 block uppercase">Key Risks</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {aiSummary.keyRisks?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-mono font-bold text-sky-400 block uppercase">Uncertainties</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {aiSummary.uncertainties?.map((u: string, i: number) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Click "Generate Grounded AI Briefing" to synthesize live multi-source reports and sensor telemetry into operational overview.
              </p>
            )}
          </div>

          {/* Phase 3 Ranked Resource Recommendations */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-display text-sm font-extrabold text-slate-100">
                <Award className="w-4 h-4 text-emerald-400" />
                <span>AI RANKED RESOURCE RECOMMENDATIONS</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleFetchRecommendations}
                disabled={recommendationsLoading}
              >
                {recommendationsLoading ? 'Calculating Scores...' : 'Fetch Recommendations'}
              </Button>
            </div>

            {recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((item, idx) => (
                  <ResourceRecommendationCard
                    key={item.resourceId}
                    item={item}
                    rank={idx + 1}
                    onDispatchConfirm={handleHumanDispatchConfirm}
                  />
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Click "Fetch Recommendations" to run 100-point multi-factor resource scoring and urban speed ETA model.
              </p>
            )}
          </div>

          {/* Operator Action Controls */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-100 font-display uppercase tracking-wide flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                MANUAL OPERATOR ACTIONS & AUDIT TRAIL
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
                  Manual Unit Dispatch
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
