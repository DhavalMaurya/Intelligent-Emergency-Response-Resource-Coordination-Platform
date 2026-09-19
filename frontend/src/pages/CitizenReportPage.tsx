import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Flame,
  Car,
  HeartPulse,
  Biohazard,
  Waves,
  AlertTriangle,
  Send,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Clock,
  ChevronRight,
  PhoneCall,
  Info,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'FIRE', label: 'Fire & Smoke', icon: Flame, color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
  { id: 'ROAD_ACCIDENT', label: 'Vehicle Collision', icon: Car, color: 'text-blue-400 border-blue-500/40 bg-blue-500/10' },
  { id: 'MEDICAL', label: 'Medical Emergency', icon: HeartPulse, color: 'text-rose-400 border-rose-500/40 bg-rose-500/10' },
  { id: 'INDUSTRIAL_ACCIDENT', label: 'Chemical / Hazmat', icon: Biohazard, color: 'text-purple-400 border-purple-500/40 bg-purple-500/10' },
  { id: 'FLOOD', label: 'Flood / Surge', icon: Waves, color: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10' },
  { id: 'OTHER', label: 'Other Hazard', icon: AlertTriangle, color: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
];

const SECTORS = [
  { name: 'Sector 1 - North Coastal & Downtown', lng: -122.4194, lat: 37.7749 },
  { name: 'Sector 2 - Central Corridor & Expressway', lng: -122.4284, lat: 37.7599 },
  { name: 'Sector 3 - Industrial District & Port', lng: -122.4089, lat: 37.7649 },
  { name: 'Sector 4 - Residential Hills', lng: -122.4467, lat: 37.7501 },
  { name: 'Sector 5 - Commercial Bay Area', lng: -122.3952, lat: 37.7885 },
];

export const CitizenReportPage: React.FC = () => {
  const [category, setCategory] = useState<string>('FIRE');
  const [description, setDescription] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [zone, setZone] = useState<string>('Sector 1');
  const [lng, setLng] = useState<number>(-122.4194);
  const [lat, setLat] = useState<number>(37.7749);
  const [casualties, setCasualties] = useState<number>(0);
  const [trapped, setTrapped] = useState<boolean>(false);
  const [callerName, setCallerName] = useState<string>('');
  const [callerPhone, setCallerPhone] = useState<string>('');
  // Anti-bot honeypot
  const [website, setWebsite] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [submittedData, setSubmittedData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSectorChange = (sectorName: string) => {
    setZone(sectorName.split(' - ')[0]);
    const found = SECTORS.find((s) => s.name.startsWith(sectorName.split(' - ')[0]));
    if (found) {
      setLng(found.lng);
      setLat(found.lat);
      if (!address) {
        setAddress(found.name);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!description.trim()) {
      setErrorMessage('Please describe the emergency incident.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        rawText: description.trim(),
        category,
        website, // Honeypot field (must remain blank)
        location: {
          address: address || `${zone} Metropolitan Area`,
          zone,
          coordinates: [Number(lng), Number(lat)],
        },
        callerInfo: {
          name: callerName.trim() || undefined,
          phone: callerPhone.trim() || undefined,
          locationDescription: trapped ? 'Trapped occupants reported on-scene.' : undefined,
        },
      };

      const res = await axios.post('/api/v1/intake/citizen', payload);
      if (res.data?.success) {
        setSubmittedData(res.data);
      }
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const msg = err.response?.data?.error?.message;

      if (errCode === 'TOO_MANY_REQUESTS') {
        setErrorMessage('Rate limit reached: Maximum 10 reports allowed per 15 minutes. Emergency operators have been notified of ongoing activity.');
      } else if (errCode === 'OUT_OF_BOUNDS') {
        setErrorMessage('The specified coordinates are outside the metropolitan emergency response district (San Francisco metro area).');
      } else {
        setErrorMessage(msg || 'Failed to transmit emergency report. If in immediate danger, please dial 911.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-rose-500/30">
      {/* Top Civil Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-black text-xl shadow-lg shadow-rose-900/20">
            S
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              SENTINEL Civil Emergency Intake
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live Gateway
              </span>
            </h1>
            <p className="text-xs text-slate-400">Smart Emergency Network & Triage Ingestion Layer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>24/7 Triage Ready</span>
          </div>
          <Link
            to="/dashboard"
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-200 font-medium transition-colors flex items-center gap-1.5"
          >
            <span>Operator Portal</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {submittedData ? (
          /* Confirmation State */
          <div className="bg-slate-900/80 border border-emerald-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Emergency Report Logged</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto mb-6">
              Your report has been received by the Metropolitan Command Center triage queue.
            </p>

            {/* Tracking Card */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 text-left max-w-lg mx-auto space-y-3 mb-6">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400 uppercase font-mono">Reference Tracking Number</span>
                <span className="font-mono font-bold text-base text-emerald-400">
                  {submittedData.report.reportNumber}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Initial Triage Status:</span>
                <span
                  className={`px-2 py-0.5 rounded font-semibold ${
                    submittedData.report.status === 'LINKED'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {submittedData.report.status === 'LINKED' ? 'LINKED TO ACTIVE MASTER INCIDENT' : 'PENDING OPERATOR TRIAGE'}
                </span>
              </div>

              {submittedData.correlation?.isDuplicate && (
                <div className="mt-3 p-3 rounded-lg bg-blue-950/40 border border-blue-700/40 text-xs text-blue-200">
                  <p className="font-semibold text-blue-300 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-400" />
                    Correlated Incident Association
                  </p>
                  <p>
                    {submittedData.correlation.matchType === 'AUTOMATIC_LINK'
                      ? `Your report matched existing incident ${submittedData.correlation.matchedIncident?.incidentNumber} with high confidence (${submittedData.correlation.confidenceScore}%). Response units are already aware.`
                      : `Potential proximity match flagged for operator review (${submittedData.correlation.confidenceScore}% confidence).`}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 text-left max-w-lg mx-auto flex items-start gap-3 mb-6">
              <PhoneCall className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold">Stay Safe & Keep Lines Clear</p>
                <p className="text-slate-300 mt-0.5">
                  If conditions deteriorate or lives are in imminent peril, move to safety. Operators have direct access to your location telemetry.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setSubmittedData(null);
                setDescription('');
                setCasualties(0);
                setTrapped(false);
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-colors"
            >
              Submit Another Report
            </button>
          </div>
        ) : (
          /* Report Submission Form */
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 sm:p-8 shadow-2xl backdrop-blur-md">
            <div className="mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-rose-500" />
                Report an Emergency Incident
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Submissions are logged directly into the Civil Command Center for real-time triage, correlation, and response coordination.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Anti-spam honeypot (hidden from human users) */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  type="text"
                  id="website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {/* 1. Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  1. Incident Nature & Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`p-3 rounded-xl border flex items-center gap-2.5 text-left transition-all ${
                          isSelected
                            ? `${cat.color} ring-1 ring-rose-500 shadow-md`
                            : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800/50 text-slate-300'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="text-xs font-semibold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  2. Detailed Situation Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you see: flames, smoke color, structural damage, vehicles involved, street names..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                />
                <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                  <span>Include specific landmarks or street numbers if visible</span>
                  <span>{description.length} / 1000</span>
                </div>
              </div>

              {/* 3. Location & Sector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    3. Operational Sector
                  </label>
                  <select
                    value={zone}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                  >
                    {SECTORS.map((sec) => (
                      <option key={sec.name} value={sec.name.split(' - ')[0]}>
                        {sec.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Address / Landmark
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 740 Industrial Way or 4th & Market St"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Coordinate Precision Picker */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    Geographic Coordinates (Metropolitan Grid)
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    [{lng.toFixed(4)}, {lat.toFixed(4)}]
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Longitude (-122.52 to -122.35)</span>
                    <input
                      type="number"
                      step="0.0001"
                      min={-122.52}
                      max={-122.35}
                      value={lng}
                      onChange={(e) => setLng(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block mb-1">Latitude (37.70 to 37.83)</span>
                    <input
                      type="number"
                      step="0.0001"
                      min={37.7}
                      max={37.83}
                      value={lat}
                      onChange={(e) => setLat(parseFloat(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Casualties & Hazards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Estimated Casualties / Injured
                  </label>
                  <div className="flex items-center gap-3">
                    {[0, 1, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCasualties(val)}
                        className={`flex-1 py-2 rounded-xl border text-xs font-bold transition-all ${
                          casualties === val
                            ? 'border-rose-500 bg-rose-500/20 text-rose-300'
                            : 'border-slate-800 bg-slate-950/50 hover:bg-slate-800 text-slate-400'
                        }`}
                      >
                        {val === 3 ? '3+' : val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 cursor-pointer w-full mt-5 sm:mt-0 transition-colors">
                    <input
                      type="checkbox"
                      checked={trapped}
                      onChange={(e) => setTrapped(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-rose-600 focus:ring-rose-500 w-4 h-4"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-200 block">Trapped Persons</span>
                      <span className="text-[11px] text-slate-500">People cannot evacuate building/vehicle</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 5. Optional Reporter Info */}
              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-xs text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-500" />
                  Optional Callback Contact (Strictly Confidential)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={callerName}
                    onChange={(e) => setCallerName(e.target.value)}
                    placeholder="Your Name (Optional)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <input
                    type="tel"
                    value={callerPhone}
                    onChange={(e) => setCallerPhone(e.target.value)}
                    placeholder="Callback Phone Number"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-sm shadow-xl shadow-rose-950/40 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>Transmitting to EOC Command Center...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Emergency Report</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 px-6 text-center text-xs text-slate-500 bg-slate-950">
        <p>SENTINEL — Smart Emergency Network & Triage Ingestion Layer • Synthetic Demo Simulation • Logged for EOC Triage</p>
      </footer>
    </div>
  );
};
