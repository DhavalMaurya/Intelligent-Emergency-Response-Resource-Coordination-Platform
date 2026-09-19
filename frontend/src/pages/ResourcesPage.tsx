import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Search, Fuel, Users, Eye, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { Resource } from '../types';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ResourceDetailDrawer } from '../components/detail/ResourceDetailDrawer';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '60' });
      if (selectedStatus !== 'ALL') params.append('status', selectedStatus);
      if (selectedType !== 'ALL') params.append('type', selectedType);
      if (search) params.append('search', search);

      const res = await axios.get(`/api/v1/resources?${params.toString()}`);
      if (res.data?.data?.resources) {
        setResources(res.data.data.resources);
      }
    } catch (err) {
      console.error('[Resources] Error fetching fleet directory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [selectedStatus, selectedType]);

  const statusTabs = [
    { value: 'ALL', label: 'All Units' },
    { value: 'AVAILABLE', label: 'Available (Standby)' },
    { value: 'BUSY', label: 'Busy' },
    { value: 'EN_ROUTE', label: 'En Route' },
    { value: 'ON_SCENE', label: 'On Scene' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-cyan-400" />
            EMERGENCY RESOURCE & FLEET COORDINATION
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-Time Vehicle Tracking, Paramedic Squads & Deployment Readiness &bull; {resources.length} Units Online
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card className="p-4 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 overflow-x-auto">
          {statusTabs.map((st) => (
            <button
              key={st.value}
              onClick={() => setSelectedStatus(st.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-mono whitespace-nowrap transition-colors ${
                selectedStatus === st.value
                  ? 'bg-rose-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Secondary Filter Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search call sign, station or vehicle name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchResources()}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none font-mono"
            >
              <option value="ALL">All Fleet Types</option>
              <option value="AMBULANCE">Ambulance (ALS / Transport)</option>
              <option value="FIRE_TRUCK">Fire Suppression / Engine</option>
              <option value="RESCUE_TEAM">Heavy Rescue Squad</option>
              <option value="HAZMAT_UNIT">Hazmat Response</option>
              <option value="POLICE_UNIT">Police / Traffic Control</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Fleet Cards Grid */}
      {loading ? (
        <LoadingSkeleton count={6} height="h-36" />
      ) : resources.length === 0 ? (
        <Card className="p-8 text-center text-xs text-slate-400 font-mono">
          No fleet resources match current filter criteria.
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {resources.map((res) => {
            const isAvailable = res.status === 'AVAILABLE';
            return (
              <div
                key={res._id}
                onClick={() => setSelectedResourceId(res._id)}
                className={`p-4 rounded-lg bg-slate-900 border transition-all cursor-pointer hover:border-slate-700 hover:shadow-xl space-y-3 ${
                  isAvailable ? 'border-slate-800' : 'border-cyan-900/60 bg-slate-900/90'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-mono font-bold text-slate-100">{res.identifier}</span>
                    <div className="text-xs font-semibold text-slate-300 mt-0.5 truncate">{res.name}</div>
                  </div>
                  <StatusBadge status={res.status} size="sm" />
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>Station: <strong className="text-slate-300">{res.baseStation}</strong></div>
                  <div>Sector: <strong className="text-slate-300">{res.zone.split(' - ')[0]}</strong></div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono">
                  <span className="flex items-center gap-1 text-slate-400">
                    <Fuel className="w-3.5 h-3.5 text-emerald-400" />
                    {res.fuelLevelPercent || 90}%
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    Crew: {res.crewCount}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedResourceId(res._id);
                    }}
                    className="text-[10px] px-2 py-0.5"
                  >
                    Inspect
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resource Drawer */}
      <ResourceDetailDrawer
        resourceId={selectedResourceId}
        isOpen={Boolean(selectedResourceId)}
        onClose={() => setSelectedResourceId(null)}
        onResourceUpdated={fetchResources}
      />
    </div>
  );
};
