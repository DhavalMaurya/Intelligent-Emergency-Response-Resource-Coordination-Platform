import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Incident, Resource, Severity } from '../../types';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Eye, Layers, Compass, Crosshair } from 'lucide-react';

interface LiveMapProps {
  incidents: Incident[];
  resources: Resource[];
  onSelectIncident?: (incident: Incident) => void;
  onSelectResource?: (resource: Resource) => void;
  height?: string;
}

// Custom SVG DivIcon generators for clean EOC dark-mode appearance
const createIncidentIcon = (severity: Severity) => {
  const colorMap: Record<Severity, { fill: string; stroke: string; pulse: boolean }> = {
    CRITICAL: { fill: '#ef4444', stroke: '#fca5a5', pulse: true },
    HIGH: { fill: '#f97316', stroke: '#fdba74', pulse: false },
    MEDIUM: { fill: '#f59e0b', stroke: '#fde68a', pulse: false },
    LOW: { fill: '#10b981', stroke: '#6ee7b7', pulse: false },
  };

  const c = colorMap[severity] || colorMap.MEDIUM;

  const html = `
    <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
      ${
        c.pulse
          ? `<div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: ${c.fill}; opacity: 0.7; animation: beaconPulse 1.8s infinite;"></div>`
          : ''
      }
      <div style="width: 20px; height: 20px; border-radius: 50%; background: ${c.fill}; border: 2px solid ${c.stroke}; box-shadow: 0 0 10px rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center;">
        <div style="width: 6px; height: 6px; border-radius: 50%; background: white;"></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-eoc-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const createResourceIcon = (type: Resource['type'], status: Resource['status']) => {
  const isAvailable = status === 'AVAILABLE';
  const stroke = isAvailable ? '#10b981' : '#38bdf8';

  const html = `
    <div style="width: 22px; height: 22px; border-radius: 4px; background: #0f172a; border: 2px solid ${stroke}; box-shadow: 0 2px 8px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: ${stroke}; font-family: monospace;">
      ${type === 'AMBULANCE' ? '🚑' : type === 'FIRE_TRUCK' ? '🚒' : type === 'POLICE_UNIT' ? '🚓' : '🛡️'}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-resource-marker',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// Recenter Control Helper
const MapController: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  React.useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const LiveMap: React.FC<LiveMapProps> = ({
  incidents,
  resources,
  onSelectIncident,
  onSelectResource,
  height = 'h-[460px]',
}) => {
  const defaultCenter: [number, number] = [37.7749, -122.4194]; // Simulated Metro center
  const [center, setCenter] = useState<[number, number]>(defaultCenter);
  const [zoom, setZoom] = useState<number>(13);
  const [showIncidents, setShowIncidents] = useState<boolean>(true);
  const [showResources, setShowResources] = useState<boolean>(true);

  const resetMap = () => {
    setCenter(defaultCenter);
    setZoom(13);
  };

  return (
    <div className={`relative w-full ${height} rounded-lg overflow-hidden border border-slate-800 shadow-xl bg-slate-950`}>
      {/* Map Header Overlay */}
      <div className="absolute top-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-800 shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-100 font-display tracking-wider uppercase">
            LIVE OPERATIONS MAP
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 border-l border-slate-700 pl-2">
          {incidents.length} Incidents | {resources.length} Units
        </span>
      </div>

      {/* Layer Filters & Recenter Controls Overlay */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 shadow-lg flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showIncidents}
              onChange={(e) => setShowIncidents(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Incidents</span>
          </label>
          <span className="text-slate-700">|</span>
          <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-slate-100">
            <input
              type="checkbox"
              checked={showResources}
              onChange={(e) => setShowResources(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Fleet Units</span>
          </label>
        </div>

        <button
          onClick={resetMap}
          className="bg-slate-900/90 backdrop-blur-md p-2 rounded-lg border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-800 shadow-lg transition-colors"
          title="Recenter Metro Operations Map"
        >
          <Crosshair className="w-4 h-4" />
        </button>
      </div>

      {/* Map Container */}
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full z-0">
        <MapController center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Incidents Markers */}
        {showIncidents &&
          incidents.map((inc) => {
            const coords: [number, number] = [inc.location.coordinates[1], inc.location.coordinates[0]];
            return (
              <Marker key={inc._id} position={coords} icon={createIncidentIcon(inc.severity)}>
                <Popup>
                  <div className="p-1 space-y-2 min-w-[240px]">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-700/60 pb-1.5">
                      <span className="font-mono text-xs font-bold text-slate-200">{inc.incidentNumber}</span>
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-slate-100 leading-tight">{inc.title}</div>
                    <div className="text-[11px] text-slate-400">{inc.location.address} ({inc.location.zone})</div>
                    <div className="flex items-center justify-between text-[11px] font-mono pt-1">
                      <StatusBadge status={inc.status} size="sm" />
                      <span className="text-slate-400">Casualties: {inc.casualtiesCount}</span>
                    </div>
                    {onSelectIncident && (
                      <Button
                        size="sm"
                        variant="primary"
                        className="w-full mt-2"
                        icon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => onSelectIncident(inc)}
                      >
                        Inspect Incident
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Resources Fleet Markers */}
        {showResources &&
          resources.map((res) => {
            const coords: [number, number] = [res.currentLocation[1], res.currentLocation[0]];
            return (
              <Marker key={res._id} position={coords} icon={createResourceIcon(res.type, res.status)}>
                <Popup>
                  <div className="p-1 space-y-1.5 min-w-[210px]">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1">
                      <span className="font-mono text-xs font-bold text-slate-200">{res.identifier}</span>
                      <StatusBadge status={res.status} size="sm" />
                    </div>
                    <div className="text-xs font-bold text-slate-100">{res.name}</div>
                    <div className="text-[11px] text-slate-400">{res.baseStation}</div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Cap: {res.capacity} | Crew: {res.crewCount} | Fuel: {res.fuelLevelPercent || 100}%
                    </div>
                    {onSelectResource && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full mt-1.5"
                        onClick={() => onSelectResource(res)}
                      >
                        Inspect Unit
                      </Button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* Map Legend at Bottom Left */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-slate-300">Critical</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-slate-300">High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-slate-300">Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-300">Low</span>
        </div>
      </div>
    </div>
  );
};
