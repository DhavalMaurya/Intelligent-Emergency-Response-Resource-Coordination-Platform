import React, { useState } from 'react';
import { Truck, Navigation, Award, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ResourceRecommendationData {
  resourceId: string;
  callSign: string;
  name: string;
  type: string;
  status: string;
  distanceKm: number;
  etaMinutes: number;
  score: number;
  scoreBreakdown: {
    proximityScore: number;
    capabilityScore: number;
    statusAndCapacityScore: number;
    sectorScore: number;
  };
  aiExplanation: string;
}

interface ResourceRecommendationCardProps {
  item: ResourceRecommendationData;
  rank: number;
  onDispatchConfirm: (resourceId: string, callSign: string) => Promise<void>;
}

export const ResourceRecommendationCard: React.FC<ResourceRecommendationCardProps> = ({
  item,
  rank,
  onDispatchConfirm,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);

  const handleConfirm = async () => {
    setIsDispatching(true);
    try {
      await onDispatchConfirm(item.resourceId, item.callSign);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Dispatch failed:', err);
    } finally {
      setIsDispatching(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400 bg-emerald-950/80 border-emerald-800/80';
    if (score >= 50) return 'text-amber-400 bg-amber-950/80 border-amber-800/80';
    return 'text-slate-400 bg-slate-900 border-slate-800';
  };

  return (
    <>
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
        {/* Header Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-700 flex items-center justify-center font-mono font-bold text-xs text-indigo-300">
              #{rank}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-100 font-display">{item.callSign}</span>
                <span className="text-xs text-slate-400">({item.name})</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-400">
                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">{item.type}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-sky-400">
                  <Navigation className="w-3 h-3" /> ETA: {item.etaMinutes} min ({item.distanceKm} km)
                </span>
              </div>
            </div>
          </div>

          <div className={`px-3 py-1 rounded-lg border text-xs font-mono font-extrabold flex items-center gap-1.5 ${getScoreColor(item.score)}`}>
            <Award className="w-3.5 h-3.5" />
            <span>{item.score}/100 Match</span>
          </div>
        </div>

        {/* AI Explanation Box */}
        <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-xs text-slate-300 font-sans leading-relaxed flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-mono text-[10px] font-bold text-indigo-400 uppercase block mb-0.5">
              AI Recommendation Justification
            </span>
            <p>{item.aiExplanation}</p>
          </div>
        </div>

        {/* Score Breakdown Pill Row */}
        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800/60">
          <div>
            Proximity: <span className="text-slate-200 font-bold">{item.scoreBreakdown.proximityScore}/40</span>
          </div>
          <div>
            Capability: <span className="text-slate-200 font-bold">{item.scoreBreakdown.capabilityScore}/30</span>
          </div>
          <div>
            Status/Cap: <span className="text-slate-200 font-bold">{item.scoreBreakdown.statusAndCapacityScore}/20</span>
          </div>
          <div>
            Sector: <span className="text-slate-200 font-bold">{item.scoreBreakdown.sectorScore}/10</span>
          </div>
        </div>

        {/* Human Operator Action Bar */}
        <div className="pt-2 flex items-center justify-between">
          <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Human Operator Approval Required
          </span>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowConfirmModal(true)}
            icon={<Truck className="w-3.5 h-3.5" />}
          >
            Review & Confirm Dispatch
          </Button>
        </div>
      </div>

      {/* Human Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldCheck className="w-6 h-6 shrink-0 text-indigo-400" />
              <div>
                <h3 className="text-base font-bold text-slate-100 font-display">Confirm Human Dispatch Order</h3>
                <p className="text-xs text-slate-400 font-mono">Operator Verification Step</p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Resource Unit:</span>
                <span className="font-bold text-slate-200">{item.callSign} ({item.name})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Unit Type:</span>
                <span className="font-bold text-slate-200">{item.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Urban Speed ETA:</span>
                <span className="font-bold text-sky-400">{item.etaMinutes} minutes ({item.distanceKm} km)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-mono">Match Score:</span>
                <span className="font-bold text-emerald-400">{item.score}/100</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              By confirming, you execute official EOC dispatch command for unit <strong>{item.callSign}</strong>. Unit status will update to <code>EN_ROUTE</code>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" size="sm" onClick={() => setShowConfirmModal(false)} disabled={isDispatching}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirm} disabled={isDispatching} icon={<CheckCircle2 className="w-4 h-4" />}>
                {isDispatching ? 'Executing Dispatch...' : 'Confirm & Dispatch Unit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
