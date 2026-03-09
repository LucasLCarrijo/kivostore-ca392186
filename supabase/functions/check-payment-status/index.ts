import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const paymentId = url.searchParams.get("payment_id");
    const orderId = url.searchParams.get("order_id");

    if (!paymentId && !orderId) {
      return new Response(JSON.stringify({ error: "payment_id or order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let payment: any = null;

    if (paymentId) {
      const { data } = await supabase
        .from("payments")
        .select("id, order_id, status, method, amount, processed_at")
        .eq("id", paymentId)
        .single();
      payment = data;
    } else if (orderId) {
      const { data } = await supabase
        .from("payments")
        .select("id, order_id, status, method, amount, processed_at")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      payment = data;
    }

    if (!payment) {
      return new Response(JSON.stringify({ error: "Pagamento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get PIX data if applicable
    let pixData = null;
    if (payment.method === "pix") {
      const { data } = await supabase
        .from("pix_payment_data")
        .select("qr_code, qr_code_url, copy_paste_code, expires_at, paid_at")
        .eq("payment_id", payment.id)
        .maybeSingle();
      pixData = data;
    }

    return new Response(JSON.stringify({
      payment_id: payment.id,
      order_id: payment.order_id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount,
      processed_at: payment.processed_at,
      pix_data: pixData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Check payment error:", err);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
