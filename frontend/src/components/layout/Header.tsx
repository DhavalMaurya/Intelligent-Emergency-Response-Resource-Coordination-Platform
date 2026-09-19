import React, { useState, useEffect } from 'react';
import { Shield, Bell, Clock, Activity, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

interface HeaderProps {
  onOpenHealthModal?: () => void;
  unreadAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHealthModal, unreadAlertsCount = 2 }) => {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatUTC = (d: Date) => {
    return d.toUTCString().replace('GMT', 'UTC');
  };

  const formatLocal = (d: Date) => {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between z-30 sticky top-0">
      {/* Brand & System Operational Indicator */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-bold text-white shadow-md shadow-rose-950">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider text-slate-100 font-display">
              PS-9 EMERGENCY PLATFORM
            </h1>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">CIVIL EMERGENCY OPERATIONS CENTER</p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-1" />

        {/* Civil EOC Operational Status Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          <span className="text-xs font-semibold tracking-wider font-mono text-slate-200">
            SYSTEM STATUS: {connected ? 'OPERATIONAL' : 'OFFLINE / RECONNECTING'}
          </span>
        </div>
      </div>

      {/* Clock, Health shortcut, User Profile */}
      <div className="flex items-center gap-5">
        {/* Real-Time Operational Clock */}
        <div className="hidden lg:flex items-center gap-3 bg-slate-950/80 px-3.5 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <div className="text-right">
            <span className="text-slate-200 font-bold">{formatLocal(time)} LOCAL</span>
            <span className="text-slate-500 ml-2">({time.toISOString().substring(11, 19)}Z)</span>
          </div>
        </div>

        {/* System Health Popover Button */}
        {onOpenHealthModal && (
          <button
            onClick={onOpenHealthModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
            title="Inspect System Health Diagnostics"
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Health</span>
          </button>
        )}

        {/* Alerts Bell Badge */}
        <div className="relative">
          <button className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors relative">
            <Bell className="w-4 h-4" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>
        </div>

        {/* User Role Card & Logout */}
        {user && (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
            <div className="text-right">
              <div className="text-xs font-bold text-slate-200">{user.name}</div>
              <div className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">{user.role}</div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
