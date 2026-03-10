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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    // Find events starting in the next hour
    const { data: upcomingEvents } = await supabase
      .from("community_events")
      .select("id, title, community_id, starts_at")
      .eq("status", "UPCOMING")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", oneHourLater.toISOString());

    if (!upcomingEvents || upcomingEvents.length === 0) {
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalReminders = 0;

    for (const event of upcomingEvents) {
      // Get GOING RSVPs
      const { data: rsvps } = await supabase
        .from("community_event_rsvps")
        .select("member_id")
        .eq("event_id", event.id)
        .eq("status", "GOING");

      if (!rsvps || rsvps.length === 0) continue;

      const memberIds = rsvps.map((r: any) => r.member_id);

      // Check if reminder already sent (look for existing notification with this event)
      const { data: existingReminders } = await supabase
        .from("community_notifications")
        .select("recipient_id")
        .eq("event_id", event.id)
        .eq("type", "EVENT_REMINDER")
        .in("recipient_id", memberIds);

      const alreadyNotified = new Set(
        (existingReminders || []).map((n: any) => n.recipient_id)
      );

      const toNotify = memberIds.filter((id: string) => !alreadyNotified.has(id));

      if (toNotify.length === 0) continue;

      const notifications = toNotify.map((memberId: string) => ({
        community_id: event.community_id,
        recipient_id: memberId,
        type: "EVENT_REMINDER",
        event_id: event.id,
        title: `⏰ ${event.title} começa em 1 hora!`,
        body: `Prepare-se! O evento está prestes a começar.`,
      }));

      await supabase.from("community_notifications").insert(notifications);
      totalReminders += notifications.length;
    }

    return new Response(
      JSON.stringify({ success: true, reminders_sent: totalReminders, events_checked: upcomingEvents.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing event reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
