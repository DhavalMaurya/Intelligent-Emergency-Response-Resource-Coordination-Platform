import React, { useState, useMemo } from 'react';
import axios from 'axios';
import {
  X,
  PhoneCall,
  AlertOctagon,
  Flame,
  Users,
  ShieldAlert,
  Send,
  Check,
  AlertTriangle,
  Building2,
  Navigation,
} from 'lucide-react';
import { Incident, IncidentType } from '../../types';

interface CreateIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIncidentCreated: (newIncident: Incident) => void;
  activeIncidents?: Incident[];
}

const INCIDENT_TYPES: Array<{ type: IncidentType; label: string }> = [
  { type: 'INDUSTRIAL_ACCIDENT', label: 'Industrial / Chemical' },
  { type: 'BUILDING_COLLAPSE', label: 'Structural Collapse' },
  { type: 'FIRE', label: 'Structural / Brush Fire' },
  { type: 'ROAD_ACCIDENT', label: 'Road / Highway Crash' },
  { type: 'MEDICAL', label: 'Mass Casualty / Medical' },
  { type: 'FLOOD', label: 'Flooding / Water Hazard' },
  { type: 'OTHER', label: 'Other Hazard' },
];

const SECTORS = [
  { name: 'Sector 1', address: 'Downtown Commercial Center', coordinates: [-122.4194, 37.7749] },
  { name: 'Sector 2', address: 'Highway 101 Expressway Corridor', coordinates: [-122.4284, 37.7599] },
  { name: 'Sector 3', address: 'Industrial Bay Port & Storage', coordinates: [-122.4089, 37.7649] },
  { name: 'Sector 4', address: 'Twin Peaks Residential District', coordinates: [-122.4467, 37.7501] },
  { name: 'Sector 5', address: 'Embarcadero Waterfront', coordinates: [-122.3952, 37.7885] },
];

