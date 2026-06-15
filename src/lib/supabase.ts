import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

export async function signUp(username: string, password: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function signIn(username: string, password: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function enrollFace(userId: string, faceDescriptor: number[]) {
  const res = await fetch(`${FUNCTIONS_BASE}/face-enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ user_id: userId, face_descriptor: faceDescriptor }),
  });
  return res.json();
}

export async function verifyFace(userId: string, faceDescriptor: number[]) {
  const res = await fetch(`${FUNCTIONS_BASE}/face-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ user_id: userId, face_descriptor: faceDescriptor }),
  });
  return res.json();
}

// Admin API calls
export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'login', username, password }),
  });
  return res.json();
}

export async function adminGetUsers() {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'get_users' }),
  });
  return res.json();
}

export async function adminUpdateStatus(userId: string, status: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'update_status', user_id: userId, status }),
  });
  return res.json();
}

export async function adminGetEnrolledFaces() {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'get_enrolled_faces' }),
  });
  return res.json();
}

export async function adminLogRecognition(userId: string | null, username: string | null, cameraSessionId: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'log_recognition', user_id: userId, username, camera_session_id: cameraSessionId }),
  });
  return res.json();
}

export async function adminGetEvents() {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'get_events' }),
  });
  return res.json();
}

export async function adminGetStats() {
  const res = await fetch(`${FUNCTIONS_BASE}/admin-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ action: 'get_stats' }),
  });
  return res.json();
}
