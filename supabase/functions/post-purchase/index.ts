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
    const body = await req.json();
    const { order_id } = body;

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get order details
    const { data: order } = await supabase
      .from("orders")
      .select("id, workspace_id, product_id, customer_email, customer_name, total_amount, payment_method, customer_id")
      .eq("id", order_id)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create entitlement if customer exists
    if (order.customer_id && order.product_id) {
      await supabase.from("entitlements").insert({
        customer_id: order.customer_id,
        product_id: order.product_id,
        order_id: order.id,
      });
    }

    // 2. Create order item if not exists
    if (order.product_id) {
      const { data: existingItem } = await supabase
        .from("order_items")
        .select("id")
        .eq("order_id", order.id)
        .eq("product_id", order.product_id)
        .maybeSingle();

      if (!existingItem) {
        // Get price
        const { data: price } = await supabase
          .from("prices")
          .select("id, amount")
          .eq("product_id", order.product_id)
          .eq("is_default", true)
          .maybeSingle();

        if (price) {
          await supabase.from("order_items").insert({
            order_id: order.id,
            product_id: order.product_id,
            price_id: price.id,
            unit_amount: price.amount,
            total_amount: order.total_amount,
          });
        }
      }
    }

    // 3. Update product sales_count
    if (order.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("sales_count")
        .eq("id", order.product_id)
        .single();

      if (product) {
        await supabase
          .from("products")
          .update({ sales_count: (product.sales_count || 0) + 1 })
          .eq("id", order.product_id);
      }
    }

    // 4. Update order status
    await supabase
      .from("orders")
      .update({ status: "COMPLETED", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    // 5. Update checkout session
    if (order.checkout_session_id) {
      await supabase
        .from("checkout_sessions")
        .update({ status: "COMPLETED", completed_at: new Date().toISOString() })
        .eq("id", order.checkout_session_id);
    }

    // TODO: Send email notifications via Resend when API key is configured
    // - Email to buyer: confirmation + access link
    // - Email to creator: new sale notification

    return new Response(
      JSON.stringify({ success: true, order_id: order.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Post-purchase error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
