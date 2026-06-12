import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function validateUsername(username: string): string | null {
  if (!username) return "Username is required";
  if (username.length !== 5) return "Username must be exactly 5 characters";
  if (!/^[A-Za-z]{5}$/.test(username)) return "Username must contain only letters";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length !== 8) return "Password must be exactly 8 characters";
  if (!/^[A-Za-z0-9]{8}$/.test(password)) return "Password must contain only letters and numbers";
  return null;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { username, password } = await req.json();

    const usernameError = validateUsername(username);
    if (usernameError) {
      return new Response(JSON.stringify({ error: usernameError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return new Response(JSON.stringify({ error: passwordError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, username, password_hash, salt, face_enrolled, created_at, last_login_at")
      .eq("username", username)
      .maybeSingle();

    if (!user) {
      await supabase.from("login_attempts").insert({ username, success: false, failure_reason: "User not found" });
      return new Response(JSON.stringify({ error: "Invalid username or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const computedHash = await hashPassword(password, user.salt);

    if (computedHash !== user.password_hash) {
      await supabase.from("login_attempts").insert({ user_id: user.id, username, success: false, failure_reason: "Invalid password" });
      return new Response(JSON.stringify({ error: "Invalid username or password" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user.face_enrolled) {
      return new Response(
        JSON.stringify({ error: "Face enrollment not completed. Please complete sign up first.", requires_enrollment: true, user_id: user.id }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        requires_face_verification: true,
        user: { id: user.id, username: user.username, face_enrolled: user.face_enrolled, created_at: user.created_at, last_login_at: user.last_login_at },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
