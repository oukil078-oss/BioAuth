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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { action, username, password, user_id, status, face_descriptor, camera_session_id } = await req.json();

    // Admin login
    if (action === "login") {
      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Username and password required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: user } = await supabase
        .from("users")
        .select("id, username, password_hash, salt, is_admin")
        .eq("username", username)
        .maybeSingle();

      if (!user || !user.is_admin) {
        return new Response(JSON.stringify({ error: "Invalid admin credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(password + user.salt);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const computedHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

      if (computedHash !== user.password_hash) {
        return new Response(JSON.stringify({ error: "Invalid admin credentials" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true, admin: { id: user.id, username: user.username } }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all users
    if (action === "get_users") {
      const { data: users } = await supabase
        .from("users")
        .select("id, username, face_enrolled, fingerprint_enrolled, account_status, is_admin, display_label, last_seen_at, recognition_count, created_at, last_login_at")
        .order("created_at", { ascending: false });

      return new Response(JSON.stringify({ users: users || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Update user status
    if (action === "update_status") {
      if (!user_id || !status) {
        return new Response(JSON.stringify({ error: "User ID and status required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error } = await supabase.from("users").update({ account_status: status }).eq("id", user_id);
      if (error) {
        return new Response(JSON.stringify({ error: "Failed to update status" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get all face descriptors for recognition
    if (action === "get_enrolled_faces") {
      const { data: profiles } = await supabase
        .from("biometric_profiles")
        .select("user_id, face_descriptor");

      const { data: users } = await supabase
        .from("users")
        .select("id, username, account_status, is_admin, display_label");

      const userMap = new Map((users || []).map(u => [u.id, u]));
      const enrolledFaces = (profiles || []).map(p => {
        const user = userMap.get(p.user_id);
        return {
          user_id: p.user_id,
          username: user?.username || "Unknown",
          account_status: user?.account_status || "inactive",
          is_admin: user?.is_admin || false,
          display_label: user?.display_label,
          face_descriptor: p.face_descriptor,
        };
      });

      return new Response(JSON.stringify({ faces: enrolledFaces }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log recognition event
    if (action === "log_recognition") {
      const event = {
        matched_user_id: user_id || null,
        matched_username: username || null,
        is_unknown: !user_id,
        confidence: face_descriptor ? undefined : null,
        camera_session_id: camera_session_id || null,
      };

      await supabase.from("recognition_events").insert(event);

      if (user_id) {
        await supabase.from("users").update({
          last_seen_at: new Date().toISOString(),
          recognition_count: supabase.rpc ? undefined : undefined,
        }).eq("id", user_id);

        const { data: currentUser } = await supabase.from("users").select("recognition_count").eq("id", user_id).maybeSingle();
        if (currentUser) {
          await supabase.from("users").update({ recognition_count: (currentUser.recognition_count || 0) + 1 }).eq("id", user_id);
        }
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get recognition events
    if (action === "get_events") {
      const { data: events } = await supabase
        .from("recognition_events")
        .select("*")
        .order("detected_at", { ascending: false })
        .limit(50);

      return new Response(JSON.stringify({ events: events || [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get stats
    if (action === "get_stats") {
      const { data: users } = await supabase.from("users").select("account_status, face_enrolled");
      const { count: unknownCount } = await supabase.from("recognition_events").select("*", { count: "exact", head: true }).eq("is_unknown", true);

      const total = users?.length || 0;
      const active = users?.filter(u => u.account_status === "active").length || 0;
      const inactive = users?.filter(u => u.account_status === "inactive").length || 0;
      const enrolled = users?.filter(u => u.face_enrolled).length || 0;

      return new Response(JSON.stringify({ total, active, inactive, enrolled, unknown_detections: unknownCount || 0 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
