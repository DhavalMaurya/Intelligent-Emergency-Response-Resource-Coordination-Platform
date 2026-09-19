import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SystemHealthPanel } from '../dashboard/SystemHealthPanel';

export const DashboardLayout: React.FC = () => {
  const [isHealthOpen, setIsHealthOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <Sidebar onOpenHealthModal={() => setIsHealthOpen(true)} />

      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        <Header onOpenHealthModal={() => setIsHealthOpen(true)} />

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950">
          <Outlet />
        </main>
      </div>

      <SystemHealthPanel isOpen={isHealthOpen} onClose={() => setIsHealthOpen(false)} />
    </div>
  );
};
