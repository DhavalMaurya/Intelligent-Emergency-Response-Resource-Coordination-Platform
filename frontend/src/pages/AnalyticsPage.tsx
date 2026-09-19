import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Download, Filter, Calendar } from 'lucide-react';
import { OperationalCharts } from '../components/dashboard/OperationalCharts';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [chartsData, setChartsData] = useState<any>({
    incidentTrend: [],
    severityDistribution: [],
    incidentsByType: [],
    responseTimeBySector: [],
    resourceUtilization: [],
    delayedBreakdown: [],
    zoneDensity: [],
  });
  const [kpis, setKpis] = useState<any>({});

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/analytics/overview?timeRange=${timeRange}`);
      if (res.data?.data) {
        setChartsData(res.data.data.charts);
        setKpis(res.data.data.kpis);
      }
    } catch (err) {
      console.error('[Analytics] Error loading analytics data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-rose-500" />
            OPERATIONAL ANALYTICS & HISTORICAL PERFORMANCE
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Dispatch Velocity, Fleet Readiness Trends & Geographic Risk Clusters
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs font-mono">
            {['1h', '6h', '24h', '7d', 'all'].map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={`px-3 py-1 rounded transition-colors ${
                  timeRange === t ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="secondary"
            icon={<Download className="w-3.5 h-3.5 text-slate-300" />}
            onClick={() => alert('Exporting operational analytics summary report (CSV/PDF)...')}
          >
            Export Telemetry
          </Button>
        </div>
      </div>

      {/* Overview Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Tracked Incidents</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{kpis.activeIncidents || 0}</div>
          <span className="text-[10px] text-emerald-400 font-mono">Across 5 Sectors</span>
        </Card>

        <Card className="p-4 bg-slate-900">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Critical Caseload</span>
          <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{kpis.criticalIncidents || 0}</div>
          <span className="text-[10px] text-rose-400 font-mono">Immediate Priority</span>
        </Card>

        <Card className="p-4 bg-slate-900">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Fleet Utilization</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{kpis.resourcesInUse || 0} / {((kpis.availableResources || 0) + (kpis.resourcesInUse || 0))}</div>
          <span className="text-[10px] text-slate-400 font-mono">Units Deployed</span>
        </Card>

        <Card className="p-4 bg-slate-900">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Average Dispatch Velocity</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{kpis.averageResponseTime || 6.4}m</div>
          <span className="text-[10px] text-emerald-400 font-mono">Target: &lt;{kpis.targetThresholdMinutes || 8}m SLA</span>
        </Card>
      </div>

      {/* Main Charts Suite */}
      {loading ? (
        <LoadingSkeleton count={3} height="h-72" />
      ) : (
        <OperationalCharts data={chartsData} targetResponseMinutes={kpis.targetThresholdMinutes} />
      )}
    </div>
  );
};
