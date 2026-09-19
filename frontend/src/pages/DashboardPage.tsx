import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar';
import { KpiRow } from '../components/dashboard/KpiRow';
import { LiveMap } from '../components/dashboard/LiveMap';
import { CriticalAlertsPanel } from '../components/dashboard/CriticalAlertsPanel';
import { LiveIncidentFeed } from '../components/dashboard/LiveIncidentFeed';
import { OperationalCharts } from '../components/dashboard/OperationalCharts';
import { ResourceAvailabilityPanel } from '../components/dashboard/ResourceAvailabilityPanel';
import { AiSituationSummary } from '../components/dashboard/AiSituationSummary';
import { ScenarioSimulatorBar } from '../components/dashboard/ScenarioSimulatorBar';
import { CreateIncidentModal } from '../components/modals/CreateIncidentModal';
import { CorrelationReviewModal } from '../components/modals/CorrelationReviewModal';
import { IncidentDetailDrawer } from '../components/detail/IncidentDetailDrawer';
import { ResourceDetailDrawer } from '../components/detail/ResourceDetailDrawer';
import { useFilters } from '../context/FilterContext';
import { useSocket } from '../context/SocketContext';
import { Incident, Resource, AlertNotification, KPIOverview } from '../types';
import { Radio, Zap, Link2, Bell, AlertTriangle, ShieldCheck } from 'lucide-react';

interface LiveEventNotification {
  id: string;
  type: 'INCIDENT' | 'CORRELATION' | 'SEVERITY' | 'REPORT' | 'SENSOR' | 'ALERT';
  title: string;
  message: string;
  timestamp: string;
}

