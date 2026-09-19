import React, { createContext, useContext, useState } from 'react';
import { GlobalFilterState, Severity, IncidentType, IncidentStatus, ResourceType } from '../types';

interface FilterContextType {
  filters: GlobalFilterState;
  setTimeRange: (timeRange: GlobalFilterState['timeRange']) => void;
  setSeverity: (severity: GlobalFilterState['severity']) => void;
  setType: (type: GlobalFilterState['type']) => void;
  setStatus: (status: GlobalFilterState['status']) => void;
  setZone: (zone: string) => void;
  setResourceType: (resourceType: GlobalFilterState['resourceType']) => void;
  resetFilters: () => void;
  isFiltered: boolean;
}

const defaultFilters: GlobalFilterState = {
  timeRange: '24h',
  severity: 'ALL',
  type: 'ALL',
  status: 'ALL',
  zone: 'ALL',
  resourceType: 'ALL',
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilterState>(defaultFilters);

  const setTimeRange = (timeRange: GlobalFilterState['timeRange']) => setFilters((f) => ({ ...f, timeRange }));
  const setSeverity = (severity: GlobalFilterState['severity']) => setFilters((f) => ({ ...f, severity }));
  const setType = (type: GlobalFilterState['type']) => setFilters((f) => ({ ...f, type }));
  const setStatus = (status: GlobalFilterState['status']) => setFilters((f) => ({ ...f, status }));
  const setZone = (zone: string) => setFilters((f) => ({ ...f, zone }));
  const setResourceType = (resourceType: GlobalFilterState['resourceType']) => setFilters((f) => ({ ...f, resourceType }));

  const resetFilters = () => setFilters(defaultFilters);

  const isFiltered =
    filters.timeRange !== '24h' ||
    filters.severity !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.status !== 'ALL' ||
    filters.zone !== 'ALL' ||
    filters.resourceType !== 'ALL';

  return (
    <FilterContext.Provider
      value={{
        filters,
        setTimeRange,
        setSeverity,
        setType,
        setStatus,
        setZone,
        setResourceType,
        resetFilters,
        isFiltered,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) throw new Error('useFilters must be used within a FilterProvider');
  return context;
};
