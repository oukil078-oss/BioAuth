import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout';
import { validateUsername, validatePassword } from '../lib/validation';
import { signUp } from '../lib/supabase';

export default function SignUp() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const usernameError = username ? validateUsername(username) : null;
  const passwordError = password ? validatePassword(password) : null;
  const isValid = !validateUsername(username) && !validatePassword(password);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError('');

    const result = await signUp(username, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    if (result.success && result.user) {
      navigate('/face-enroll', { state: { userId: result.user.id, username: result.user.username } });
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-5 h-5 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
              <p className="text-sm text-slate-500 mt-2">
                Register your credentials, then enroll your face
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="AbCdE"
                  maxLength={5}
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
                />
                <ValidationHint value={username} error={usernameError} hint="Exactly 5 letters (A-Z, a-z)" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Abc123De"
                    maxLength={8}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <ValidationHint value={password} error={passwordError} hint="Exactly 8 characters (letters and numbers)" />
              </div>

              <button
                type="submit"
                disabled={!isValid || loading}
                className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  'Continue to Face Enrollment'
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/signin" className="text-teal-600 font-medium hover:text-teal-700">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function ValidationHint({ value, error, hint }: { value: string; error: string | null; hint: string }) {
  if (!value) {
    return <p className="mt-1.5 text-xs text-slate-400">{hint}</p>;
  }
  if (error) {
    return (
      <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
        <AlertCircle className="w-3 h-3" />
        {error}
      </p>
    );
  }
  return (
    <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Valid
    </p>
  );
}
