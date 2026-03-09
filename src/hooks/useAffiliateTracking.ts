import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Tracks affiliate referral from ?ref= query param.
 * Stores affiliate_link_id in sessionStorage for checkout.
 */
export function useAffiliateTracking() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (!refCode) return;

    (async () => {
      try {
        // Look up the affiliate link
        const { data: link } = await supabase
          .from("affiliate_links")
          .select("id, affiliate_id")
          .eq("code", refCode)
          .maybeSingle();

        if (!link) return;

        // Store in sessionStorage for checkout
        sessionStorage.setItem("kora_affiliate_link_id", link.id);

        // Increment click count (fire and forget)
        const { data: current } = await supabase
          .from("affiliate_links")
          .select("click_count")
          .eq("id", link.id)
          .single();
        
        if (current) {
          // We can't directly increment via supabase client without RPC,
          // so we do a read + write (acceptable for click tracking)
          await supabase
            .from("affiliate_links")
            .update({ click_count: (current.click_count || 0) + 1 })
            .eq("id", link.id);
        }

        // Create attribution record
        const sessionId = sessionStorage.getItem("kora_session_id") || crypto.randomUUID();
        sessionStorage.setItem("kora_session_id", sessionId);

        // Get cookie duration from program
        const { data: affData } = await supabase
          .from("affiliates")
          .select("workspace_id")
          .eq("id", link.affiliate_id)
          .single();

        let cookieDays = 30;
        if (affData) {
          const { data: prog } = await supabase
            .from("affiliate_programs")
            .select("cookie_duration_days")
            .eq("workspace_id", affData.workspace_id)
            .maybeSingle();
          if (prog) cookieDays = prog.cookie_duration_days;
        }

        await supabase.from("affiliate_attributions").insert({
          affiliate_link_id: link.id,
          session_id: sessionId,
          expires_at: new Date(Date.now() + cookieDays * 86400000).toISOString(),
        });
      } catch (err) {
        console.error("Affiliate tracking error:", err);
      }
    })();
  }, [searchParams]);
}