export const CreateIncidentModal: React.FC<CreateIncidentModalProps> = ({
  isOpen,
  onClose,
  onIncidentCreated,
  activeIncidents = [],
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IncidentType>('FIRE');
  const [zone, setZone] = useState('Sector 1');
  const [address, setAddress] = useState('Downtown Commercial Center');
  const [lng, setLng] = useState(-122.4194);
  const [lat, setLat] = useState(37.7749);
  const [casualtiesCount, setCasualtiesCount] = useState(0);

  // Hazards
  const [explosion, setExplosion] = useState(false);
  const [toxicChemical, setToxicChemical] = useState(false);
  const [trappedPersons, setTrappedPersons] = useState(false);
  const [fireSpreading, setFireSpreading] = useState(false);
  const [infrastructureRisk, setInfrastructureRisk] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [recommendedResources, setRecommendedResources] = useState<any[] | null>(null);

  // Live Deterministic Severity Calculator (Client-side mirror of backend engine)
  const calculatedSeverity = useMemo(() => {
    let base = 10;
    if (type === 'INDUSTRIAL_ACCIDENT' || type === 'BUILDING_COLLAPSE') base = 25;
    else if (type === 'FIRE') base = 20;
    else if (type === 'ROAD_ACCIDENT' || type === 'MEDICAL') base = 15;

    let cas = 0;
    if (casualtiesCount >= 3) cas = 40;
    else if (casualtiesCount >= 1) cas = 20;

    let rawHazards = 0;
    if (toxicChemical) rawHazards += 25;
    if (explosion) rawHazards += 20;
    if (trappedPersons) rawHazards += 20;
    if (fireSpreading) rawHazards += 15;
    const hazardsScore = Math.min(35, rawHazards);

    const infraScore = infrastructureRisk ? 15 : 0;
    const total = Math.min(100, base + cas + hazardsScore + infraScore);

    let severity = 'LOW';
    let priority = 'P4';
    let badgeColor = 'bg-slate-500/20 text-slate-300 border-slate-500/40';

    if (total >= 75) {
      severity = 'CRITICAL';
      priority = 'P1';
      badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
    } else if (total >= 50) {
      severity = 'HIGH';
      priority = 'P2';
      badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/50';
    } else if (total >= 25) {
      severity = 'MEDIUM';
      priority = 'P3';
      badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/50';
    }

    return { total, base, cas, hazardsScore, infraScore, severity, priority, badgeColor };
  }, [type, casualtiesCount, explosion, toxicChemical, trappedPersons, fireSpreading, infrastructureRisk]);

  // Live proximity duplicate detection
  const potentialDuplicate = useMemo(() => {
    if (!activeIncidents || activeIncidents.length === 0) return null;
    return activeIncidents.find((inc) => {
      if (['RESOLVED', 'MERGED'].includes(inc.status)) return false;
      const [iLng, iLat] = inc.location?.coordinates || [0, 0];
      const dLng = Math.abs(iLng - lng);
      const dLat = Math.abs(iLat - lat);
      // Rough proximity check (< ~750m is approx 0.007 degrees)
      return dLng < 0.007 && dLat < 0.007 && inc.location.zone === zone;
    });
  }, [activeIncidents, lng, lat, zone]);

  const handleSectorChange = (secName: string) => {
    setZone(secName);
    const found = SECTORS.find((s) => s.name === secName);
    if (found) {
      setAddress(found.address);
      setLng(found.coordinates[0]);
      setLat(found.coordinates[1]);
    }
  };

  const handleCreate = async (force: boolean = false) => {
    setError(null);
    setLoading(true);

    try {
      const payload = {
        title: title || `${type} at ${address}`,
        description: description || `Emergency call logged by operator at ${address}.`,
        type,
        location: {
          address,
          zone,
          coordinates: [lng, lat],
        },
        casualtiesCount,
        hazards: {
          explosionConfirmed: explosion,
          toxicChemicalOrHazardous: toxicChemical,
          trappedPersons,
          fireSpreading,
        },
        infrastructureRisk,
        force,
      };

      const res = await axios.post('/api/v1/intake/operator', payload);
      if (res.data?.success) {
        setRecommendedResources(res.data.recommendedResources || []);
        onIncidentCreated(res.data.incident);
      }
    } catch (err: any) {
      if (err.response?.status === 409) {
        setDuplicateWarning(err.response.data);
      } else {
        setError(err.response?.data?.error?.message || 'Failed to create emergency incident.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Log Emergency Call (Rapid Intake)</h2>
              <p className="text-xs text-slate-400">911 Dispatch & Operational Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Recommended Resources Step ("Submit & Recommend") */}
          {recommendedResources ? (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/40 text-center">
                <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <h3 className="text-base font-bold text-white">Incident Logged Successfully</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Incident committed to dispatch queue. Human operator approval required before mobilizing response packages.
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  Recommended Units in {zone}
                </h4>

                {recommendedResources.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No idle units currently stationed in {zone}. Mutual aid recommended.</p>
                ) : (
                  <div className="space-y-2">
                    {recommendedResources.map((res: any) => (
                      <div
                        key={res.identifier}
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-slate-100">{res.name}</span>
                          <span className="text-slate-400 ml-2 font-mono">({res.identifier})</span>
                          <p className="text-[11px] text-slate-500">{res.type} • Station: {res.baseStation}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {res.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setRecommendedResources(null);
                    onClose();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-colors"
                >
                  Close Intake Console
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Proximity Duplicate Banner */}
              {(potentialDuplicate || duplicateWarning) && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-xs text-amber-300 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Possible Duplicate Active Incident:</span>
                    <p className="mt-0.5 text-slate-300">
                      Active incident{' '}
                      <span className="font-mono font-bold text-amber-300">
                        {potentialDuplicate?.incidentNumber || duplicateWarning?.correlation?.matchedIncident?.incidentNumber}
                      </span>{' '}
                      is already open in this immediate area ({potentialDuplicate?.title || duplicateWarning?.correlation?.matchedIncident?.title}).
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCreate(true)}
                      className="mt-2 text-xs text-amber-400 underline font-semibold hover:text-amber-300"
                    >
                      Override and force new separate incident
                    </button>
                  </div>
                </div>
              )}

              {/* Title & Description */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Incident Title / Summary
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Chemical Storage Fire with Dense Smoke"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Caller & Situational Notes
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Caller reported heavy smoke billowing from unit 4B. Flame height 20ft..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Type and Sector */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Incident Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as IncidentType)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Operational Sector</label>
                  <select
                    value={zone}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    {SECTORS.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.address.slice(0, 20)}...)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Casualties & Address */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Casualty Count</label>
                  <div className="flex items-center gap-2">
                    {[0, 1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setCasualtiesCount(num)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          casualtiesCount === num
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                            : 'border-slate-800 bg-slate-950 text-slate-400'
                        }`}
                      >
                        {num === 3 ? '3+' : num}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Address / Street</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Hazard Modifiers */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Hazard Modifiers & Risk Factors
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={explosion}
                      onChange={(e) => setExplosion(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Explosion Confirmed (+20)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={toxicChemical}
                      onChange={(e) => setToxicChemical(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Hazmat / Toxic Plume (+25)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trappedPersons}
                      onChange={(e) => setTrappedPersons(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Trapped Persons (+20)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fireSpreading}
                      onChange={(e) => setFireSpreading(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Fire Propagation (+15)</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-800 bg-slate-950/40 hover:bg-slate-900 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={infrastructureRisk}
                      onChange={(e) => setInfrastructureRisk(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span>Critical Infrastructure Zone (Expressway, Transit, Hospital) (+15)</span>
                  </label>
                </div>
              </div>

              {/* Live Deterministic Severity Breakdown Strip */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
                    Calculated Severity Score
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xl font-black font-mono text-white">
                      {calculatedSeverity.total}
                      <span className="text-xs text-slate-500 font-normal">/100</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${calculatedSeverity.badgeColor}`}>
                      {calculatedSeverity.severity} • {calculatedSeverity.priority}
                    </span>
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-400 space-y-0.5">
                  <div>Base: +{calculatedSeverity.base} | Casualties: +{calculatedSeverity.cas}</div>
                  <div>Hazards: +{calculatedSeverity.hazardsScore} | Infra: +{calculatedSeverity.infraScore}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCreate(false)}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit & Recommend Resources</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
