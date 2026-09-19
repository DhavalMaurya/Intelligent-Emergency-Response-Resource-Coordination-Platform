import React, { useState } from 'react';
import axios from 'axios';
import {
  Sparkles,
  Zap,
  Radio,
  Flame,
  Waves,
  Car,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const ScenarioSimulatorBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const triggerScenario = async (scenarioName: string, label: string) => {
    setLoadingScenario(scenarioName);
    setLastNotification(null);
    try {
      if (scenarioName === 'sensor-spike') {
        const res = await axios.post('/api/v1/intake/sensor-event', {
          sensorCode: 'SENS-IND-301',
          reading: 185,
          unit: 'ppm',
        });
        if (res.data?.success) {
          setLastNotification(`Sensor spike ingested: ${res.data.telemetryAppended ? 'Appended to existing incident telemetry (Suppressed duplicate alarm)' : 'New alarm logged'}.`);
        }
      } else {
        const res = await axios.post(`/api/v1/intake/demo/scenario/${scenarioName}`);
        if (res.data?.success) {
          setLastNotification(`Scenario '${label}' dispatched! Live events broadcast to dashboard via Socket.IO.`);
        }
      }
    } catch (err: any) {
      setLastNotification(`Failed to trigger scenario: ${err.response?.data?.error?.message || err.message}`);
    } finally {
      setLoadingScenario(null);
      setTimeout(() => {
        setLastNotification(null);
      }, 5000);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg backdrop-blur-md mb-6">
      {/* Bar Header */}
      <div className="px-4 py-2.5 bg-slate-950/70 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
            Hackathon Live Scenario Simulator
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30 font-medium">
            1-Click Multi-Source Ingestion
          </span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors text-xs flex items-center gap-1"
        >
          <span>{isExpanded ? 'Hide Controls' : 'Show Controls'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Triggers */}
      {isExpanded && (
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => triggerScenario('industrial-explosion', 'Industrial Explosion & Plume')}
              disabled={loadingScenario !== null}
              className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-left transition-all flex flex-col gap-1 disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <Flame className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase font-bold text-rose-400">Sector 3</span>
              </div>
              <span className="text-xs font-bold text-white">Chemical Explosion</span>
              <span className="text-[10px] text-slate-400">Triggers Report A + B correlation</span>
            </button>

            <button
              onClick={() => triggerScenario('sensor-spike', 'Sensor Telemetry Spike')}
              disabled={loadingScenario !== null}
              className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-left transition-all flex flex-col gap-1 disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <Radio className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase font-bold text-amber-400">SENS-IND-301</span>
              </div>
              <span className="text-xs font-bold text-white">Sensor Reading Spike</span>
              <span className="text-[10px] text-slate-400">Tests repeat suppression update</span>
            </button>

            <button
              onClick={() => triggerScenario('flood-surge', 'Flood Surge')}
              disabled={loadingScenario !== null}
              className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-left transition-all flex flex-col gap-1 disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <Waves className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase font-bold text-cyan-400">Sector 2</span>
              </div>
              <span className="text-xs font-bold text-white">Water Surge Alarm</span>
              <span className="text-[10px] text-slate-400">Triggers critical water level</span>
            </button>

            <button
              onClick={() => triggerScenario('expressway-collision', 'Highway Collision')}
              disabled={loadingScenario !== null}
              className="p-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-left transition-all flex flex-col gap-1 disabled:opacity-50 group"
            >
              <div className="flex items-center justify-between">
                <Car className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] uppercase font-bold text-blue-400">Expressway</span>
              </div>
              <span className="text-xs font-bold text-white">Highway Multi-Crash</span>
              <span className="text-[10px] text-slate-400">Infrastructure risk modifier</span>
            </button>
          </div>

          {lastNotification && (
            <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{lastNotification}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
