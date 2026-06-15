import { LogOut, Menu, Radio } from 'lucide-react';

interface Props {
  admin: { id: string; username: string };
  onLogout: () => void;
  onToggleSidebar: () => void;
}

export default function AdminTopBar({ admin, onLogout, onToggleSidebar }: Props) {
  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="text-slate-400 hover:text-white transition-colors lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-white">{admin.username}</p>
          <p className="text-[10px] text-slate-500">Administrator</p>
        </div>
        <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-emerald-400">{admin.username[0]?.toUpperCase()}</span>
        </div>
        <button
          onClick={onLogout}
          className="text-slate-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
