import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CirclePlans() {
  const { currentWorkspace } = useWorkspace();
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", slug || currentWorkspace?.id],
    queryFn: async () => {
      if (slug) {
        const { data } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
        return data;
      }
      if (!currentWorkspace) return null;
      const { data } = await supabase.from("communities").select("*").eq("workspace_id", currentWorkspace.id).maybeSingle();
      return data;
    },
    enabled: !!slug || !!currentWorkspace,
  });

  const { data: linkedProduct } = useQuery({
    queryKey: ["community-linked-product", community?.linked_product_id],
    queryFn: async () => {
      if (!community?.linked_product_id) return null;
      const { data } = await supabase
        .from("products")
        .select("id, slug, name")
        .eq("id", community.linked_product_id)
        .maybeSingle();
      return data;
    },
    enabled: !!community?.linked_product_id,
  });

  const { data: linkedPrice } = useQuery({
    queryKey: ["community-linked-price", linkedProduct?.id],
    queryFn: async () => {
      if (!linkedProduct?.id) return null;
      const { data } = await supabase
        .from("prices")
        .select("id, amount, type")
        .eq("product_id", linkedProduct.id)
        .eq("is_default", true)
        .eq("is_active", true)
        .maybeSingle();
      return data;
    },
    enabled: !!linkedProduct?.id,
  });

  const { data: subPlans = [] } = useQuery({
    queryKey: ["community-linked-sub-plans", linkedProduct?.id],
    queryFn: async () => {
      if (!linkedProduct?.id) return [];
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("id, name, billing_interval, trial_days, price_id")
        .eq("product_id", linkedProduct.id);
      if (error || !data?.length) return [];

      const priceIds = data.map((p: any) => p.price_id).filter(Boolean);
      let priceMap = new Map<string, any>();
      if (priceIds.length) {
        const { data: prices } = await supabase
          .from("prices")
          .select("id, amount, type")
          .in("id", priceIds)
          .eq("is_active", true);
        priceMap = new Map((prices || []).map((p: any) => [p.id, p]));
      }

      return data.map((p: any) => ({ ...p, price: p.price_id ? priceMap.get(p.price_id) : null }));
    },
    enabled: !!linkedProduct?.id,
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando planos...</div>;
  if (!community) return <div className="p-6 text-sm text-muted-foreground">Comunidade não encontrada.</div>;

  const formattedPrice = linkedPrice?.amount ? `R$ ${(linkedPrice.amount / 100).toFixed(2).replace(".", ",")}` : null;

  const intervalLabel = (interval?: string) => (interval === "YEAR" ? "/ano" : "/mês");
  const planPrice = (plan: any) => plan?.price?.amount ? `R$ ${(plan.price.amount / 100).toFixed(2).replace(".", ",")}` : formattedPrice;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Selecione seu plano</h1>
      <p className="text-muted-foreground">{community.name}</p>

      {subPlans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {subPlans.map((plan: any, idx: number) => (
            <Card key={plan.id || idx} className="p-5 space-y-3">
              <h3 className="text-lg font-semibold">{plan.name || `Plano ${idx + 1}`}</h3>
              <p className="text-sm text-muted-foreground">Assinatura recorrente.</p>
              <p className="text-2xl font-bold">{planPrice(plan) || "Consulte"}{intervalLabel(plan.billing_interval)}</p>
              {plan.trial_days > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {plan.trial_days} dias grátis, depois {planPrice(plan) || "valor do plano"}{intervalLabel(plan.billing_interval)}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Sem trial grátis.</p>
              )}

              <Button
                className="w-full"
                onClick={() => {
                  if (linkedProduct?.slug) navigate(`/checkout/${linkedProduct.slug}`);
                }}
                disabled={!linkedProduct?.slug}
              >
                {linkedProduct?.slug ? "Começar agora" : "Plano sem produto vinculado"}
              </Button>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-5 space-y-3">
            <h3 className="text-lg font-semibold">Standard</h3>
            <p className="text-sm text-muted-foreground">Acesso à comunidade e conteúdo principal.</p>
            <p className="text-2xl font-bold">
              {community.access_type === "OPEN" ? "Grátis" : formattedPrice || "Pago"}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                if (linkedProduct?.slug) navigate(`/checkout/${linkedProduct.slug}`);
              }}
              disabled={community.access_type !== "OPEN" && !linkedProduct?.slug}
            >
              {community.access_type === "OPEN"
                ? "Entrar grátis"
                : linkedProduct?.slug
                  ? "Continuar"
                  : "Nenhum plano vinculado"}
            </Button>
          </Card>

          <Card className="p-5 space-y-3 border-primary/40">
            <h3 className="text-lg font-semibold">Premium</h3>
            <p className="text-sm text-muted-foreground">Slot preparado para Freemium/Tiers.</p>
            <p className="text-2xl font-bold">Em breve</p>
            <Button variant="outline" className="w-full" disabled>
              Em breve
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
