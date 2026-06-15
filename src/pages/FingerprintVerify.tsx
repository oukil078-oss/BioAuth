import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Fingerprint, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import Layout from '../components/Layout';
import { verifyFingerprint, isWebAuthnSupported } from '../lib/fingerprint';

export default function FingerprintVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, confidence: faceConfidence } = (location.state || {}) as {
    user?: { id: string; username: string; face_enrolled: boolean; fingerprint_enrolled: boolean; created_at: string; last_login_at: string | null };
    confidence?: number;
  };

  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'denied'>('idle');
  const [error, setError] = useState('');

  if (!user) {
    return (
      <Layout showNav={false}>
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
          <div className="text-center">
            <p className="text-slate-500">Invalid state. Please sign in first.</p>
            <button onClick={() => navigate('/signin')} className="mt-4 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-slate-700 transition-colors">
              Go to Sign In
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const supported = isWebAuthnSupported();

  async function handleVerify() {
    if (!user) return;
    setStatus('verifying');
    setError('');

    const result = await verifyFingerprint(user.id);

    if (result.success && result.verified) {
      setStatus('success');
      setTimeout(() => {
        navigate('/profile', { state: { user, confidence: faceConfidence } });
      }, 1500);
    } else {
      setError(result.error || 'Fingerprint verification failed.');
      setStatus('denied');
    }
  }

  return (
    <Layout showNav={false}>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Fingerprint Verification</h1>
              <p className="text-sm text-slate-500 mt-2">
                Final step: verify your fingerprint to complete sign-in, {user.username}
              </p>
              {faceConfidence && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Face verified ({faceConfidence}%)</span>
                </div>
              )}
            </div>

            {status === 'success' ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">All Biometrics Verified</h2>
                <p className="text-sm text-slate-500 mb-1">Dual-factor biometric authentication complete</p>
                <p className="text-xs text-slate-400">Redirecting to your profile...</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {!supported && (
                  <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-100 text-yellow-800 text-sm rounded-xl px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>WebAuthn is not supported in this browser.</span>
                  </div>
                )}

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-center mb-4">
                    <Fingerprint className={`w-20 h-20 text-amber-500 ${status === 'verifying' ? 'animate-pulse' : ''}`} />
                  </div>
                  <p className="text-center text-sm text-slate-600 font-medium">
                    {status === 'verifying' ? 'Touch your fingerprint sensor now...' : 'Ready for fingerprint scan'}
                  </p>
                </div>

                <button
                  onClick={handleVerify}
                  disabled={!supported || status === 'verifying'}
                  className="w-full bg-amber-600 text-white py-3 rounded-xl font-medium hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {status === 'verifying' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-4 h-4" />
                      Verify Fingerprint
                    </>
                  )}
                </button>

                {status === 'denied' && (
                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => { setStatus('idle'); setError(''); }}
                      className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate('/signin')}
                      className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors text-sm"
                    >
                      Back to Sign In
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
