import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += (a[i] - b[i]) ** 2;
  }
  return Math.sqrt(sum);
}

const FACE_MATCH_THRESHOLD = 0.6;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { user_id, face_descriptor } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
      return new Response(JSON.stringify({ error: "Invalid face descriptor. Expected 128-dimensional array." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: profile } = await supabase
      .from("biometric_profiles")
      .select("face_descriptor")
      .eq("user_id", user_id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ error: "No face enrollment found for this user" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const storedDescriptor = profile.face_descriptor as number[];
    const distance = euclideanDistance(face_descriptor, storedDescriptor);
    const match = distance < FACE_MATCH_THRESHOLD;
    const confidence = Math.max(0, Math.min(1, 1 - distance));

    if (match) {
      await supabase.from("users").update({ last_login_at: new Date().toISOString() }).eq("id", user_id);
      await supabase.from("login_attempts").insert({ user_id, username: "", success: true });

      const { data: user } = await supabase
        .from("users")
        .select("id, username, face_enrolled, created_at, last_login_at")
        .eq("id", user_id)
        .single();

      return new Response(
        JSON.stringify({ success: true, verified: true, confidence: Math.round(confidence * 100), user }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      await supabase.from("login_attempts").insert({ user_id, username: "", success: false, failure_reason: "Face verification failed" });

      return new Response(
        JSON.stringify({ success: false, verified: false, confidence: Math.round(confidence * 100), error: "Face does not match. Access denied." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
