import { useState } from 'react';
import { Search, UserCheck, UserX, Shield, Fingerprint, ScanFace } from 'lucide-react';
import { adminUpdateStatus } from '../../lib/supabase';
import type { AdminUser } from '../../pages/AdminDashboard';

interface Props {
  users: AdminUser[];
  onRefresh: () => void;
}

export default function UserTable({ users, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');

  const filtered = users.filter((u) => {
    if (filter !== 'all' && u.account_status !== filter) return false;
    if (search && !u.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function toggleStatus(user: AdminUser) {
    const newStatus = user.account_status === 'active' ? 'inactive' : 'active';
    await adminUpdateStatus(user.id, newStatus);
    onRefresh();
  }

  async function suspendUser(user: AdminUser) {
    await adminUpdateStatus(user.id, 'suspended');
    onRefresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">User Management</h2>
        <span className="text-xs text-slate-500">{filtered.length} users</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50"
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {(['all', 'active', 'inactive', 'suspended'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">User</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Biometrics</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Last Seen</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Recognitions</th>
                <th className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-300">{user.username[0]?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{user.username}</p>
                        {user.is_admin && <span className="text-[10px] text-emerald-400 font-medium">ADMIN</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={user.account_status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`${user.face_enrolled ? 'text-emerald-400' : 'text-slate-600'}`} title="Face">
                        <ScanFace className="w-4 h-4" />
                      </span>
                      <span className={`${user.fingerprint_enrolled ? 'text-amber-400' : 'text-slate-600'}`} title="Fingerprint">
                        <Fingerprint className="w-4 h-4" />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-400">
                      {user.last_seen_at ? new Date(user.last_seen_at).toLocaleString() : 'Never'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-slate-300">{user.recognition_count}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {!user.is_admin && (
                        <>
                          <button
                            onClick={() => toggleStatus(user)}
                            className="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
                            title={user.account_status === 'active' ? 'Deactivate' : 'Activate'}
                          >
                            {user.account_status === 'active' ? (
                              <UserX className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </button>
                          {user.account_status !== 'suspended' && (
                            <button
                              onClick={() => suspendUser(user)}
                              className="p-1.5 rounded-md hover:bg-slate-700 transition-colors"
                              title="Suspend"
                            >
                              <Shield className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-sm text-slate-500">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  const style = styles[status as keyof typeof styles] || styles.inactive;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${style}`}>
      {status}
    </span>
  );
}
