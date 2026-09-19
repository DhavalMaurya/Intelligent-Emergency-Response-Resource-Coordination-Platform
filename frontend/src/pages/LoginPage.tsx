import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, UserCheck, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Button } from '../components/ui/Button';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, switchRole, demoAccounts } = useAuth();

  const [email, setEmail] = useState<string>('operator@ps9.demo');
  const [password, setPassword] = useState<string>('demo_password_123');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleSelect = async (role: UserRole) => {
    try {
      setLoading(true);
      setError('');
      await switchRole(role);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Failed to switch to demo role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-slate-950 flex flex-col justify-center items-center p-4 selection:bg-rose-500 selection:text-white relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-rose-900/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Terminal Box */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-8 space-y-6 z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center font-bold text-white shadow-lg shadow-rose-950 mx-auto">
            <Shield className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-100 tracking-wider font-display">
            PS-9 EMERGENCY OPERATIONS CENTER
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            COMMAND & RESOURCE COORDINATION TERMINAL
          </p>
        </div>

        {/* Development Warning Notice */}
        <div className="p-3 rounded-lg bg-slate-950 border border-amber-900/50 flex items-start gap-2.5 text-xs text-slate-300">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="font-mono text-[11px] leading-tight text-slate-400">
            <strong>SYNTHETIC DEMO ENVIRONMENT:</strong> Development-gated credentials active. Select a role below for instant terminal access.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono">
            {error}
          </div>
        )}

        {/* Quick Role Switcher Buttons */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold block">
            Select Demo Role Access
          </span>
          <div className="grid grid-cols-2 gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => handleQuickRoleSelect('OPERATOR')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-slate-200">Operator</div>
              <div className="text-[10px] text-slate-400">Triage & Dispatch</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleSelect('CONTROL_ROOM')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-rose-300">Supervisor</div>
              <div className="text-[10px] text-slate-400">Escalation & Overrides</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleSelect('FIELD_TEAM')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-cyan-300">Field Unit</div>
              <div className="text-[10px] text-slate-400">On-Scene Telemetry</div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickRoleSelect('ADMIN')}
              className="p-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-colors"
            >
              <div className="font-bold text-purple-300">System Admin</div>
              <div className="text-[10px] text-slate-400">Full Config & Logs</div>
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-800 w-full" />
          <span className="bg-slate-900 px-3 text-[10px] font-mono text-slate-500 uppercase absolute">
            or manual login
          </span>
        </div>

        {/* Standard Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-mono mb-1 text-[11px]">Authorized Email:</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-mono mb-1 text-[11px]">Security Passkey:</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-2 text-xs font-mono font-bold"
            disabled={loading}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            {loading ? 'Authenticating...' : 'ACCESS COMMAND CONSOLE'}
          </Button>
        </form>
      </div>

      <div className="text-[11px] font-mono text-slate-500 mt-6 text-center">
        PS-9 Intelligent Emergency Response & Resource Coordination Platform &bull; Phase 1
      </div>
    </div>
  );
};
