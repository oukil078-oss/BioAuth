import { Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';

interface Props {
  stats: {
    total: number;
    active: number;
    inactive: number;
    enrolled: number;
    unknown_detections: number;
  };
}

export default function StatsPanel({ stats }: Props) {
  const cards = [
    { label: 'Total Users', value: stats.total, icon: <Users className="w-4 h-4" />, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: 'Active', value: stats.active, icon: <UserCheck className="w-4 h-4" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: 'Inactive', value: stats.inactive, icon: <UserX className="w-4 h-4" />, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
    { label: 'Unknown Faces', value: stats.unknown_detections, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`${card.bg} border ${card.border} rounded-xl p-4`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`${card.color}`}>{card.icon}</span>
          </div>
          <p className="text-2xl font-bold text-white">{card.value}</p>
          <p className="text-xs text-slate-400 mt-0.5">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
