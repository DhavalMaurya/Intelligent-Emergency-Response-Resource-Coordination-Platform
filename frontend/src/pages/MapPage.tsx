import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapPin, Compass, Layers, Shield, Eye } from 'lucide-react';
import { LiveMap } from '../components/dashboard/LiveMap';
import { Incident, Resource } from '../types';
import { IncidentDetailDrawer } from '../components/detail/IncidentDetailDrawer';
import { ResourceDetailDrawer } from '../components/detail/ResourceDetailDrawer';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const MapPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);

  const fetchMapData = async () => {
    try {
      setLoading(true);
      const [incidentsRes, resourcesRes] = await Promise.all([
        axios.get('/api/v1/incidents?limit=100'),
        axios.get('/api/v1/resources?limit=100'),
      ]);

      if (incidentsRes.data?.data?.incidents) {
        setIncidents(incidentsRes.data.data.incidents);
      }
      if (resourcesRes.data?.data?.resources) {
        setResources(resourcesRes.data.data.resources);
      }
    } catch (err) {
      console.error('[MapPage] Failed to fetch map data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
  }, []);

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-rose-500" />
            LIVE OPERATIONS MAP
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Simulated Metropolitan Emergency Operations Grid & Geographic Distribution
          </p>
        </div>

        {/* Legend Summary */}
        <div className="flex items-center gap-4 text-xs font-mono bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">Critical ({incidents.filter((i) => i.severity === 'CRITICAL').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-slate-300">High ({incidents.filter((i) => i.severity === 'HIGH').length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-cyan-400" />
            <span className="text-slate-300">Active Units ({resources.filter((r) => r.status !== 'AVAILABLE').length})</span>
          </div>
        </div>
      </div>

      {/* Expanded Map View */}
      <div className="flex-1 min-h-[560px] rounded-lg overflow-hidden">
        {loading ? (
          <LoadingSkeleton count={1} height="h-full" />
        ) : (
          <LiveMap
            incidents={incidents}
            resources={resources}
            onSelectIncident={(inc) => setSelectedIncidentId(inc._id)}
            onSelectResource={(res) => setSelectedResourceId(res._id)}
            height="h-full"
          />
        )}
      </div>

      {/* Slide-over Drawers */}
      <IncidentDetailDrawer
        incidentId={selectedIncidentId}
        isOpen={Boolean(selectedIncidentId)}
        onClose={() => setSelectedIncidentId(null)}
        onIncidentUpdated={fetchMapData}
      />

      <ResourceDetailDrawer
        resourceId={selectedResourceId}
        isOpen={Boolean(selectedResourceId)}
        onClose={() => setSelectedResourceId(null)}
        onResourceUpdated={fetchMapData}
      />
    </div>
  );
};
