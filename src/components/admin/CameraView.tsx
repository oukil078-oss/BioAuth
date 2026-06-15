import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RefreshCw, Radio, ShieldAlert, X } from 'lucide-react';
import { loadModels, detectAllFacesWithDescriptors, euclideanDistance, STRICT_MATCH_THRESHOLD } from '../../lib/faceDetection';
import { adminGetEnrolledFaces, adminLogRecognition } from '../../lib/supabase';
import { isMirroredOnXAxis, mapDetectionBoxToOverlay } from '../../lib/faceOverlayGeometry';
import type { AdminUser } from '../../pages/AdminDashboard';

interface EnrolledFace {
  user_id: string;
  username: string;
  account_status: string;
  is_admin: boolean;
  display_label: string | null;
  face_descriptor: number[];
}

interface FaceOverlay {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  status: 'known' | 'unknown' | 'admin';
  accountStatus?: string;
  adminTag?: string;
}

interface Props {
  adminId: string;
  users: AdminUser[];
  onEvent: () => void;
}

export default function CameraView({ adminId, onEvent }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectingRef = useRef(false);
  const sessionIdRef = useRef(crypto.randomUUID());
  const lastLoggedRef = useRef<Map<string, number>>(new Map());
  const enrolledFacesRef = useRef<EnrolledFace[]>([]);

  const [cameraActive, setCameraActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [overlays, setOverlays] = useState<FaceOverlay[]>([]);
  const [faceCount, setFaceCount] = useState(0);
  const [showDebugOverlay, setShowDebugOverlay] = useState(false);

  useEffect(() => {
    loadModels().then(() => setModelsReady(true));
    loadEnrolledFaces();
  }, []);

  async function loadEnrolledFaces() {
    const res = await adminGetEnrolledFaces();
    if (res.faces) {
      enrolledFacesRef.current = res.faces;
    }
  }

  const startCamera = useCallback(async () => {
    setLoading(true);
    try {
      await loadEnrolledFaces();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => { video.play().then(resolve); };
      });
      setCameraActive(true);
      detectingRef.current = true;
      runDetection();
    } catch {
      setCameraActive(false);
    }
    setLoading(false);
  }, []);

  const stopCamera = useCallback(() => {
    detectingRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setOverlays([]);
    setFaceCount(0);
  }, []);

  function matchFace(descriptor: Float32Array): { matched: boolean; face?: EnrolledFace; distance: number } {
    let bestMatch: EnrolledFace | undefined;
    let bestDistance = Infinity;

    const faces = enrolledFacesRef.current;
    for (const face of faces) {
      const dist = euclideanDistance(descriptor, new Float32Array(face.face_descriptor));
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = face;
      }
    }

    if (bestDistance < STRICT_MATCH_THRESHOLD && bestMatch) {
      return { matched: true, face: bestMatch, distance: bestDistance };
    }
    return { matched: false, distance: bestDistance };
  }

  async function runDetection() {
    if (!detectingRef.current || !videoRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth === 0) {
      setTimeout(runDetection, 200);
      return;
    }

    try {
      const faces = await detectAllFacesWithDescriptors(video);
      setFaceCount(faces.length);

      const container = cameraContainerRef.current;
      const displayWidth = container?.clientWidth ?? video.clientWidth;
      const displayHeight = container?.clientHeight ?? video.clientHeight;

      const computedStyle = window.getComputedStyle(video);
      const objectFit = (computedStyle.objectFit || 'fill') as 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
      const objectPosition = computedStyle.objectPosition || '50% 50%';
      const mirrored = isMirroredOnXAxis(video);

      const newOverlays: FaceOverlay[] = [];
      const now = Date.now();

      for (const face of faces) {
        const result = matchFace(face.descriptor);

        const mapped = mapDetectionBoxToOverlay(
          face.box,
          {
            sourceWidth: video.videoWidth,
            sourceHeight: video.videoHeight,
            viewportWidth: displayWidth,
            viewportHeight: displayHeight,
            objectFit,
            objectPosition,
          },
          mirrored
        );

        const overlay: FaceOverlay = {
          x: mapped.x,
          y: mapped.y,
          width: mapped.width,
          height: mapped.height,
          label: 'UNKNOWN',
          status: 'unknown',
        };

        if (result.matched && result.face) {
          if (result.face.user_id === adminId || result.face.is_admin) {
            overlay.label = result.face.display_label || result.face.username || 'ADMIN';
            overlay.status = 'admin';
            overlay.adminTag = result.face.user_id === adminId ? 'You' : 'Protected';
          } else {
            overlay.label = result.face.username;
            overlay.status = 'known';
            overlay.accountStatus = result.face.account_status;
          }

          const lastLogged = lastLoggedRef.current.get(result.face.user_id) || 0;
          if (now - lastLogged > 30000) {
            lastLoggedRef.current.set(result.face.user_id, now);
            adminLogRecognition(result.face.user_id, result.face.username, sessionIdRef.current).catch(() => {});
            onEvent();
          }
        } else {
          const lastLogged = lastLoggedRef.current.get('unknown') || 0;
          if (now - lastLogged > 15000) {
            lastLoggedRef.current.set('unknown', now);
            adminLogRecognition(null, null, sessionIdRef.current).catch(() => {});
            onEvent();
          }
        }

        newOverlays.push(overlay);
      }

      setOverlays(newOverlays);
    } catch {
      // Detection failed this frame
    }

    if (detectingRef.current) {
      setTimeout(runDetection, 300);
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Live Surveillance Feed</h3>
          {cameraActive && (
            <div className="flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-red-400 animate-pulse" />
              <span className="text-[10px] font-medium text-red-400 uppercase">REC</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {cameraActive && (
            <span className="text-xs text-slate-400">{faceCount} face{faceCount !== 1 ? 's' : ''}</span>
          )}
          <button
            onClick={loadEnrolledFaces}
            className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh enrolled faces"
            data-testid="refresh-enrolled-faces-button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          {cameraActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-colors"
              data-testid="stop-camera-button"
            >
              <CameraOff className="w-3 h-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={startCamera}
              disabled={!modelsReady || loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-40"
              data-testid="start-camera-button"
            >
              <Camera className="w-3 h-3" />
              {loading ? 'Starting...' : 'Start'}
            </button>
          )}
        </div>
      </div>

      <div ref={cameraContainerRef} className="relative aspect-video bg-black overflow-hidden" data-testid="camera-overlay-container">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
          data-testid="admin-live-video"
        />

        {overlays.map((face, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            data-testid={`face-overlay-${face.status}-${i}`}
            style={{
              left: face.x,
              top: face.y,
              width: face.width,
              height: face.height,
            }}
          >
            {/* ADMIN: frosted glass blur perfectly covering the face */}
            {face.status === 'admin' && (
              <>
                <div
                  className="absolute rounded-2xl overflow-hidden"
                  data-testid={`face-admin-blur-${i}`}
                  style={{
                    inset: 0,
                    backdropFilter: 'blur(24px) saturate(1.4) brightness(1.1)',
                    WebkitBackdropFilter: 'blur(24px) saturate(1.4) brightness(1.1)',
                    background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(6,95,70,0.18) 100%)',
                    border: '1.5px solid rgba(16,185,129,0.4)',
                    boxShadow: '0 0 30px rgba(16,185,129,0.15), inset 0 0 20px rgba(16,185,129,0.05)',
                  }}
                />
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full px-3 py-1"
                  data-testid={`face-admin-label-${i}`}
                  style={{
                    top: '-32px',
                    background: 'linear-gradient(135deg, rgba(5,150,105,0.95) 0%, rgba(4,120,87,0.95) 100%)',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  }}
                >
                  <ShieldAlert className="w-3 h-3 text-emerald-200" />
                  <span className="text-[11px] font-bold text-white tracking-wide whitespace-nowrap">{face.label}</span>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '-24px' }}>
                  <span className="text-[9px] font-semibold text-emerald-300 bg-emerald-900/60 border border-emerald-500/30 rounded-full px-2.5 py-0.5 whitespace-nowrap uppercase tracking-wider">
                    {face.adminTag || 'Protected'}
                  </span>
                </div>
              </>
            )}

            {/* KNOWN: green border with name */}
            {face.status === 'known' && (
              <>
                <div className="absolute inset-0 border-2 border-emerald-400/80 rounded-lg" data-testid={`face-known-box-${i}`} />
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-emerald-500/90 backdrop-blur-sm rounded-full px-2.5 py-0.5"
                  data-testid={`face-known-label-${i}`}
                  style={{ top: '-26px', boxShadow: '0 2px 8px rgba(16,185,129,0.3)' }}
                >
                  <span className="text-[11px] font-semibold text-white whitespace-nowrap">{face.label}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${face.accountStatus === 'active' ? 'bg-green-200' : 'bg-red-300'}`} />
                </div>
                {face.accountStatus && (
                  <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: '-22px' }}>
                    <span className={`text-[9px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      face.accountStatus === 'active' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                    }`}>{face.accountStatus}</span>
                  </div>
                )}
              </>
            )}

            {/* UNKNOWN: red border with centered X */}
            {face.status === 'unknown' && (
              <>
                <div className="absolute inset-0 border-2 border-red-500/80 rounded-lg" data-testid={`face-unknown-box-${i}`} style={{ boxShadow: '0 0 15px rgba(239,68,68,0.2)' }} />
                <div className="absolute inset-0 flex items-center justify-center" data-testid={`face-unknown-cross-${i}`}>
                  <X className="text-red-500/60" style={{ width: '40%', height: '40%' }} strokeWidth={2.5} />
                </div>
                <div
                  className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1 bg-red-500/90 backdrop-blur-sm rounded-full px-2.5 py-0.5"
                  data-testid={`face-unknown-label-${i}`}
                  style={{ top: '-26px', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}
                >
                  <span className="text-[11px] font-bold text-white whitespace-nowrap">UNKNOWN</span>
                </div>
              </>
            )}

            {showDebugOverlay && (
              <>
                <div
                  className="absolute w-2 h-2 bg-cyan-300 rounded-full -translate-x-1/2 -translate-y-1/2"
                  style={{ left: '50%', top: '50%' }}
                  data-testid={`face-debug-center-${i}`}
                />
                <div
                  className="absolute inset-0 border border-cyan-300/70 rounded-lg"
                  style={{ borderStyle: 'dashed' }}
                  data-testid={`face-debug-outline-${i}`}
                />
              </>
            )}
          </div>
        ))}

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
            <Camera className="w-12 h-12 text-slate-600 mb-3" />
            <p className="text-sm text-slate-400 font-medium">Camera Inactive</p>
            <p className="text-xs text-slate-600 mt-1">
              {modelsReady ? 'Click Start to begin monitoring' : 'Loading AI models...'}
            </p>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-slate-800">
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-amber-400/80 font-medium">
            PRIVATE DEMO - Authorized classroom surveillance testing only
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowDebugOverlay((prev) => !prev)}
              className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border transition-colors ${
                showDebugOverlay
                  ? 'text-cyan-300 border-cyan-400/40 bg-cyan-500/10'
                  : 'text-slate-500 border-slate-700 hover:text-cyan-300 hover:border-cyan-500/40'
              }`}
              data-testid="overlay-debug-toggle"
            >
              Debug {showDebugOverlay ? 'On' : 'Off'}
            </button>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-slate-500">Known</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-[10px] text-slate-500">Unknown</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
