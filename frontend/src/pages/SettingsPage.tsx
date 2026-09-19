import React, { useState } from 'react';
import { Settings, Save, Shield, Clock, AlertTriangle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const [targetResponseTime, setTargetResponseTime] = useState<number>(8);
  const [criticalDispatchTimeout, setCriticalDispatchTimeout] = useState<number>(5);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-slate-400" />
          EOC SYSTEM THRESHOLDS & CONFIGURATION
        </h1>
        <p className="text-xs text-slate-400 font-mono mt-1">
          Operational Response Targets, Delay Breach Timers & Mutual Aid Triggers
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card title="OPERATIONAL SLA THRESHOLDS">
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Target Response Time SLA (Minutes):
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={targetResponseTime}
                  onChange={(e) => setTargetResponseTime(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Threshold line displayed across operational response time analytics charts.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Critical Dispatch Delay Breach Timeout (Minutes):
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={criticalDispatchTimeout}
                  onChange={(e) => setCriticalDispatchTimeout(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Time unassigned critical incidents can remain before triggering supervisor alerts.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {saved && (
                <span className="text-emerald-400 font-mono text-xs font-bold">
                  ✓ Configuration successfully updated and saved.
                </span>
              )}
              <Button type="submit" variant="primary" icon={<Save className="w-4 h-4" />}>
                Save System Thresholds
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
};
