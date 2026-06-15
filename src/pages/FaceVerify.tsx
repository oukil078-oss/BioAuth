import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { loadModels, detectFace, detectFaceCount, descriptorToArray } from '../lib/faceDetection';
import { verifyFace } from '../lib/supabase';

type Status = 'loading_models' | 'requesting_camera' | 'ready' | 'processing' | 'success' | 'denied' | 'error';

export default function FaceVerify() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = (location.state || {}) as {
    user?: {
      id: string;
      username: string;
      face_enrolled: boolean;
      created_at: string;
      last_login_at: string | null;
    };
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);

  const [status, setStatus] = useState<Status>('loading_models');
  const [error, setError] = useState('');
  const [faceCount, setFaceCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        await loadModels();
        if (cancelled) return;

        setStatus('requesting_camera');

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(reject);
          };
          video.onerror = () => reject(new Error('Video element error'));
        });

        if (cancelled) return;
        setCameraReady(true);
        setStatus('ready');
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('Denied')) {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else {
          setError(`Initialization failed: ${msg}`);
        }
        setStatus('error');
      }
    }

    init();

    return () => {
      cancelled = true;
      detectingRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [user, navigate]);

  useEffect(() => {
    if (!cameraReady || status !== 'ready') return;
    detectingRef.current = true;

    let timeoutId: ReturnType<typeof setTimeout>;

    async function poll() {
      if (!detectingRef.current) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const count = await detectFaceCount(video);
          if (detectingRef.current) setFaceCount(count);
        } catch {
          // silent
        }
      }
      if (detectingRef.current) {
        timeoutId = setTimeout(poll, 400);
      }
    }

    poll();
    return () => {
      detectingRef.current = false;
      clearTimeout(timeoutId);
    };
  }, [cameraReady, status]);

  const handleVerify = useCallback(async () => {
    if (!videoRef.current || !user || status !== 'ready') return;

    detectingRef.current = false;
    setStatus('processing');
    setError('');

    try {
      const video = videoRef.current;
      const currentCount = await detectFaceCount(video);

      if (currentCount === 0) {
        setError('No face detected. Please position your face in the frame.');
        setStatus('ready');
        return;
      }
      if (currentCount > 1) {
        setError('Multiple faces detected. Ensure only your face is visible.');
        setStatus('ready');
        return;
      }

      const result = await detectFace(video);
      if (!result) {
        setError('Could not extract face features. Adjust lighting and try again.');
        setStatus('ready');
        return;
      }

      const descriptor = descriptorToArray(result.descriptor);
      const response = await verifyFace(user.id, descriptor);

      streamRef.current?.getTracks().forEach((t) => t.stop());

      if (response.verified) {
        setConfidence(response.confidence);
        setStatus('success');
        setTimeout(() => {
          navigate('/fingerprint-verify', { state: { user: response.user, confidence: response.confidence } });
        }, 2000);
      } else {
        setConfidence(response.confidence || 0);
        setError(response.error || 'Face verification failed.');
        setStatus('denied');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setStatus('ready');
    }
  }, [user, status, navigate]);

  if (!user) return null;

  const isTerminal = status === 'success' || status === 'denied';

  return (
    <Layout showNav={false}>
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Face Verification</h1>
              <p className="text-sm text-slate-500 mt-2">
                Verify your identity to complete sign-in, {user.username}
              </p>
            </div>

            {status === 'success' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-50 border border-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Identity Verified</h2>
                <p className="text-sm text-slate-500 mb-1">Confidence score: {confidence}%</p>
                <p className="text-xs text-slate-400">Redirecting to your profile\u2026</p>
              </div>
            )}

            {status === 'denied' && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-50 border border-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
                <p className="text-sm text-red-600 mb-2">{error}</p>
                <p className="text-xs text-slate-500 mb-6">Match confidence: {confidence}%</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>
                  <button
                    onClick={() => navigate('/signin')}
                    className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {!isTerminal && (
              <>
                {error && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-4">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="relative rounded-xl overflow-hidden bg-slate-900 mb-4 aspect-[4/3]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />

                  {!cameraReady && (
                    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                      <p className="text-sm text-slate-300 font-medium">
                        {status === 'loading_models' ? 'Loading AI models\u2026' : 'Starting camera\u2026'}
                      </p>
                      <p className="text-xs text-slate-500 text-center max-w-[200px]">
                        {status === 'loading_models'
                          ? 'Preparing facial recognition engine'
                          : 'Please allow camera permission'}
                      </p>
                    </div>
                  )}

                  {cameraReady && (
                    <>
                      <div className="absolute inset-0 border-2 border-teal-400/50 rounded-xl pointer-events-none" />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1">
                        <div
                          className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                            faceCount === 1
                              ? 'bg-green-400'
                              : faceCount > 1
                              ? 'bg-yellow-400'
                              : 'bg-red-400'
                          }`}
                        />
                        <span className="text-xs text-white font-medium">
                          {faceCount === 1
                            ? 'Face detected'
                            : faceCount > 1
                            ? `${faceCount} faces \u2014 remove others`
                            : 'No face detected'}
                        </span>
                      </div>
                    </>
                  )}

                  {status === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                        <p className="text-sm text-white font-medium">Verifying identity\u2026</p>
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-500 text-center mb-4">
                  Look directly at the camera. Match the angle used during enrollment.
                </p>

                {status === 'error' ? (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full inline-flex items-center justify-center gap-2 border border-slate-300 text-slate-700 py-3 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                ) : (
                  <button
                    onClick={handleVerify}
                    disabled={status !== 'ready' || faceCount !== 1}
                    className="w-full bg-teal-600 text-white py-3 rounded-xl font-medium hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify Face
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
