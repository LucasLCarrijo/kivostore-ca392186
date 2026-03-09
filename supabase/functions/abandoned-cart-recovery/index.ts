import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find open sessions older than 30 min with email, not yet marked abandoned
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: abandonedSessions, error: fetchErr } = await supabase
      .from("checkout_sessions")
      .select("id, email, workspace_id, created_at, total_amount")
      .eq("status", "OPEN")
      .not("email", "is", null)
      .is("abandoned_at", null)
      .lt("created_at", thirtyMinAgo)
      .limit(100);

    if (fetchErr) {
      console.error("Error fetching sessions:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!abandonedSessions || abandonedSessions.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: corsHeaders,
      });
    }

    let processed = 0;

    for (const session of abandonedSessions) {
      // 2. Mark as abandoned
      const { error: updateErr } = await supabase
        .from("checkout_sessions")
        .update({ status: "ABANDONED", abandoned_at: new Date().toISOString() })
        .eq("id", session.id);

      if (updateErr) {
        console.error(`Failed to update session ${session.id}:`, updateErr);
        continue;
      }

      // 3. Schedule 3 recovery emails
      const now = Date.now();
      const emails = [
        { email_number: 1, scheduled_for: new Date(now + 1 * 60 * 60 * 1000).toISOString() },   // 1 hour
        { email_number: 2, scheduled_for: new Date(now + 24 * 60 * 60 * 1000).toISOString() },  // 24 hours
        { email_number: 3, scheduled_for: new Date(now + 48 * 60 * 60 * 1000).toISOString() },  // 48 hours
      ];

      const rows = emails.map((e) => ({
        checkout_session_id: session.id,
        workspace_id: session.workspace_id,
        email_number: e.email_number,
        scheduled_for: e.scheduled_for,
      }));

      const { error: insertErr } = await supabase
        .from("recovery_emails")
        .upsert(rows, { onConflict: "checkout_session_id,email_number" });

      if (insertErr) {
        console.error(`Failed to schedule emails for ${session.id}:`, insertErr);
        continue;
      }

      processed++;
    }

    console.log(`Processed ${processed} abandoned carts`);
    return new Response(JSON.stringify({ processed }), { headers: corsHeaders });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
