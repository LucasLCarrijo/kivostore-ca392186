import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageSquare, ShieldCheck } from "lucide-react";

export default function CircleAbout() {
  const { currentWorkspace } = useWorkspace();
  const { slug } = useParams();

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

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  }

  if (!community) {
    return <div className="p-6 text-sm text-muted-foreground">Comunidade não encontrada.</div>;
  }

  const basePath = slug ? `/c/${slug}` : "/circle";

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">{community.name}</h1>
      <p className="text-muted-foreground">{community.long_description || community.description || "Sem descrição."}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="p-4"><div className="flex items-center gap-2"><Users className="h-4 w-4" /> {community.member_count} membros</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {community.post_count} posts</div></Card>
        <Card className="p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> {community.require_approval ? "Entrada com aprovação" : "Entrada livre"}</div></Card>
      </div>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold">Começar</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/join/${community.slug}`}>{community.access_type === "OPEN" ? "Entrar na comunidade" : "Ver planos"}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`${basePath}/feed`}>Ver feed</Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to={`${basePath}/members`}>Membros</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
