import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOTION_ENROLLMENTS_DB = "071f43c6-d9c3-49c9-92fc-8dfe513eefa7";
const NOTION_USERS_DB = "fb9bf6d6-6ace-4ee1-b1ae-ef8c4ba54b62";

async function findNotionUserPage(notionToken: string, userId: string): Promise<string | null> {
  const res = await fetch(`https://api.notion.com/v1/databases/${NOTION_USERS_DB}/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      filter: { property: "User ID", rich_text: { equals: userId } },
    }),
  });
  const data = await res.json();
  return data.results?.[0]?.id ?? null;
}

async function syncEnrollmentToNotion(
  notionToken: string,
  userId: string,
  username: string,
  isReEnrollment: boolean
): Promise<void> {
  const now = new Date().toISOString();

  await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notionToken}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_ENROLLMENTS_DB },
      properties: {
        Username: { title: [{ text: { content: username } }] },
        "User ID": { rich_text: [{ text: { content: userId } }] },
        "Enrolled At": { date: { start: now } },
        "Re-Enrollment": { checkbox: isReEnrollment },
      },
    }),
  });

  const userPageId = await findNotionUserPage(notionToken, userId);
  if (userPageId) {
    await fetch(`https://api.notion.com/v1/pages/${userPageId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${notionToken}`,
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({
        properties: {
          "Face Enrolled": { checkbox: true },
          Status: { select: { name: "Active" } },
        },
      }),
    });
  }
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
    const { user_id, face_descriptor } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: "User ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!face_descriptor || !Array.isArray(face_descriptor) || face_descriptor.length !== 128) {
      return new Response(
        JSON.stringify({ error: "Invalid face descriptor. Expected 128-dimensional array." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: user } = await supabase
      .from("users")
      .select("id, username, face_enrolled")
      .eq("id", user_id)
      .maybeSingle();

    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isReEnrollment = user.face_enrolled;

    const { error: upsertError } = await supabase
      .from("biometric_profiles")
      .upsert(
        { user_id, face_descriptor, enrolled_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      return new Response(
        JSON.stringify({ error: "Failed to store face data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await supabase.from("users").update({ face_enrolled: true }).eq("id", user_id);

    const notionToken = Deno.env.get("NOTION_TOKEN");
    if (notionToken) {
      syncEnrollmentToNotion(notionToken, user_id, user.username, isReEnrollment).catch(() => {});
    }

    return new Response(
      JSON.stringify({ success: true, message: "Face enrolled successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
