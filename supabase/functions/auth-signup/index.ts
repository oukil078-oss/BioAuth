import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOTION_USERS_DB = "fb9bf6d6-6ace-4ee1-b1ae-ef8c4ba54b62";

function validateUsername(username: string): string | null {
  if (!username) return "Username is required";
  if (username.length !== 5) return "Username must be exactly 5 characters";
  if (!/^[A-Za-z]{5}$/.test(username))
    return "Username must contain only letters (no numbers, spaces, or special characters)";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length !== 8) return "Password must be exactly 8 characters";
  if (!/^[A-Za-z0-9]{8}$/.test(password))
    return "Password must contain only letters and numbers (no spaces or special characters)";
  return null;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 10000).padStart(4, "0");
}

async function syncUserToNotion(
  notionToken: string,
  userId: string,
  username: string,
  createdAt: string
): Promise<void> {
  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_USERS_DB },
      properties: {
        Username: { title: [{ text: { content: username } }] },
        "User ID": { rich_text: [{ text: { content: userId } }] },
        "Face Enrolled": { checkbox: false },
        Status: { select: { name: "No Face" } },
        "Created At": {
          date: { start: createdAt },
        },
      },
    }),
  });
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Username already taken" }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);

    const { data: user, error } = await supabase
      .from("users")
      .insert({ username, password_hash: passwordHash, salt, face_enrolled: false })
      .select("id, username, created_at")
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: "Failed to create account" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const notionToken = Deno.env.get("NOTION_TOKEN");
    if (notionToken) {
      syncUserToNotion(notionToken, user.id, user.username, user.created_at).catch(
        () => {}
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: { id: user.id, username: user.username, created_at: user.created_at },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
