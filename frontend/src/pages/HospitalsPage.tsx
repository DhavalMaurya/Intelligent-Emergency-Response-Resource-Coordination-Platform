import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Building2,
  Activity,
  Bed,
  Phone,
  MapPin,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Navigation,
  Edit,
  X,
  Check,
} from 'lucide-react';
import { Hospital } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { RoleGate } from '../components/ui/RoleGate';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const HospitalsPage: React.FC = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Nearest Hospital Calculator State
  const [calcLng, setCalcLng] = useState<number>(-122.4194); // Sector 1 Default
  const [calcLat, setCalcLat] = useState<number>(37.7749);
  const [calcICU, setCalcICU] = useState<boolean>(false);
  const [nearestResult, setNearestResult] = useState<any | null>(null);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);

  // Edit Capacity Modal State
  const [editingHospital, setEditingHospital] = useState<Hospital | null>(null);
  const [editTotalBeds, setEditTotalBeds] = useState<number>(100);
  const [editAvailableBeds, setEditAvailableBeds] = useState<number>(20);
  const [editICU, setEditICU] = useState<number>(5);
  const [editStatus, setEditStatus] = useState<Hospital['status']>('NORMAL');
  const [editError, setEditError] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedZone !== 'ALL') params.append('zone', selectedZone);
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);

      const res = await axios.get(`/api/v1/hospitals?${params.toString()}`);
      if (res.data?.data?.hospitals) {
        setHospitals(res.data.data.hospitals);
      }
    } catch (err) {
      console.error('[Hospitals Page] Failed to fetch hospital network records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, [selectedZone, selectedStatus]);

  const handleFindNearest = async () => {
    setCalcLoading(true);
    setNearestResult(null);
    try {
      const res = await axios.get(
        `/api/v1/hospitals/nearest?lng=${calcLng}&lat=${calcLat}&requireICU=${calcICU}`
      );
      if (res.data?.data) {
        setNearestResult(res.data.data);
      }
    } catch (err: any) {
      console.error('[Hospitals Page] Nearest hospital query failed', err);
    } finally {
      setCalcLoading(false);
    }
  };

  const handleOpenEditModal = (h: Hospital) => {
    setEditingHospital(h);
    setEditTotalBeds(h.totalBeds);
    setEditAvailableBeds(h.availableBeds);
    setEditICU(h.icuAvailable);
    setEditStatus(h.status);
    setEditError(null);
  };

  const handleSaveStatus = async () => {
    if (!editingHospital) return;
    setEditError(null);

    if (editAvailableBeds > editTotalBeds) {
      setEditError(`Available Beds (${editAvailableBeds}) cannot exceed Total Beds (${editTotalBeds}).`);
      return;
    }
    if (editICU > editTotalBeds) {
      setEditError(`Available ICU Beds (${editICU}) cannot exceed Total Beds (${editTotalBeds}).`);
      return;
    }

    setEditLoading(true);
    try {
      const res = await axios.patch(`/api/v1/hospitals/${editingHospital._id}/status`, {
        totalBeds: editTotalBeds,
        availableBeds: editAvailableBeds,
        icuAvailable: editICU,
        status: editStatus,
      });

      if (res.data?.success) {
        setHospitals((prev) =>
          prev.map((h) => (h._id === editingHospital._id ? res.data.data.hospital : h))
        );
        setEditingHospital(null);
      }
    } catch (err: any) {
      setEditError(err.response?.data?.error?.message || 'Failed to update hospital status.');
    } finally {
      setEditLoading(false);
    }
  };

  const zones = [
    { value: 'ALL', label: 'All Sectors' },
    { value: 'Sector 1 - Downtown', label: 'Sector 1 (Downtown)' },
    { value: 'Sector 2 - Harbour', label: 'Sector 2 (Harbour)' },
    { value: 'Sector 3 - Industrial Corridor', label: 'Sector 3 (Industrial)' },
    { value: 'Sector 4 - Residential North', label: 'Sector 4 (North)' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1920px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white font-display uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-6 h-6 text-rose-500" />
            Hospital Network & Trauma Capacity Center
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time ER bed availability, ICU capacity, and EMS ambulance diversion advisory pipeline
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" variant="secondary" onClick={fetchHospitals} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh Status
          </Button>
        </div>
      </div>

      {/* Synthetic Privacy Banner */}
      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-between font-mono">
        <span className="text-slate-300">
          ⚠️ <strong>PRIVACY BOUNDARY NOTICE:</strong> All medical facilities and capacity counts are synthetic demo data. System stores ZERO Patient Health Information (PHI).
        </span>
        <span className="text-emerald-400 font-bold">HIPAA BOUNDARY COMPLIANT</span>
      </div>

      {/* Main Split: Facility Cards & Nearest Routing Advisor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Trauma Center Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Filters */}
          <div className="flex items-center justify-between bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-mono text-slate-400 font-bold uppercase">Zone:</span>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
              >
                {zones.map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>

              <span className="font-mono text-slate-400 font-bold uppercase ml-2">Status:</span>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH_OCCUPANCY">High Occupancy</option>
                <option value="DIVERT_STATUS">Divert Status</option>
              </select>
            </div>

            <span className="font-mono text-slate-400 text-[11px]">{hospitals.length} Facilities Listed</span>
          </div>

          {loading ? (
            <LoadingSkeleton count={3} />
          ) : hospitals.length === 0 ? (
            <Card title="No Facilities Found">
              <div className="py-8 text-center text-xs text-slate-400">No medical centers matched current filters.</div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hospitals.map((h) => {
                const isDivert = h.status === 'DIVERT_STATUS';
                const isHigh = h.status === 'HIGH_OCCUPANCY';
                const occupancyPct = Math.round(((h.totalBeds - h.availableBeds) / h.totalBeds) * 100);

                return (
                  <div
                    key={h._id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                      isDivert
                        ? 'bg-rose-950/20 border-rose-900/60 shadow-lg shadow-rose-950/20'
                        : isHigh
                        ? 'bg-amber-950/20 border-amber-900/60'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div>
                      {/* Title & Status Badge */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-sm font-bold text-white font-display">{h.name}</h3>
                          <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {h.zone}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold shrink-0 ${
                            isDivert
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                              : isHigh
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {h.status.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs font-mono">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Available Beds</span>
                          <span className="text-sm font-bold text-slate-100">
                            {h.availableBeds} / {h.totalBeds}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">ICU Available</span>
                          <span className={`text-sm font-bold ${h.icuAvailable === 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {h.icuAvailable} Beds
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block">Trauma Level</span>
                          <span className="text-sm font-bold text-cyan-400">Level {h.traumaLevel}</span>
                        </div>
                      </div>

                      {/* Capacity Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-400">
                          <span>Occupancy</span>
                          <span>{occupancyPct}%</span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full transition-all duration-300 ${
                              occupancyPct >= 90 ? 'bg-rose-500' : occupancyPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${occupancyPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {h.contactPhone || '555-EOC-LINE'}
                      </span>

                      <RoleGate allowedRoles={['CONTROL_ROOM', 'ADMIN', 'HOSPITAL']}>
                        <button
                          onClick={() => handleOpenEditModal(h)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit className="w-3 h-3 text-rose-400" /> Update Capacity
                        </button>
                      </RoleGate>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: EMS Nearest Hospital Advisory Routing Engine (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card
            title="EMS NEAREST ROUTING ADVISOR"
            subtitle="Advisory Non-Diverted Hospital Ranking"
            badge={
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-700 font-bold">
                ADVISORY ENGINE
              </span>
            }
          >
            <div className="space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed">
                Calculates nearest non-diverted hospital with available bed capacity for EMS ambulances.
              </p>

              {/* Coordinates Controls */}
              <div className="space-y-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <div>
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Target Sector Preset</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'sec1') {
                        setCalcLng(-122.4194);
                        setCalcLat(37.7749);
                      } else if (val === 'sec3') {
                        setCalcLng(-122.392);
                        setCalcLat(37.755);
                      } else if (val === 'sec2') {
                        setCalcLng(-122.405);
                        setCalcLat(37.781);
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="sec1">Sector 1 — Downtown Commercial</option>
                    <option value="sec3">Sector 3 — Industrial Port</option>
                    <option value="sec2">Sector 2 — Harbour Bay</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="requireICU"
                    checked={calcICU}
                    onChange={(e) => setCalcICU(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-rose-600 focus:ring-0 w-3.5 h-3.5"
                  />
                  <label htmlFor="requireICU" className="text-slate-300 font-medium cursor-pointer">
                    Require Available ICU Bed
                  </label>
                </div>

                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleFindNearest}
                  disabled={calcLoading}
                  className="w-full justify-center"
                  icon={<Navigation className="w-3.5 h-3.5" />}
                >
                  Calculate Advisory Hospital
                </Button>
              </div>

              {/* Nearest Result */}
              {nearestResult && (
                <div className="space-y-3 pt-2 animate-in fade-in">
                  {nearestResult.recommendedHospital ? (
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">Recommended Destination</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300">
                          {nearestResult.recommendedHospital.estimatedDistanceKm} km • ~{nearestResult.recommendedHospital.estimatedTransportMinutes} min
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{nearestResult.recommendedHospital.name}</h4>
                      <p className="text-[11px] text-slate-300">{nearestResult.recommendedHospital.location?.address}</p>
                      <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                        <span>Beds: <strong>{nearestResult.recommendedHospital.availableBeds}</strong> free</span>
                        <span>ICU: <strong>{nearestResult.recommendedHospital.icuAvailable}</strong> free</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/60 text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-500 mb-1" />
                      <p className="text-xs">{nearestResult.message}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-mono italic bg-slate-950 p-2 rounded border border-slate-800">
                    {nearestResult.advisoryNotice}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Capacity Modal */}
      {editingHospital && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Update Capacity: {editingHospital.name}</h3>
              <button onClick={() => setEditingHospital(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Facility Divert Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="NORMAL">NORMAL (Accepting EMS Transports)</option>
                  <option value="HIGH_OCCUPANCY">HIGH OCCUPANCY (Surge Warning)</option>
                  <option value="DIVERT_STATUS">DIVERT STATUS (Reroute Ambulances)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">Total Beds</label>
                  <input
                    type="number"
                    min="1"
                    value={editTotalBeds}
                    onChange={(e) => setEditTotalBeds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">Available Beds</label>
                  <input
                    type="number"
                    min="0"
                    value={editAvailableBeds}
                    onChange={(e) => setEditAvailableBeds(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-mono text-[10px] mb-1">ICU Free</label>
                  <input
                    type="number"
                    min="0"
                    value={editICU}
                    onChange={(e) => setEditICU(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setEditingHospital(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveStatus} disabled={editLoading} icon={<Check className="w-3.5 h-3.5" />}>
                Save Capacity
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
