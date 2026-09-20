import React, { useState } from 'react';
import axios from 'axios';
import {
  X,
  Link2,
  GitMerge,
  AlertTriangle,
  MapPin,
  Clock,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

interface CorrelationReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  correlationData: {
    reportId?: string;
    reportNumber?: string;
    reportText?: string;
    reportLocation?: any;
    sourceIncidentId?: string;
    sourceIncidentNumber?: string;
    matchedIncident: {
      id: string;
      incidentNumber: string;
      title: string;
      type: string;
      severity: string;
      status: string;
      location: {
        address: string;
        coordinates: [number, number];
      };
      distanceMeters: number;
      timeDeltaMinutes: number;
    };
    confidenceScore: number;
    matchType: string;
    scoreBreakdown: {
      distanceScore: number;
      temporalScore: number;
      typeCompatibilityScore: number;
      jaccardTextSimilarityScore: number;
    };
    explanation: string[];
  } | null;
  onResolved: () => void;
}

export const CorrelationReviewModal: React.FC<CorrelationReviewModalProps> = ({
  isOpen,
  onClose,
  correlationData,
  onResolved,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen || !correlationData) return null;

  const isIncidentMerge = Boolean(correlationData.sourceIncidentId);

  const handleLinkReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/v1/intake/correlate', {
        action: 'LINK_REPORT',
        reportId: correlationData.reportId,
        masterIncidentId: correlationData.matchedIncident.id,
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setTimeout(() => {
          onResolved();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to link report.');
    } finally {
      setLoading(false);
    }
  };

  const handleMergeIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.post('/api/v1/intake/correlate', {
        action: 'MERGE_INCIDENTS',
        sourceIncidentId: correlationData.sourceIncidentId,
        masterIncidentId: correlationData.matchedIncident.id,
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.message);
        setTimeout(() => {
          onResolved();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to merge incidents.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              {isIncidentMerge ? <GitMerge className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isIncidentMerge ? 'Incident Merge Verification' : 'Incident Correlation Review'}
              </h2>
              <p className="text-xs text-slate-400">
                Deterministic Jaccard & Spatial Match Engine • Human-in-the-Loop Triage
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Correlation Confidence Score Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Correlation Confidence
              </span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {correlationData.confidenceScore}%
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    correlationData.confidenceScore >= 80
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {correlationData.matchType}
                </span>
              </div>
            </div>

            <div className="text-right text-[11px] text-slate-400 font-mono space-y-0.5">
              <div>Distance: +{correlationData.scoreBreakdown.distanceScore} pts</div>
              <div>Temporal: +{correlationData.scoreBreakdown.temporalScore} pts</div>
              <div>Category: +{correlationData.scoreBreakdown.typeCompatibilityScore} pts</div>
              <div>Jaccard Text: +{correlationData.scoreBreakdown.jaccardTextSimilarityScore} pts</div>
            </div>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Left: Incoming Candidate */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {isIncidentMerge ? 'Source Incident to Merge' : 'Incoming Report Record'}
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {correlationData.reportNumber || correlationData.sourceIncidentNumber}
                </span>
              </div>

              <p className="text-xs text-slate-200 line-clamp-4 italic">
                "{correlationData.reportText || 'Incident observations logged by dispatcher'}"
              </p>

              <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{correlationData.reportLocation?.address || 'Metropolitan Grid'}</span>
                </div>
              </div>
            </div>

            {/* Right: Master Incident */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Existing Master Incident
                </span>
                <span className="text-xs font-mono font-bold text-slate-300">
                  {correlationData.matchedIncident.incidentNumber}
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-white mb-1">
                  {correlationData.matchedIncident.title}
                </h4>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    {correlationData.matchedIncident.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300">
                    {correlationData.matchedIncident.type}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 space-y-1 pt-1">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{correlationData.matchedIncident.location.address}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {correlationData.matchedIncident.distanceMeters}m away • {correlationData.matchedIncident.timeDeltaMinutes}m time delta
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Engine Explanation List */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
            <h4 className="text-xs font-semibold text-slate-300 mb-2">Correlation Analysis:</h4>
            <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
              {correlationData.explanation.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Rule Reminder */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-[11px] text-blue-300">
            <span className="font-bold">EOC Protocol Rule:</span> Citizen submissions remain Report records until associated with a master incident. Merging two already-created incidents always requires your confirmation as an authorized operator.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Keep Distinct / Cancel
            </button>

            {isIncidentMerge ? (
              <button
                disabled={loading}
                onClick={handleMergeIncidents}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <GitMerge className="w-3.5 h-3.5" />
                <span>Confirm Incident Merge</span>
              </button>
            ) : (
              <button
                disabled={loading}
                onClick={handleLinkReport}
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Link2 className="w-3.5 h-3.5" />
                <span>Link as Supporting Report</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
