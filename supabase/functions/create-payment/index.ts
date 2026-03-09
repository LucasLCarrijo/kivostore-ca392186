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
    const {
      product_id, price_id, method, customer, workspace_id,
      checkout_session_id, card, installments, coupon_code, affiliate_link_id
    } = body;

    // Validate required fields
    if (!product_id || !price_id || !method || !customer?.email || !customer?.name || !customer?.cpf || !workspace_id) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios não preenchidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Validate CPF
    const cpf = customer.cpf.replace(/\D/g, "");
    if (cpf.length !== 11) {
      return new Response(JSON.stringify({ error: "CPF inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get product + price
    const { data: product } = await supabase
      .from("products")
      .select("id, name, slug, workspace_id")
      .eq("id", product_id)
      .single();

    if (!product) {
      return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: price } = await supabase
      .from("prices")
      .select("id, amount, pix_discount_percent, max_installments")
      .eq("id", price_id)
      .single();

    if (!price) {
      return new Response(JSON.stringify({ error: "Preço não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Calculate total
    let totalAmount = price.amount;
    if (method === "pix" && price.pix_discount_percent) {
      totalAmount = totalAmount * (1 - price.pix_discount_percent / 100);
    }

    // Upsert customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("workspace_id", workspace_id)
      .eq("email", customer.email)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase.from("customers").update({
        name: customer.name,
        cpf: cpf,
        phone: customer.phone || null,
      }).eq("id", customerId);
    } else {
      const { data: newCustomer } = await supabase
        .from("customers")
        .insert({
          workspace_id,
          email: customer.email,
          name: customer.name,
          cpf: cpf,
          phone: customer.phone || null,
        })
        .select("id")
        .single();
      customerId = newCustomer!.id;
    }

    // Create order
    const { data: order } = await supabase
      .from("orders")
      .insert({
        workspace_id,
        product_id: product.id,
        customer_email: customer.email,
        customer_name: customer.name,
        total_amount: totalAmount,
        payment_method: method,
        status: "PENDING",
      })
      .select("id")
      .single();

    // Update checkout session if exists
    if (checkout_session_id) {
      await supabase.from("checkout_sessions").update({
        customer_id: customerId,
        status: method === "pix" ? "AWAITING_PAYMENT" : "PROCESSING",
        subtotal_amount: price.amount,
        discount_amount: price.amount - totalAmount,
        total_amount: totalAmount,
        coupon_code: coupon_code || null,
        affiliate_link_id: affiliate_link_id || null,
      }).eq("id", checkout_session_id);
    }

    // Simulate payment gateway response based on method
    // TODO: Replace with actual Pagar.me API integration
    if (method === "pix") {
      const pixCode = `00020126580014br.gov.bcb.pix0136${crypto.randomUUID()}5204000053039865802BR5925KORA PAGAMENTOS6009SAO PAULO62070503***6304`;
      
      return new Response(JSON.stringify({
        status: "pending",
        order_id: order!.id,
        pix_qr_code: pixCode,
        pix_qr_code_url: "",
        expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (method === "credit_card") {
      if (!card?.number || !card?.cvv || !card?.exp_month || !card?.exp_year || !card?.holder_name) {
        return new Response(JSON.stringify({ error: "Dados do cartão incompletos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Simulate card processing
      // TODO: Replace with actual Pagar.me tokenization + charge
      await supabase.from("orders").update({ status: "COMPLETED" }).eq("id", order!.id);
      
      if (checkout_session_id) {
        await supabase.from("checkout_sessions").update({
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
        }).eq("id", checkout_session_id);
      }

      return new Response(JSON.stringify({
        status: "paid",
        order_id: order!.id,
        message: "Pagamento aprovado",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (method === "boleto") {
      const barcode = `23793.38128 60000.${String(Date.now()).slice(-6)} 00000.000${Math.floor(Math.random() * 900) + 100} 1 ${String(Math.floor(totalAmount * 100)).padStart(10, "0")}`;
      
      return new Response(JSON.stringify({
        status: "pending",
        order_id: order!.id,
        boleto_barcode: barcode,
        boleto_pdf_url: "",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ error: "Método de pagamento inválido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Payment error:", err);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
