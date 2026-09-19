import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FilterProvider } from './context/FilterContext';
import { SocketProvider } from './context/SocketContext';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingSkeleton } from './components/ui/LoadingSkeleton';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center p-8">
        <LoadingSkeleton count={3} height="h-20" className="w-96" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FilterProvider>
          <SocketProvider>
            <Routes>
              {/* Authentication */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected Operations Command Center Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="incidents" element={<IncidentsPage />} />
                <Route path="resources" element={<ResourcesPage />} />
                <Route path="map" element={<MapPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="ai-assistant" element={<AIAssistantPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </SocketProvider>
        </FilterProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
