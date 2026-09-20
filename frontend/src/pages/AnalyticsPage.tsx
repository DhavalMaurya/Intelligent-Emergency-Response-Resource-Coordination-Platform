import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Download, Clock, AlertTriangle, Cpu, TrendingUp, ShieldCheck, Zap } from 'lucide-react';
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
  
  // Phase 5 State
  const [shortageType, setShortageType] = useState<string>('AMBULANCE');
  const [shortageData, setShortageData] = useState<any>(null);
  const [loadingShortage, setLoadingShortage] = useState<boolean>(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState<boolean>(false);

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

  const fetchShortageForecast = async (type: string) => {
    try {
      setLoadingShortage(true);
      const res = await axios.get(`/api/v1/analytics/shortage-forecast?resourceType=${type}&forecastWindowMinutes=60`);
      if (res.data?.data) {
        setShortageData(res.data.data);
      }
    } catch (err) {
      console.error('[Analytics] Error fetching shortage forecast', err);
    } finally {
      setLoadingShortage(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      setLoadingInsights(true);
      const res = await axios.get('/api/v1/analytics/insights');
      if (res.data?.data) {
        setAiInsights(res.data.data);
      }
    } catch (err) {
      console.error('[Analytics] Error fetching AI insights', err);
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    fetchShortageForecast(shortageType);
    fetchAIInsights();
  }, [timeRange]);

  const handleShortageTypeChange = (type: string) => {
    setShortageType(type);
    fetchShortageForecast(type);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-rose-500" />
            OPERATIONAL ANALYTICS & AI PREDICTIVE INSIGHTS
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Predictive Deficit Forecasting, SLA Compliance Tracking & Operational AI Briefings
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

      {/* KPI Overview Grid with Dual SLA Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-slate-900 border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Total Tracked Incidents</span>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1">{kpis.activeIncidents || 0}</div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3 h-3" /> Across Active Sectors
          </span>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">5-Min Dispatch SLA</span>
          <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">{kpis.dispatchSLAAverage || '3.2m'}</div>
          <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-1">
            <Zap className="w-3 h-3" /> Target: &le; 5.0m Dispatch SLA
          </span>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">8-Min Total Response KPI</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{kpis.averageResponseTime || 6.4}m</div>
          <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" /> Target: &le; 8.0m Scene Arrival KPI
          </span>
        </Card>

        <Card className="p-4 bg-slate-900 border-slate-800">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Fleet Availability</span>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {kpis.availableResources || 0} / {((kpis.availableResources || 0) + (kpis.resourcesInUse || 0))}
          </div>
          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1">
            {kpis.resourcesInUse || 0} Deployed / Enroute
          </span>
        </Card>
      </div>

      {/* Phase 5 Special Features: Predictive Shortage Forecasting & AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Predictive Resource Shortage Forecasting Card */}
        <Card className="p-5 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
                  Predictive Deficit Forecast (60m)
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  U_net_avail = max(0, U_avail - U_enroute) | Deficit Formula Model
                </p>
              </div>
            </div>

            {/* Selector */}
            <div className="flex bg-slate-950 p-1 rounded border border-slate-800 text-xs font-mono">
              {['AMBULANCE', 'FIRE_TRUCK', 'POLICE_CAR', 'RESCUE_BOAT'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleShortageTypeChange(t)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    shortageType === t ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {loadingShortage ? (
            <LoadingSkeleton count={2} height="h-20" />
          ) : shortageData ? (
            <div className="space-y-4">
              {/* Alert Status Banner */}
              <div
                className={`p-3 rounded-lg border font-mono text-xs flex items-center justify-between ${
                  shortageData.shortageAlert
                    ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                    : 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="font-bold">
                    {shortageData.shortageAlert ? 'CRITICAL SHORTAGE DEFICIT PROJECTED' : 'CAPACITY SUFFICIENT FOR DEMAND'}
                  </span>
                </div>
                <span className="text-[10px] opacity-80 uppercase font-mono">
                  Deficit: {shortageData.shortageDeficit} Units
                </span>
              </div>

              {/* Formula Breakdown Matrix */}
              <div className="grid grid-cols-4 gap-2 text-center bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono">
                <div className="p-2 border-r border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase">Available (U_avail)</span>
                  <div className="text-lg font-bold text-slate-100">{shortageData.formulaInputs?.U_avail}</div>
                </div>
                <div className="p-2 border-r border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase">Enroute (U_enroute)</span>
                  <div className="text-lg font-bold text-amber-400">{shortageData.formulaInputs?.U_enroute}</div>
                </div>
                <div className="p-2 border-r border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase">Net (U_net_avail)</span>
                  <div className="text-lg font-bold text-emerald-400">{shortageData.formulaInputs?.U_net_avail}</div>
                </div>
                <div className="p-2">
                  <span className="text-[9px] text-slate-400 uppercase">Forecast Demand</span>
                  <div className="text-lg font-bold text-rose-400">{shortageData.formulaInputs?.forecastedDemand}</div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 font-mono leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800/60">
                <strong className="text-slate-300">Model Standard:</strong> Deficit = max(0, (Forecasted Demand + 1) - U_net_avail). 
                Net capacity strictly excludes enroute units currently unavailable for immediate new dispatches.
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-mono">Unable to load shortage forecast.</p>
          )}
        </Card>

        {/* AI Operational Insights Briefing Box */}
        <Card className="p-5 bg-slate-900 border-slate-800">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <div>
                <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider">
                  AI Operational Intelligence Briefing
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {aiInsights?.isFallback ? 'Deterministic Statistical Analytics Mode' : 'Gemini Operational Intelligence Engine'}
                </p>
              </div>
            </div>

            {aiInsights?.riskLevel && (
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                  aiInsights.riskLevel === 'HIGH' || aiInsights.riskLevel === 'CRITICAL'
                    ? 'bg-rose-950 border border-rose-800 text-rose-400'
                    : 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                }`}
              >
                Risk: {aiInsights.riskLevel}
              </span>
            )}
          </div>

          {loadingInsights ? (
            <LoadingSkeleton count={3} height="h-16" />
          ) : aiInsights ? (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded border border-slate-800">
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  Executive Operational Summary
                </span>
                <p className="text-slate-300 text-[11px] leading-relaxed">{aiInsights.executiveSummary}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    System Bottleneck Analysis
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{aiInsights.bottleneckAnalysis}</p>
                </div>

                <div className="bg-slate-950 p-3 rounded border border-slate-800">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Recommended Action
                  </span>
                  <p className="text-slate-300 text-[11px] leading-relaxed">{aiInsights.staffingRecommendation}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 font-mono">Unable to retrieve operational briefing.</p>
          )}
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

export default AnalyticsPage;

