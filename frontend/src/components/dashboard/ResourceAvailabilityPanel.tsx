import React from 'react';
import { Resource } from '../../types';
import { Card } from '../ui/Card';
import { Truck, AlertTriangle } from 'lucide-react';

interface ResourceAvailabilityPanelProps {
  resources: Resource[];
  onSelectResource?: (resource: Resource) => void;
}

export const ResourceAvailabilityPanel: React.FC<ResourceAvailabilityPanelProps> = ({
  resources,
  onSelectResource,
}) => {
  const fleets = [
    { type: 'AMBULANCE', label: 'Ambulance (ALS)', target: 6 },
    { type: 'FIRE_TRUCK', label: 'Fire Suppression', target: 5 },
    { type: 'RESCUE_TEAM', label: 'Heavy Rescue', target: 2 },
    { type: 'HAZMAT_UNIT', label: 'Hazmat Units', target: 2 },
    { type: 'POLICE_UNIT', label: 'Police Units', target: 4 },
  ];

  return (
    <Card
      title="RESOURCE FLEET AVAILABILITY"
      subtitle="Operational readiness & shortage monitoring"
      className="h-full"
      bodyClassName="space-y-4"
    >
      <div className="space-y-3">
        {fleets.map((fleet) => {
          const matching = resources.filter((r) => r.type === fleet.type);
          const available = matching.filter((r) => r.status === 'AVAILABLE').length;
          const total = matching.length || 1;
          const pct = Math.round((available / total) * 100);
          const isShortage = available < Math.ceil(fleet.target * 0.4);

          return (
            <div key={fleet.type} className="space-y-1.5 p-2 rounded bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">{fleet.label}</span>
                <div className="flex items-center gap-2 font-mono">
                  {isShortage && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-1 font-bold">
                      <AlertTriangle className="w-3 h-3" /> LOW RESERVE
                    </span>
                  )}
                  <span className="text-slate-300">
                    <strong className="text-emerald-400">{available}</strong> / {matching.length} Available
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    pct > 50 ? 'bg-emerald-500' : pct > 20 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Unit Status Ticker */}
      <div className="pt-2 border-t border-slate-800">
        <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider block mb-2">
          Recently Updated Units
        </span>
        <div className="grid grid-cols-2 gap-2">
          {resources.slice(0, 4).map((r) => (
            <div
              key={r._id}
              onClick={() => onSelectResource?.(r)}
              className="p-2 rounded bg-slate-950 border border-slate-800 text-[11px] cursor-pointer hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between font-mono font-bold">
                <span className="text-slate-200">{r.identifier}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded ${
                    r.status === 'AVAILABLE' ? 'text-emerald-400' : 'text-cyan-400'
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="text-slate-400 truncate text-[10px] mt-0.5">{r.name}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
