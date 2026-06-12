import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const FUNCTIONS_BASE = `${supabaseUrl}/functions/v1`;

export async function signUp(username: string, password: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function signIn(username: string, password: string) {
  const res = await fetch(`${FUNCTIONS_BASE}/auth-signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ username, password }),
  });
  return res.json();
}

export async function enrollFace(userId: string, faceDescriptor: number[]) {
  const res = await fetch(`${FUNCTIONS_BASE}/face-enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ user_id: userId, face_descriptor: faceDescriptor }),
  });
  return res.json();
}

export async function verifyFace(userId: string, faceDescriptor: number[]) {
  const res = await fetch(`${FUNCTIONS_BASE}/face-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}` },
    body: JSON.stringify({ user_id: userId, face_descriptor: faceDescriptor }),
  });
  return res.json();
}
