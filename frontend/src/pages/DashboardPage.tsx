import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { DashboardFilterBar } from '../components/dashboard/DashboardFilterBar';
import { KpiRow } from '../components/dashboard/KpiRow';
import { LiveMap } from '../components/dashboard/LiveMap';
import { CriticalAlertsPanel } from '../components/dashboard/CriticalAlertsPanel';
import { LiveIncidentFeed } from '../components/dashboard/LiveIncidentFeed';
import { OperationalCharts } from '../components/dashboard/OperationalCharts';
import { ResourceAvailabilityPanel } from '../components/dashboard/ResourceAvailabilityPanel';
import { AiSituationSummary } from '../components/dashboard/AiSituationSummary';
import { IncidentDetailDrawer } from '../components/detail/IncidentDetailDrawer';
import { ResourceDetailDrawer } from '../components/detail/ResourceDetailDrawer';
import { useFilters } from '../context/FilterContext';
import { useSocket } from '../context/SocketContext';
import { Incident, Resource, AlertNotification, KPIOverview } from '../types';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const DashboardPage: React.FC = () => {
  const { filters } = useFilters();
  const { lastIncidentUpdate, lastResourceUpdate, lastAlert } = useSocket();

  const [loading, setLoading] = useState<boolean>(true);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [alerts, setAlerts] = useState<AlertNotification[]>([]);
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

  // Drawer states
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

  // Reactive Socket.IO updates
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
