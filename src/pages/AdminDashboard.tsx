import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminSidebar from '../components/admin/AdminSidebar';
import AdminTopBar from '../components/admin/AdminTopBar';
import CameraView from '../components/admin/CameraView';
import StatsPanel from '../components/admin/StatsPanel';
import UserTable from '../components/admin/UserTable';
import EventFeed from '../components/admin/EventFeed';
import { adminGetStats, adminGetUsers, adminGetEvents } from '../lib/supabase';

export type AdminView = 'surveillance' | 'users' | 'events' | 'settings';

interface Stats {
  total: number;
  active: number;
  inactive: number;
  enrolled: number;
  unknown_detections: number;
}

export interface AdminUser {
  id: string;
  username: string;
  face_enrolled: boolean;
  fingerprint_enrolled: boolean;
  account_status: string;
  is_admin: boolean;
  display_label: string | null;
  last_seen_at: string | null;
  recognition_count: number;
  created_at: string;
  last_login_at: string | null;
}

export interface RecognitionEvent {
  id: string;
  matched_user_id: string | null;
  matched_username: string | null;
  is_unknown: boolean;
  confidence: number | null;
  camera_session_id: string | null;
  detected_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AdminView>('surveillance');
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, inactive: 0, enrolled: 0, unknown_detections: 0 });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<RecognitionEvent[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const admin = sessionStorage.getItem('admin');
  const adminData = admin ? JSON.parse(admin) : null;

  useEffect(() => {
    if (!adminData) {
      navigate('/admin');
      return;
    }
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    const [statsRes, usersRes, eventsRes] = await Promise.all([
      adminGetStats(),
      adminGetUsers(),
      adminGetEvents(),
    ]);
    if (statsRes.total !== undefined) setStats(statsRes);
    if (usersRes.users) setUsers(usersRes.users);
    if (eventsRes.events) setEvents(eventsRes.events);
  }

  function handleLogout() {
    sessionStorage.removeItem('admin');
    navigate('/admin');
  }

  if (!adminData) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <AdminSidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      <div className="flex-1 flex flex-col min-h-screen">
        <AdminTopBar
          admin={adminData}
          onLogout={handleLogout}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 p-6 overflow-y-auto">
          {currentView === 'surveillance' && (
            <div className="space-y-6">
              <StatsPanel stats={stats} />
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2">
                  <CameraView adminId={adminData.id} users={users} onEvent={loadData} />
                </div>
                <div>
                  <EventFeed events={events} compact />
                </div>
              </div>
            </div>
          )}

          {currentView === 'users' && (
            <UserTable users={users} onRefresh={loadData} />
          )}

          {currentView === 'events' && (
            <EventFeed events={events} />
          )}

          {currentView === 'settings' && (
            <div className="max-w-2xl">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Dashboard Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-200">Face Match Threshold</p>
                      <p className="text-xs text-slate-500">Lower = stricter matching (0.42 = very strict)</p>
                    </div>
                    <span className="text-sm font-mono text-emerald-400">0.42</span>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b border-slate-800">
                    <div>
                      <p className="text-sm font-medium text-slate-200">Auto-refresh Interval</p>
                      <p className="text-xs text-slate-500">Dashboard data refresh rate</p>
                    </div>
                    <span className="text-sm font-mono text-emerald-400">10s</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-200">Recognition Mode</p>
                      <p className="text-xs text-slate-500">Dual biometric (face + fingerprint)</p>
                    </div>
                    <span className="text-sm font-mono text-emerald-400">Enabled</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6">
                <h3 className="text-sm font-semibold text-amber-400 mb-2">Demo Environment Notice</h3>
                <p className="text-xs text-amber-300/70 leading-relaxed">
                  This surveillance dashboard operates within a controlled classroom/demo environment for authorized testing only.
                  All recognition activities are monitored and logged. This system is not intended for unauthorized surveillance of any individual.
                  Usage must comply with applicable privacy laws and institutional consent policies.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
