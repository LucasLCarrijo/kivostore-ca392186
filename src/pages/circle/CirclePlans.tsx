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

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando planos...</div>;
  if (!community) return <div className="p-6 text-sm text-muted-foreground">Comunidade não encontrada.</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Select your plan</h1>
      <p className="text-muted-foreground">{community.name}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="text-lg font-semibold">Standard</h3>
          <p className="text-sm text-muted-foreground">Acesso à comunidade e conteúdo principal.</p>
          <p className="text-2xl font-bold">{community.access_type === "OPEN" ? "Free" : "Paid"}</p>
          <Button
            className="w-full"
            onClick={() => {
              if (community.linked_product_id) {
                navigate(`/checkout/${community.linked_product_id}`);
              }
            }}
            disabled={!community.linked_product_id}
          >
            {community.linked_product_id ? "Continue" : "No plan linked"}
          </Button>
        </Card>

        <Card className="p-5 space-y-3 border-primary/40">
          <h3 className="text-lg font-semibold">Premium</h3>
          <p className="text-sm text-muted-foreground">Tier extra para formato Skool-like (placeholder pronto para conectar no banco).</p>
          <p className="text-2xl font-bold">Custom</p>
          <Button variant="outline" className="w-full" disabled>
            Coming soon
          </Button>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">Trial, cobrança recorrente e tiers serão conectados no próximo passo via modelagem de planos.</p>
    </div>
  );
}
