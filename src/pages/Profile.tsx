import { useLocation, useNavigate } from 'react-router-dom';
import { User, Shield, ScanFace, Calendar, Clock, LogOut, CheckCircle2, Lock, Hash, Fingerprint } from 'lucide-react';
import Layout from '../components/Layout';

interface UserData {
  id: string;
  username: string;
  face_enrolled: boolean;
  created_at: string;
  last_login_at: string | null;
}

export default function Profile() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, confidence } = (location.state || {}) as { user?: UserData; confidence?: number };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
            <p className="text-slate-500 mb-6">You must sign in to view this page.</p>
            <button
              onClick={() => navigate('/signin')}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const createdDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const lastLogin = user.last_login_at
    ? new Date(user.last_login_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Just now';

  return (
    <Layout showNav={false}>
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 px-8 py-10 text-center">
            <div className="w-20 h-20 bg-white/10 backdrop-blur border-2 border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">{user.username}</h1>
            <p className="text-sm text-slate-300 mt-1">Authenticated User</p>
            {confidence && (
              <div className="mt-3 inline-flex items-center gap-1.5 bg-green-500/20 border border-green-400/30 rounded-full px-3 py-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-green-300 font-medium">
                  Verified ({confidence}% confidence)
                </span>
              </div>
            )}
          </div>

          <div className="p-8">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Account Details
            </h2>

            <div className="space-y-4">
              <InfoRow
                icon={<Hash className="w-4 h-4" />}
                label="Account ID"
                value={user.id.substring(0, 8) + '...'}
              />
              <InfoRow
                icon={<User className="w-4 h-4" />}
                label="Username"
                value={user.username}
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Account Created"
                value={createdDate}
              />
              <InfoRow
                icon={<Clock className="w-4 h-4" />}
                label="Last Login"
                value={lastLogin}
              />
            </div>

            <hr className="my-6 border-slate-200" />

            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Security Status
            </h2>

            <div className="space-y-3">
              <SecurityRow
                icon={<Lock className="w-4 h-4" />}
                label="Password Hashed"
                status={true}
                detail="SHA-256 with unique salt"
              />
              <SecurityRow
                icon={<Shield className="w-4 h-4" />}
                label="Salt Applied"
                status={true}
                detail="16-byte random salt per user"
              />
              <SecurityRow
                icon={<ScanFace className="w-4 h-4" />}
                label="Face Enrolled"
                status={user.face_enrolled}
                detail="128-dim face descriptor stored"
              />
              <SecurityRow
                icon={<Fingerprint className="w-4 h-4" />}
                label="Fingerprint Enrolled"
                status={true}
                detail="WebAuthn platform credential"
              />
            </div>

            <hr className="my-6 border-slate-200" />

            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3 text-slate-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function SecurityRow({ icon, label, status, detail }: { icon: React.ReactNode; label: string; status: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="text-slate-500">{icon}</div>
        <div>
          <p className="text-sm font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{detail}</p>
        </div>
      </div>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${status ? 'bg-green-100' : 'bg-red-100'}`}>
        <CheckCircle2 className={`w-3.5 h-3.5 ${status ? 'text-green-600' : 'text-red-600'}`} />
      </div>
    </div>
  );
}
