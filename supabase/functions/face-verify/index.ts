import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOTION_ATTEMPTS_DB = "8831a0b5-b6fe-4beb-8102-4586ba885db6";
const NOTION_USERS_DB = "fb9bf6d6-6ace-4ee1-b1ae-ef8c4ba54b62";
const FACE_MATCH_THRESHOLD = 0.6;

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

async function findNotionUserPage(notionToken: string, userId: string): Promise<string | null> {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_USERS_DB}/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${notionToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify({ filter: { property: "User ID", rich_text: { equals: userId } } }),
  });
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

async function syncVerifyToNotion(notionToken: string, username: string, userId: string, success: boolean, confidence: number, failureReason?: string): Promise<void> {
  const now = new Date().toISOString();
  const result = success ? "Success" : "Failed — Face Mismatch";
  const properties: Record<string, unknown> = {
    Username: { title: [{ text: { content: username } }] },
    "User ID": { rich_text: [{ text: { content: userId } }] },
    Result: { select: { name: result } },
    "Confidence %": { number: confidence },
    "Attempted At": { date: { start: now } },
  };
  if (failureReason) properties["Failure Reason"] = { rich_text: [{ text: { content: failureReason } }] };
  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: { Authorization: `Bearer ${notionToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
    body: JSON.stringify({ parent: { database_id: NOTION_ATTEMPTS_DB }, properties }),
  });
  if (success) {
    const userPageId = await findNotionUserPage(notionToken, userId);
    if (userPageId) {
      await fetch(`https://api.notion.com/v1/pages/${userPageId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${notionToken}`, "Content-Type": "application/json", "Notion-Version": "2022-06-28" },
        body: JSON.stringify({ properties: { "Last Login": { date: { start: now } }, Status: { select: { name: "Active" } } } }),
      });
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { user_id, face_descriptor } = await req.json();

    if (!user_id) return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length !== 128) return new Response(JSON.stringify({ error: "Invalid face descriptor. Expected 128-dimensional array." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profile } = await supabase.from("biometric_profiles").select("face_descriptor").eq("user_id", user_id).maybeSingle();
    if (!profile) return new Response(JSON.stringify({ error: "No face enrollment found for this user" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const storedDescriptor = profile.face_descriptor as number[];
    const distance = euclideanDistance(face_descriptor, storedDescriptor);
    const match = distance < FACE_MATCH_THRESHOLD;
    const confidence = Math.round(Math.max(0, Math.min(1, 1 - distance)) * 100);

    const notionToken = Deno.env.get("NOTION_TOKEN");

    if (match) {
      await supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user_id);
      await supabase.from("login_attempts").insert({ user_id, username: "", success: true });
      const { data: user } = await supabase.from("users").select("id, username, face_enrolled, created_at, last_login_at").eq("id", user_id).single();
      if (notionToken && user) syncVerifyToNotion(notionToken, user.username, user_id, true, confidence).catch(() => {});
      return new Response(JSON.stringify({ success: true, verified: true, confidence, user }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await supabase.from("login_attempts").insert({ user_id, username: "", success: false, failure_reason: "Face verification failed" });
      const { data: user } = await supabase.from("users").select("username").eq("id", user_id).maybeSingle();
      if (notionToken && user) syncVerifyToNotion(notionToken, user.username, user_id, false, confidence, "Face does not match").catch(() => {});
      return new Response(JSON.stringify({ success: false, verified: false, confidence, error: "Face does not match. Access denied." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