export const DashboardPage: React.FC = () => {
  const { filters } = useFilters();
  const { socket, lastIncidentUpdate, lastResourceUpdate, lastAlert } = useSocket();
  const outletContext = useOutletContext<{
    openCreateModal?: () => void;
    isCreateOpen?: boolean;
    setIsCreateOpen?: (val: boolean) => void;
  }>();

  const [loading, setLoading] = useState<boolean>(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
  const [liveNotifications, setLiveNotifications] = useState<LiveEventNotification[]>([]);
  const [kpis, setKpis] = useState<KPIOverview>({
    activeIncidents: 0,
    criticalIncidents: 0,
    highPriorityIncidents: 0,
    delayedResponses: 0,
    availableResources: 0,
    resourcesInUse: 0,
    escalatedIncidents: 0,
    averageResponseTime: 6.4,
    targetThresholdMinutes: 8,
  });
  const [chartsData, setChartsData] = useState<any>({
    incidentTrend: [],
    severityDistribution: [],
    incidentsByType: [],
    responseTimeBySector: [],
    resourceUtilization: [],
    delayedBreakdown: [],
    zoneDensity: [],
  });

  // Modal & Drawer states
  const [localCreateOpen, setLocalCreateOpen] = useState(false);
  const isCreateModalOpen = outletContext?.isCreateOpen ?? localCreateOpen;
  const setCreateModalOpen = outletContext?.setIsCreateOpen ?? setLocalCreateOpen;

  const [correlationModalData, setCorrelationModalData] = useState<any | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.timeRange !== 'all') params.append('timeRange', filters.timeRange);
      if (filters.severity !== 'ALL') params.append('severity', filters.severity);
      if (filters.type !== 'ALL') params.append('type', filters.type);
      if (filters.status !== 'ALL') params.append('status', filters.status);
      if (filters.zone !== 'ALL') params.append('zone', filters.zone);

      const [overviewRes, incidentsRes, resourcesRes] = await Promise.all([
        axios.get(`/api/v1/analytics/overview?${params.toString()}`),
        axios.get(`/api/v1/incidents?${params.toString()}&limit=50`),
        axios.get('/api/v1/resources?limit=50'),
      ]);

      if (overviewRes.data?.data) {
        setKpis(overviewRes.data.data.kpis);
        setChartsData(overviewRes.data.data.charts);
        setAlerts(overviewRes.data.data.criticalAlerts || []);
      }

      if (incidentsRes.data?.data?.incidents) {
        setIncidents(incidentsRes.data.data.incidents);
      }

      if (resourcesRes.data?.data?.resources) {
        setResources(resourcesRes.data.data.resources);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch live data', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Reactive Socket.IO Real-Time Propagation (Zero Page Refresh)
  useEffect(() => {
    if (!socket) return;

    const onIncidentCreated = (newInc: any) => {
      const formatted: Incident = {
        _id: newInc.id || newInc._id,
        incidentNumber: newInc.incidentNumber,
        title: newInc.title,
        description: newInc.description,
        type: newInc.type,
        severity: newInc.severity,
        priority: newInc.priority,
        status: newInc.status,
        location: newInc.location,
        casualtiesCount: newInc.casualtiesCount || 0,
        hazardLevel: newInc.hazardLevel || 'STANDARD',
        tags: newInc.tags || [],
        assignedResources: newInc.assignedResources || [],
        linkedReportIds: newInc.linkedReportIds || [],
        telemetryReadings: newInc.telemetryReadings || [],
        createdAt: newInc.createdAt,
        updatedAt: newInc.updatedAt,
      };

      setIncidents((prev) => [formatted, ...prev.filter((i) => i._id !== formatted._id)]);
      setKpis((prev) => ({
        ...prev,
        activeIncidents: prev.activeIncidents + 1,
        criticalIncidents: newInc.severity === 'CRITICAL' ? prev.criticalIncidents + 1 : prev.criticalIncidents,
        highPriorityIncidents: newInc.severity === 'HIGH' ? prev.highPriorityIncidents + 1 : prev.highPriorityIncidents,
      }));

      setLiveNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'INCIDENT',
          title: `New Incident Logged: ${newInc.incidentNumber}`,
          message: `${newInc.title} (${newInc.severity}) in ${newInc.location?.zone || 'Metro'}`,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    };

    const onIncidentCorrelated = (payload: any) => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc._id === payload.masterIncidentId) {
            const currentLinked = inc.linkedReportIds || [];
            return {
              ...inc,
              linkedReportIds: payload.reportId ? [...currentLinked, payload.reportId] : currentLinked,
            };
          }
          if (payload.mergedIncidentId && inc._id === payload.mergedIncidentId) {
            return { ...inc, status: 'MERGED' };
          }
          return inc;
        })
      );

      setLiveNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'CORRELATION',
          title: 'Correlation Engine Link Verified',
          message: payload.message,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    };

    const onSeverityUpdated = (payload: any) => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc._id === payload.incidentId) {
            return {
              ...inc,
              severity: payload.newSeverity,
              priority: payload.newPriority,
            };
          }
          return inc;
        })
      );

      setLiveNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'SEVERITY',
          title: 'Severity Reassessed by Engine',
          message: `Incident severity updated from ${payload.previousSeverity} to ${payload.newSeverity} (${payload.score}/100)`,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    };

    const onStatusUpdated = (payload: any) => {
      setIncidents((prev) =>
        prev.map((inc) => {
          if (inc._id === payload.incidentId) {
            return {
              ...inc,
              status: payload.newStatus,
            };
          }
          return inc;
        })
      );
    };

    const onReportCreated = (report: any) => {
      setLiveNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'REPORT',
          title: `Citizen Report Received: ${report.reportNumber}`,
          message: `${report.category}: "${report.rawText?.slice(0, 60)}..." (Status: ${report.status})`,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    };

    const onSensorReading = (payload: any) => {
      setLiveNotifications((prev) => [
        {
          id: Date.now().toString(),
          type: 'SENSOR',
          title: `Sensor Telemetry Reading: ${payload.sensorCode}`,
          message: `Reading: ${payload.reading} ${payload.unit} (${payload.status}) in ${payload.zone}. Telemetry stream updated.`,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev.slice(0, 4),
      ]);
    };

    const onAlertCreated = (alert: any) => {
      setAlerts((prev) => [alert, ...prev]);
    };

    socket.on('incident.created', onIncidentCreated);
    socket.on('incident.correlated', onIncidentCorrelated);
    socket.on('incident.severity.updated', onSeverityUpdated);
    socket.on('incident.status.updated', onStatusUpdated);
    socket.on('report.created', onReportCreated);
    socket.on('sensor.reading', onSensorReading);
    socket.on('alert.created', onAlertCreated);

    return () => {
      socket.off('incident.created', onIncidentCreated);
      socket.off('incident.correlated', onIncidentCorrelated);
      socket.off('incident.severity.updated', onSeverityUpdated);
      socket.off('incident.status.updated', onStatusUpdated);
      socket.off('report.created', onReportCreated);
      socket.off('sensor.reading', onSensorReading);
      socket.off('alert.created', onAlertCreated);
    };
  }, [socket]);

  // Also refresh overview on background triggers
  useEffect(() => {
    if (lastIncidentUpdate || lastResourceUpdate || lastAlert) {
      fetchDashboardData();
    }
  }, [lastIncidentUpdate, lastResourceUpdate, lastAlert, fetchDashboardData]);

  const handleAcknowledgeAlert = async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a._id !== alertId));
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Global Filter Bar */}
      <DashboardFilterBar />

      <div className="p-6 space-y-6 flex-1">
        {/* Hackathon Interactive Scenario Simulator Bar */}
        <ScenarioSimulatorBar />

        {/* Real-time Ticker / Live Ingestion Stream Banner */}
        {liveNotifications.length > 0 && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold">
              <Radio className="w-4 h-4 animate-pulse" />
              <span>LIVE INGESTION STREAM (ZERO-REFRESH):</span>
            </div>
            <div className="flex-1 mx-4 overflow-hidden">
              <div className="flex items-center gap-4 text-slate-300 truncate">
                <span className="font-bold text-slate-100">{liveNotifications[0].title}</span>
                <span className="text-slate-400">— {liveNotifications[0].message}</span>
                <span className="text-[10px] text-slate-500 font-mono">({liveNotifications[0].timestamp})</span>
              </div>
            </div>
            <button
              onClick={() => setLiveNotifications([])}
              className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {/* KPI Situational Row */}
        <KpiRow kpis={kpis} loading={loading} />

        {/* Tactical Command Split: Live Operations Map & Side Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Map View (8 cols on desktop) */}
          <div className="lg:col-span-8 space-y-6">
            <LiveMap
              incidents={incidents}
              resources={resources}
              onSelectIncident={(inc) => setSelectedIncidentId(inc._id)}
              onSelectResource={(res) => setSelectedResourceId(res._id)}
              height="h-[480px]"
            />

            {/* Operational Analytics Charts Suite */}
            <OperationalCharts data={chartsData} targetResponseMinutes={kpis.targetThresholdMinutes} />
          </div>

          {/* Right Operational Feeds & AI Briefing (4 cols on desktop) */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Situation Briefing */}
            <AiSituationSummary
              criticalCount={kpis.criticalIncidents}
              delayedCount={kpis.delayedResponses}
              mostUrgentIncidentId={incidents.find((i) => i.severity === 'CRITICAL')?._id}
              onInspectUrgent={(id) => setSelectedIncidentId(id)}
            />

            {/* Critical Alerts Queue */}
            <CriticalAlertsPanel
              alerts={alerts}
              onAcknowledgeAlert={handleAcknowledgeAlert}
              onInspectAlert={(incId) => incId && setSelectedIncidentId(incId)}
            />

            {/* Resource Fleet Availability */}
            <ResourceAvailabilityPanel
              resources={resources}
              onSelectResource={(res) => setSelectedResourceId(res._id)}
            />

            {/* Live Streaming Incident Feed */}
            <LiveIncidentFeed
              incidents={incidents}
              onSelectIncident={(inc) => setSelectedIncidentId(inc._id)}
            />
          </div>
        </div>
      </div>

      {/* Operator Rapid Call Intake Modal */}
      <CreateIncidentModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        activeIncidents={incidents}
        onIncidentCreated={(newInc) => {
          setIncidents((prev) => [newInc, ...prev]);
        }}
      />

      {/* Human Operator Duplicate Correlation / Merge Review Modal */}
      <CorrelationReviewModal
        isOpen={Boolean(correlationModalData)}
        correlationData={correlationModalData}
        onClose={() => setCorrelationModalData(null)}
        onResolved={() => {
          fetchDashboardData();
          setCorrelationModalData(null);
        }}
      />

      {/* Slide-over Deep Investigation Drawers */}
      <IncidentDetailDrawer
        incidentId={selectedIncidentId}
        isOpen={Boolean(selectedIncidentId)}
        onClose={() => setSelectedIncidentId(null)}
        onIncidentUpdated={fetchDashboardData}
      />

      <ResourceDetailDrawer
        resourceId={selectedResourceId}
        isOpen={Boolean(selectedResourceId)}
        onClose={() => setSelectedResourceId(null)}
        onResourceUpdated={fetchDashboardData}
      />
    </div>
  );
};
