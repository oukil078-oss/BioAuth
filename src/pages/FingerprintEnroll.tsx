import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import Layout from '../components/Layout';
import { enrollFingerprint, isWebAuthnSupported } from '../lib/fingerprint';

export default function FingerprintEnroll() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userId, username } = (location.state || {}) as { userId?: string; username?: string };

  const [status, setStatus] = useState<'idle' | 'enrolling' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  if (!userId) {
    return (
      <Layout showNav={false}>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="text-center">
            <p className="text-slate-500">Invalid state. Please start from sign up.</p>
            <button onClick={() => navigate('/signup')} className="mt-4 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors">
              Go to Sign Up
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const supported = isWebAuthnSupported();

  async function handleEnroll() {
    if (!userId || !username) return;
    setStatus('enrolling');
    setError('');

    const result = await enrollFingerprint(userId, username);

    if (result.success) {
      setStatus('success');
    } else {
      setError(result.error || 'Enrollment failed');
      setStatus('error');
    }
  }

  return (
    <Layout showNav={false}>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Fingerprint className="w-5 h-5 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Fingerprint Enrollment</h1>
              <p className="text-sm text-slate-500 mt-2">
                {username ? `${username}, ` : ''}register your fingerprint for dual biometric authentication.
              </p>
            </div>

            {!supported && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm rounded-xl px-4 py-3 mb-4">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <span>Your browser does not support fingerprint authentication. Please use Chrome, Edge, or Safari on a device with a fingerprint sensor.</span>
              </div>
            )}

            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Fingerprint Enrolled</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Your fingerprint has been registered. Both face and fingerprint will be required to sign in.
                </p>
                <button
                  onClick={() => navigate('/signin')}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors"
                >
                  Go to Sign In
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <div className="relative">
                      <Fingerprint className={`w-20 h-20 text-amber-500 ${status === 'enrolling' ? 'animate-pulse' : ''}`} />
                      {status === 'enrolling' && (
                        <div className="absolute -bottom-1 -right-1">
                          <Loader2 className="w-6 h-6 text-amber-600 animate-spin" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-sm text-slate-600 font-medium">
                    {status === 'enrolling' ? 'Touch your fingerprint sensor now...' : 'Ready to scan your fingerprint'}
                  </p>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    Uses your device's built-in biometric sensor (fingerprint reader, Touch ID, Windows Hello)
                  </p>
                </div>

                <button
                  onClick={handleEnroll}
                  disabled={!supported || status === 'enrolling'}
                  className="w-full bg-amber-600 text-white py-3 rounded-xl font-medium hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {status === 'enrolling' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Waiting for fingerprint...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Enroll Fingerprint
                    </>
                  )}
                </button>

                {status === 'error' && (
                  <button
                    onClick={() => { setStatus('idle'); setError(''); }}
                    className="w-full mt-3 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
