import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  AlertOctagon,
  Truck,
  MapPin,
  Bell,
  BarChart3,
  Bot,
  Settings,
  Activity,
  Layers,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  onOpenHealthModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenHealthModal }) => {
  const { user } = useAuth();

  const navItems = [
    { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
    { to: '/incidents', label: 'Incidents', icon: AlertOctagon },
    { to: '/resources', label: 'Resources & Fleet', icon: Truck },
    { to: '/map', label: 'Live Operations Map', icon: MapPin },
    { to: '/alerts', label: 'Alerts & Escalations', icon: Bell },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/ai-assistant', label: 'AI Command Assistant', icon: Bot },
  ];

  if (user?.role === 'ADMIN' || user?.role === 'CONTROL_ROOM') {
    navItems.push({ to: '/settings', label: 'System Settings', icon: Settings });
  }

  return (
    <aside className="w-56 xl:w-64 bg-slate-900/95 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none backdrop-blur-md">
      <div className="py-4">
        <div className="px-4 xl:px-5 mb-4">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500">
            OPERATIONAL NAVIGATION
          </span>
        </div>

        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-rose-600/15 text-rose-400 border border-rose-600/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Health Diagnostics Pill at Bottom */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <button
          onClick={onOpenHealthModal}
          className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-900 hover:bg-slate-800/80 border border-slate-800 text-left transition-colors group"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-[11px] font-bold text-slate-200">System Diagnostics</div>
              <div className="text-[9px] text-slate-400 font-mono">EOC Services Online</div>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">99.9%</span>
        </button>
      </div>
    </aside>
  );
};
