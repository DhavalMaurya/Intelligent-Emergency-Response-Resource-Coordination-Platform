import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Incident, Resource, Severity } from '../../types';
import { SeverityBadge, StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Eye, Layers, Compass, Crosshair, Activity, Flame, ChevronDown } from 'lucide-react';

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
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [aggregationWindow, setAggregationWindow] = useState<'24h' | '7d' | 'all'>('24h');

  const resetMap = () => {
    setCenter(defaultCenter);
    setZoom(13);
  };

  // Filter incidents for heatmap aggregation window
  const getFilteredHeatmapIncidents = () => {
    if (aggregationWindow === 'all') return incidents.filter((i) => i.status !== 'MERGED');
    const now = Date.now();
    const hours = aggregationWindow === '24h' ? 24 : 168;
    return incidents.filter((i) => {
      if (i.status === 'MERGED') return false;
      const created = new Date(i.createdAt).getTime();
      return now - created <= hours * 60 * 60 * 1000;
    });
  };

  // Find vector pairs between assigned resources and their target incidents
  const vectorPairs: Array<{ from: [number, number]; to: [number, number]; callSign: string; incidentId: string }> = [];
  resources.forEach((res) => {
    if (res.currentIncidentId && res.currentLocation && res.currentLocation.length === 2) {
      const inc = incidents.find((i) => String(i._id) === String(res.currentIncidentId));
      if (inc && inc.location?.coordinates) {
        vectorPairs.push({
          from: [res.currentLocation[1], res.currentLocation[0]],
          to: [inc.location.coordinates[1], inc.location.coordinates[0]],
          callSign: res.identifier,
          incidentId: String(inc._id),
        });
      }
    }
  });

  return (
    <div className={`relative w-full ${height} rounded-xl overflow-hidden border border-slate-800 shadow-xl bg-slate-950 flex flex-col`}>
      {/* Map Header Bar */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5 z-10 backdrop-blur-md shrink-0">
        {/* Left: Title & Operational Counters */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-100 font-display tracking-wider uppercase">
              LIVE OPERATIONS MAP
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 border-l border-slate-800 pl-3 truncate">
            {incidents.length} Incidents • {resources.length} Fleet Units • {vectorPairs.length} Vectors
          </span>
        </div>

        {/* Right: Layer Toggles & Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 flex flex-wrap items-center gap-2.5 text-xs font-mono">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-slate-100">
              <input
                type="checkbox"
                checked={showIncidents}
                onChange={(e) => setShowIncidents(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-rose-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Incidents</span>
            </label>
            <span className="text-slate-800">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-slate-100">
              <input
                type="checkbox"
                checked={showResources}
                onChange={(e) => setShowResources(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Fleet Units</span>
            </label>
            <span className="text-slate-800">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-amber-300 hover:text-amber-100">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Density Heatmap</span>
            </label>
            <span className="text-slate-800">|</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-sky-300 hover:text-sky-100">
              <input
                type="checkbox"
                checked={showVectors}
                onChange={(e) => setShowVectors(e.target.checked)}
                className="rounded border-slate-700 bg-slate-950 text-sky-500 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Vectors</span>
            </label>
          </div>

          {showHeatmap && (
            <div className="relative">
              <select
                value={aggregationWindow}
                onChange={(e: any) => setAggregationWindow(e.target.value)}
                className="bg-slate-950 text-[11px] font-mono text-amber-300 border border-slate-800 rounded-lg pl-2.5 pr-7 py-1 appearance-none focus:outline-none cursor-pointer"
              >
                <option value="24h">24h Heatmap</option>
                <option value="7d">7d Heatmap</option>
                <option value="all">All Active</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          <button
            onClick={resetMap}
            className="bg-slate-950 p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:text-slate-100 hover:bg-slate-850 shadow-sm transition-colors shrink-0"
            title="Recenter Metro Operations Map"
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Map Canvas */}
      <div className="flex-1 w-full min-h-0 relative z-0">
        <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full z-0">
          <MapController center={center} zoom={zoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

        {/* Heatmap Density Overlay Layer */}
        {showHeatmap &&
          getFilteredHeatmapIncidents().map((inc) => {
            const coords: [number, number] = [inc.location.coordinates[1], inc.location.coordinates[0]];
            const radius = inc.severity === 'CRITICAL' ? 600 : inc.severity === 'HIGH' ? 450 : 300;
            const fillColor = inc.severity === 'CRITICAL' ? '#ef4444' : inc.severity === 'HIGH' ? '#f97316' : '#f59e0b';
            return (
              <Circle
                key={`heat-${inc._id}`}
                center={coords}
                radius={radius}
                pathOptions={{
                  fillColor,
                  fillOpacity: 0.3,
                  stroke: true,
                  color: fillColor,
                  weight: 1.5,
                }}
              />
            );
          })}

        {/* Dispatched Unit Vector Polylines */}
        {showVectors &&
          vectorPairs.map((pair, idx) => (
            <Polyline
              key={`vec-${idx}`}
              positions={[pair.from, pair.to]}
              pathOptions={{
                color: '#38bdf8',
                weight: 2,
                dashArray: '6, 8',
                opacity: 0.85,
              }}
            />
          ))}

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
      </div>

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
