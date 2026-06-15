import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;

const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

function getConfigError() {
  return {
    error: 'Missing app configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required.',
  };
}

async function callFunction(path: string, body: Record<string, unknown>) {
  if (!hasSupabaseConfig) {
    return getConfigError();
  }

  const res = await fetch(`${FUNCTIONS_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify(body),
  });

  return res.json();
}

export async function signUp(username: string, password: string) {
  return callFunction('auth-signup', { username, password });
}

export async function signIn(username: string, password: string) {
  return callFunction('auth-signin', { username, password });
}

export async function enrollFace(userId: string, faceDescriptor: number[]) {
  return callFunction('face-enroll', { user_id: userId, face_descriptor: faceDescriptor });
}

export async function verifyFace(userId: string, faceDescriptor: number[]) {
  return callFunction('face-verify', { user_id: userId, face_descriptor: faceDescriptor });
}

// Admin API calls
export async function adminLogin(username: string, password: string) {
  return callFunction('admin-api', { action: 'login', username, password });
}

export async function adminGetUsers() {
  return callFunction('admin-api', { action: 'get_users' });
}

export async function adminUpdateStatus(userId: string, status: string) {
  return callFunction('admin-api', { action: 'update_status', user_id: userId, status });
}

export async function adminGetEnrolledFaces() {
  return callFunction('admin-api', { action: 'get_enrolled_faces' });
}

export async function adminLogRecognition(userId: string | null, username: string | null, cameraSessionId: string) {
  return callFunction('admin-api', { action: 'log_recognition', user_id: userId, username, camera_session_id: cameraSessionId });
}

export async function adminGetEvents() {
  return callFunction('admin-api', { action: 'get_events' });
}

export async function adminGetStats() {
  return callFunction('admin-api', { action: 'get_stats' });
}
