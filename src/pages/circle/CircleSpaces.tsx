import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

export default function CircleSpaces() {
  const { currentWorkspace } = useWorkspace();

  const { data: community } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase
        .from("communities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .single();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: spaces, isLoading } = useQuery({
    queryKey: ["circle-spaces", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_spaces")
        .select("*")
        .eq("community_id", community.id)
        .eq("is_visible", true)
        .order("position");
      return data || [];
    },
    enabled: !!community,
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Espaços</h1>
        <p className="text-sm text-muted-foreground mt-1">Explore os canais da comunidade</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-10 w-10 bg-muted rounded-xl mb-3" />
              <div className="h-4 bg-muted rounded w-2/3 mb-2" />
              <div className="h-3 bg-muted rounded w-full" />
            </Card>
          ))}
        </div>
      ) : spaces?.length === 0 ? (
        <Card className="p-12 text-center">
          <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold">Nenhum espaço criado</h3>
          <p className="text-sm text-muted-foreground mt-1">O admin precisa criar espaços para a comunidade.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {spaces?.map((space: any) => (
            <Link key={space.id} to={`/circle/spaces/${space.slug}`}>
              <Card className="p-5 hover:shadow-md transition-all hover:border-primary/20 cursor-pointer h-full">
                <div className="text-3xl mb-3">{space.emoji}</div>
                <h3 className="font-semibold text-foreground">{space.name}</h3>
                {space.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{space.description}</p>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {space.post_count} posts
                  </Badge>
                  {space.only_admins_can_post && (
                    <Badge variant="outline" className="text-xs">Somente admins</Badge>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
