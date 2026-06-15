import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { user_id, step, credential_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "User ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (step === "challenge") {
      const { data: cred } = await supabase
        .from("fingerprint_credentials")
        .select("credential_id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!cred) {
        return new Response(JSON.stringify({ error: "No fingerprint enrolled for this user" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ credential_id: cred.credential_id }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (step === "verify") {
      if (!credential_id) {
        return new Response(JSON.stringify({ error: "Credential ID is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: cred } = await supabase
        .from("fingerprint_credentials")
        .select("credential_id, counter")
        .eq("user_id", user_id)
        .maybeSingle();

      if (!cred) {
        return new Response(JSON.stringify({ success: false, verified: false, error: "No fingerprint credential found" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (cred.credential_id !== credential_id) {
        return new Response(JSON.stringify({ success: false, verified: false, error: "Fingerprint does not match enrolled device" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await supabase
        .from("fingerprint_credentials")
        .update({ counter: cred.counter + 1 })
        .eq("user_id", user_id);

      return new Response(JSON.stringify({ success: true, verified: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid step. Use 'challenge' or 'verify'" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
