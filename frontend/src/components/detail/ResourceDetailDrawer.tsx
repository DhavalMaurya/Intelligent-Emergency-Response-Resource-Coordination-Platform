import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, MapPin, Fuel, Shield, Wrench, Clock, CheckCircle } from 'lucide-react';
import { Resource, Incident } from '../../types';
import { Drawer } from '../ui/Drawer';
import { StatusBadge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface ResourceDetailDrawerProps {
  resourceId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onResourceUpdated?: () => void;
}

export const ResourceDetailDrawer: React.FC<ResourceDetailDrawerProps> = ({
  resourceId,
  isOpen,
  onClose,
  onResourceUpdated,
}) => {
  const [resource, setResource] = useState<Resource | null>(null);
  const [history, setHistory] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);

  const fetchResourceDetails = async () => {
    if (!resourceId) return;
    try {
      setLoading(true);
      const res = await axios.get(`/api/v1/resources/${resourceId}`);
      if (res.data?.data) {
        setResource(res.data.data.resource);
        setHistory(res.data.data.history || []);
      }
    } catch (err) {
      console.error('[ResourceDetail] Error fetching unit details', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && resourceId) {
      fetchResourceDetails();
    }
  }, [isOpen, resourceId]);

  const handleStatusChange = async (newStatus: Resource['status']) => {
    if (!resource) return;
    try {
      setUpdating(true);
      await axios.patch(`/api/v1/resources/${resource._id}/status`, { status: newStatus });
      await fetchResourceDetails();
      onResourceUpdated?.();
    } catch (err) {
      console.error('[Status Change Error]', err);
    } finally {
      setUpdating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        resource ? (
          <span className="flex items-center gap-2">
            <span className="font-mono text-base">{resource.identifier}</span>
            <span className="text-xs text-slate-400">({resource.type.replace(/_/g, ' ')})</span>
          </span>
        ) : (
          'Resource Fleet Unit'
        )
      }
      subtitle={resource?.name}
      badge={resource ? <StatusBadge status={resource.status} size="sm" /> : undefined}
      width="lg"
    >
      {loading || !resource ? (
        <LoadingSkeleton count={4} height="h-24" />
      ) : (
        <div className="space-y-6 text-xs">
          {/* Status and Specs Card */}
          <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Base Station</span>
              <span className="font-bold text-slate-200">{resource.baseStation}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Assigned Sector</span>
              <span className="font-bold text-slate-200">{resource.zone}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Crew Readiness</span>
              <span className="font-bold text-slate-200">{resource.crewCount} Personnel</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] uppercase">Fuel Level</span>
              <span className="font-bold text-emerald-400">{resource.fuelLevelPercent || 90}%</span>
            </div>
          </div>

          {/* Quick Status Toggle for Field Teams / Operators */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide block">
              Unit Operational Status Control
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['AVAILABLE', 'EN_ROUTE', 'ON_SCENE', 'MAINTENANCE'] as Resource['status'][]).map((st) => (
                <button
                  key={st}
                  disabled={updating || resource.status === st}
                  onClick={() => handleStatusChange(st)}
                  className={`px-2 py-1.5 rounded text-[11px] font-mono font-bold transition-all ${
                    resource.status === st
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Capabilities & Equipment Tags */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              Certified Capabilities & Equipment
            </span>
            <div className="flex flex-wrap gap-2">
              {resource.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300"
                >
                  ✓ {cap.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Current Incident Dispatch */}
          {resource.currentIncidentId && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-900/60 space-y-1.5">
              <span className="text-[10px] font-mono uppercase text-rose-400 font-bold block">
                Active Emergency Dispatch
              </span>
              <div className="text-sm font-bold text-slate-100">
                {resource.currentIncidentId.incidentNumber} - {resource.currentIncidentId.title}
              </div>
              <div className="text-[11px] text-slate-300">
                Current Unit State: <strong className="text-rose-400">{resource.status}</strong>
              </div>
            </div>
          )}

          {/* Recent Mission History */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-200 font-display uppercase tracking-wide">
              Recent Deployment History
            </span>
            {history.length === 0 ? (
              <div className="text-slate-500 text-xs">No prior deployment records logged.</div>
            ) : (
              <div className="space-y-2">
                {history.map((inc) => (
                  <div key={inc._id} className="p-2.5 rounded bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-slate-200">{inc.incidentNumber}</span>
                      <div className="text-[11px] text-slate-400">{inc.title}</div>
                    </div>
                    <StatusBadge status={inc.status} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
};
