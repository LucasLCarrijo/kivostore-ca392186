import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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

      <Card className="p-4">
        <h2 className="font-semibold mb-2">Navegação rápida</h2>
        <div className="flex gap-4 text-sm">
          <Link className="text-primary hover:underline" to={`${basePath}/feed`}>Feed</Link>
          <Link className="text-primary hover:underline" to={`${basePath}/members`}>Membros</Link>
          <Link className="text-primary hover:underline" to={`${basePath}/leaderboard`}>Ranking</Link>
        </div>
      </Card>
    </div>
  );
}
