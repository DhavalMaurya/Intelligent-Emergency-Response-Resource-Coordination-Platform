import React from 'react';
import { Filter, RotateCcw, Clock, ShieldAlert, Layers, Activity, MapPin } from 'lucide-react';
import { useFilters } from '../../context/FilterContext';
import { Severity, IncidentType, IncidentStatus } from '../../types';

export const DashboardFilterBar: React.FC = () => {
  const { filters, setTimeRange, setSeverity, setType, setStatus, setZone, resetFilters, isFiltered } = useFilters();

  const timeRanges: Array<{ value: typeof filters.timeRange; label: string }> = [
    { value: '1h', label: 'Past 1h' },
    { value: '6h', label: 'Past 6h' },
    { value: '24h', label: 'Past 24h' },
    { value: '7d', label: 'Past 7d' },
    { value: 'all', label: 'All Time' },
  ];

  const severities: Array<{ value: typeof filters.severity; label: string }> = [
    { value: 'ALL', label: 'All Severities' },
    { value: 'CRITICAL', label: 'Critical Only' },
    { value: 'HIGH', label: 'High' },
    { value: 'MEDIUM', label: 'Medium' },
    { value: 'LOW', label: 'Low' },
  ];

  const incidentTypes: Array<{ value: typeof filters.type; label: string }> = [
    { value: 'ALL', label: 'All Incident Types' },
    { value: 'FIRE', label: 'Fire' },
    { value: 'ROAD_ACCIDENT', label: 'Road Accident' },
    { value: 'INDUSTRIAL_ACCIDENT', label: 'Industrial / Hazmat' },
    { value: 'MEDICAL', label: 'Medical EMS' },
    { value: 'BUILDING_COLLAPSE', label: 'Building Collapse' },
    { value: 'FLOOD', label: 'Flood / Water' },
  ];

  const statuses: Array<{ value: typeof filters.status; label: string }> = [
    { value: 'ALL', label: 'All Statuses' },
    { value: 'ACTIVE', label: 'Active Unassigned' },
    { value: 'ASSIGNED', label: 'Units Assigned' },
    { value: 'EN_ROUTE', label: 'En Route' },
    { value: 'ON_SCENE', label: 'On Scene' },
    { value: 'DELAYED', label: 'Delayed Breach' },
    { value: 'ESCALATED', label: 'Escalated' },
    { value: 'RESOLVED', label: 'Resolved' },
  ];

  const zones = [
    { value: 'ALL', label: 'All Sectors' },
    { value: 'Sector 1 - Downtown', label: 'Sector 1 (Downtown)' },
    { value: 'Sector 2 - Harbour', label: 'Sector 2 (Harbour)' },
    { value: 'Sector 3 - Industrial Corridor', label: 'Sector 3 (Industrial)' },
    { value: 'Sector 4 - Residential North', label: 'Sector 4 (North)' },
    { value: 'Sector 5 - Transit Hub', label: 'Sector 5 (Transit Hub)' },
  ];

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Left controls */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-400 uppercase mr-1">
          <Filter className="w-3.5 h-3.5 text-rose-500" />
          FILTERS:
        </span>

        {/* Time Range Pills */}
        <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {timeRanges.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                filters.timeRange === tr.value
                  ? 'bg-rose-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>

        {/* Severity Selector */}
        <div className="relative">
          <select
            value={filters.severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            {severities.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Incident Type Selector */}
        <div className="relative">
          <select
            value={filters.type}
            onChange={(e) => setType(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            {incidentTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Selector */}
        <div className="relative">
          <select
            value={filters.status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            {statuses.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zone Selector */}
        <div className="relative">
          <select
            value={filters.zone}
            onChange={(e) => setZone(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:border-rose-500 focus:outline-none cursor-pointer"
          >
            {zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reset button if active */}
      {isFiltered && (
        <button
          onClick={resetFilters}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold hover:bg-rose-900/80 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Filters
        </button>
      )}
    </div>
  );
};
