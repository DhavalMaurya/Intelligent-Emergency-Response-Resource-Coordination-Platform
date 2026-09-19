import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertOctagon, Search, Filter, Eye, Plus, ArrowUpDown } from 'lucide-react';
import { Incident } from '../types';
import { SeverityBadge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { IncidentDetailDrawer } from '../components/detail/IncidentDetailDrawer';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

export const IncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [severity, setSeverity] = useState<string>('ALL');
  const [status, setStatus] = useState<string>('ALL');
  const [zone, setZone] = useState<string>('ALL');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);

  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (search) params.append('search', search);
      if (severity !== 'ALL') params.append('severity', severity);
      if (status !== 'ALL') params.append('status', status);
      if (zone !== 'ALL') params.append('zone', zone);

      const res = await axios.get(`/api/v1/incidents?${params.toString()}`);
      if (res.data?.data) {
        setIncidents(res.data.data.incidents);
        setTotalPages(res.data.data.pagination.pages);
        setTotalCount(res.data.data.pagination.total);
      }
    } catch (err) {
      console.error('[Incidents] Error fetching incident registry', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, severity, status, zone]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIncidents();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-100 font-display flex items-center gap-2.5">
            <AlertOctagon className="w-6 h-6 text-rose-500" />
            INCIDENT MANAGEMENT & INVESTIGATION REGISTRY
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Civil Emergency Record Database & Dispatch Status &bull; {totalCount} Records Tracked
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by ID, title, street or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
            <Button size="sm" type="submit" variant="secondary">
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Unassigned</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ON_SCENE">On Scene</option>
              <option value="DELAYED">Delayed</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setPage(1);
              }}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none"
            >
              <option value="ALL">All Sectors</option>
              <option value="Sector 1 - Downtown">Sector 1 (Downtown)</option>
              <option value="Sector 2 - Harbour">Sector 2 (Harbour)</option>
              <option value="Sector 3 - Industrial Corridor">Sector 3 (Industrial)</option>
              <option value="Sector 4 - Residential North">Sector 4 (North)</option>
              <option value="Sector 5 - Transit Hub">Sector 5 (Transit Hub)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Incidents Data Table */}
      <Card className="overflow-hidden" bodyClassName="p-0">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} height="h-14" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase">
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Units</th>
                  <th className="py-3 px-4">Reported</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {incidents.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                      No incidents match current filter criteria.
                    </td>
                  </tr>
                ) : (
                  incidents.map((inc) => (
                    <tr
                      key={inc._id}
                      onClick={() => setSelectedIncidentId(inc._id)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-200 whitespace-nowrap">
                        {inc.incidentNumber}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-100 group-hover:text-rose-300 transition-colors truncate">
                          {inc.title}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">{inc.location.address}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300">
                          {inc.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <SeverityBadge severity={inc.severity} size="sm" />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={inc.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-300 font-mono text-[11px]">
                        {inc.location.zone.split(' - ')[0]}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-300">
                        {inc.assignedResources?.length || 0}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                        {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIncidentId(inc._id);
                          }}
                          icon={<Eye className="w-3.5 h-3.5 text-rose-400" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs font-mono text-slate-400">
          <div>
            Showing Page <strong>{page}</strong> of <strong>{totalPages || 1}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200 transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-200 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </Card>

      {/* Drawer */}
      <IncidentDetailDrawer
        incidentId={selectedIncidentId}
        isOpen={Boolean(selectedIncidentId)}
        onClose={() => setSelectedIncidentId(null)}
        onIncidentUpdated={fetchIncidents}
      />
    </div>
  );
};
