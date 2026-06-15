import { Shield, Camera, Users, Activity, Settings, ChevronLeft } from 'lucide-react';
import type { AdminView } from '../../pages/AdminDashboard';

interface Props {
  currentView: AdminView;
  onViewChange: (view: AdminView) => void;
  open: boolean;
  onToggle: () => void;
}

const navItems: { id: AdminView; label: string; icon: React.ReactNode }[] = [
  { id: 'surveillance', label: 'Live Monitor', icon: <Camera className="w-4 h-4" /> },
  { id: 'users', label: 'User Management', icon: <Users className="w-4 h-4" /> },
  { id: 'events', label: 'Event Log', icon: <Activity className="w-4 h-4" /> },
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminSidebar({ currentView, onViewChange, open, onToggle }: Props) {
  return (
    <aside className={`${open ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-300 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0`}>
      <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">BioAuth</p>
            <p className="text-[10px] text-slate-500 leading-tight">ADMIN PANEL</p>
          </div>
        </div>
        <button onClick={onToggle} className="text-slate-500 hover:text-slate-300 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              currentView === item.id
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
          <p className="text-[10px] text-amber-400 font-semibold uppercase tracking-wider">Demo Mode</p>
          <p className="text-[10px] text-amber-300/60 mt-0.5">Authorized testing only</p>
        </div>
      </div>
    </aside>
  );
}
