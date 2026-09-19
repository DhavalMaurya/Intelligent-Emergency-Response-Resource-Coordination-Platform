import React from 'react';
import { Bot, Sparkles, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface AiSituationSummaryProps {
  criticalCount: number;
  delayedCount: number;
  mostUrgentTitle?: string;
  mostUrgentIncidentId?: string;
  onInspectUrgent?: (id: string) => void;
}

export const AiSituationSummary: React.FC<AiSituationSummaryProps> = ({
  criticalCount,
  delayedCount,
  mostUrgentTitle = 'Chemical Warehouse Multi-Alarm Fire (INC-2026-1042)',
  mostUrgentIncidentId,
  onInspectUrgent,
}) => {
  return (
    <Card
      title="AI SITUATION SYNTHESIS BRIEFING"
      subtitle="Operational telemetry analysis"
      badge={
        <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700 font-bold">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          AI ENGINE
        </span>
      }
      className="h-full border-indigo-950/80 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20"
      bodyClassName="space-y-3.5"
    >
      <div className="space-y-3 text-xs leading-relaxed">
        {/* Current State */}
        <div className="p-2.5 rounded bg-slate-950/70 border border-slate-800">
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-1">
            Current Situation
          </div>
          <p className="text-slate-200">
            Currently <strong>{criticalCount} critical incidents</strong> require active priority coordination. Sector 3 exhibits high ambient VOC and elevated smoke density.
          </p>
        </div>

        {/* Primary Operational Concern */}
        <div className="p-2.5 rounded bg-rose-950/30 border border-rose-900/50">
          <div className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <ShieldAlert className="w-3 h-3" />
            Primary Operational Concern
          </div>
          <p className="text-slate-300">
            <strong>{mostUrgentTitle}</strong> has confirmed casualties trapped on the upper tier and an unfulfilled ambulance transport dispatch.
          </p>
        </div>

        {/* Resource Concern */}
        <div className="p-2.5 rounded bg-amber-950/30 border border-amber-900/50">
          <div className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3" />
            Resource Bottleneck
          </div>
          <p className="text-slate-300">
            Sector 3 ambulance availability is below reserve threshold. St. Jude Hospital is on divert status; redirect trauma transports to Metro General Hospital.
          </p>
        </div>

        {/* Suggested Operator Action */}
        <div className="p-2.5 rounded bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono font-bold text-indigo-300 uppercase tracking-wider">
              Recommended Focus
            </div>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Review emergency INC-2026-1042 and authorize mutual-aid ambulance dispatch.
            </p>
          </div>
          {mostUrgentIncidentId && onInspectUrgent && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onInspectUrgent(mostUrgentIncidentId)}
              className="shrink-0 text-xs"
              icon={<ArrowRight className="w-3 h-3" />}
            >
              Inspect
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
