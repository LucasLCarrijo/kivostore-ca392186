import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CircleJoin() {
  const { slug } = useParams();
  const [search] = useSearchParams();
  const invite = search.get("invite");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: community, isLoading } = useQuery({
    queryKey: ["join-community", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const join = useMutation({
    mutationFn: async () => {
      if (!community || !user) throw new Error("Missing");

      if (community.access_type !== "OPEN") {
        return "REDIRECT_PLANS" as const;
      }

      const status = community.require_approval ? "PENDING" : "ACTIVE";
      const { error } = await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: user.id,
        role: "MEMBER",
        status,
        display_name: user.email?.split("@")[0] || "Membro",
      });
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      if (status === "REDIRECT_PLANS") {
        navigate(`/c/${slug}/plans`);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["community"] });
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });
      if (status === "PENDING") {
        toast.success("Solicitação enviada! Aguarde aprovação.");
      } else {
        toast.success("Bem-vindo à comunidade!");
      }
      navigate(`/c/${slug}/feed`);
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        navigate(`/c/${slug}/feed`);
        return;
      }
      toast.error("Não foi possível entrar na comunidade");
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando convite...</div>;

  if (!community) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="p-6 text-center space-y-2">
          <h1 className="text-xl font-semibold">Comunidade não encontrada</h1>
          <p className="text-sm text-muted-foreground">O link pode estar inválido ou a comunidade foi desativada.</p>
          <Button onClick={() => navigate("/circles")}>Ver comunidades</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <Card className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Entrar em {community.name}</h1>
        <p className="text-sm text-muted-foreground">{community.description || "Você foi convidado para essa comunidade."}</p>
        {invite ? <p className="text-xs text-muted-foreground">Convite: {invite}</p> : null}

        {!user ? (
          <Button className="w-full" onClick={() => navigate(`/member/login?redirect=${encodeURIComponent(`/join/${slug}${invite ? `?invite=${invite}` : ""}`)}`)}>
            Fazer login para entrar
          </Button>
        ) : (
          <Button className="w-full" onClick={() => join.mutate()} disabled={join.isPending}>
            {join.isPending ? "Processando..." : community.access_type === "OPEN" ? "Entrar na comunidade" : "Ver planos"}
          </Button>
        )}
      </Card>
    </div>
  );
}
