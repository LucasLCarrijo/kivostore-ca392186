import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Trophy, Calendar, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

export default function CircleDashboard() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: community, isLoading } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase
        .from("communities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: member } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!community && !!user,
  });

  const createCommunity = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace || !user) throw new Error("Missing data");
      
      const slug = currentWorkspace.slug + "-circle";
      const { data: comm, error } = await supabase
        .from("communities")
        .insert({
          workspace_id: currentWorkspace.id,
          name: currentWorkspace.name + " Circle",
          slug,
          description: "Comunidade oficial",
          access_type: "OPEN",
        })
        .select()
        .single();
      if (error) throw error;

      // Add creator as OWNER member
      const { error: memberError } = await supabase
        .from("community_members")
        .insert({
          community_id: comm.id,
          user_id: user.id,
          role: "OWNER",
          status: "ACTIVE",
          display_name: user.email?.split("@")[0] || "Creator",
        });
      if (memberError) throw memberError;

      // Create default space
      const { error: spaceError } = await supabase
        .from("community_spaces")
        .insert({
          community_id: comm.id,
          name: "Geral",
          slug: "geral",
          emoji: "💬",
          is_default: true,
          position: 0,
        });
      if (spaceError) throw spaceError;

      return comm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Comunidade criada com sucesso!");
    },
    onError: () => toast.error("Erro ao criar comunidade"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // No community yet - show creation screen
  if (!community) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center mt-20">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Kivo Circles</h1>
        <p className="text-muted-foreground mt-2 mb-6">
          Crie uma comunidade engajada para seus membros. Feed de posts, espaços, gamificação, eventos e muito mais.
        </p>
        <Button size="lg" onClick={() => createCommunity.mutate()} disabled={createCommunity.isPending}>
          <Plus className="h-5 w-5 mr-2" />
          Criar Comunidade
        </Button>
      </div>
    );
  }

  // Community exists - show dashboard
  const stats = [
    { label: "Posts", value: community.post_count, icon: MessageSquare, path: "/circle/feed" },
    { label: "Membros", value: community.member_count, icon: Users, path: "/circle/members" },
    { label: "Seus Pontos", value: member?.total_points || 0, icon: Trophy, path: "/circle/leaderboard" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 p-6 md:p-8">
        {community.cover_image_url && (
          <img src={community.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="relative">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{community.name}</h1>
          {community.description && (
            <p className="text-muted-foreground mt-2">{community.description}</p>
          )}
          <div className="flex gap-3 mt-4">
            <Button onClick={() => navigate("/circle/feed")}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Ver Feed
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(s.path)}
          >
            <s.icon className="h-5 w-5 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Quick links */}
      <div className="space-y-2">
        {[
          { label: "Explorar Espaços", icon: MessageSquare, path: "/circle/spaces" },
          { label: "Próximos Eventos", icon: Calendar, path: "/circle/events" },
          { label: "Ranking", icon: Trophy, path: "/circle/leaderboard" },
        ].map((link) => (
          <Card
            key={link.path}
            className="p-4 flex items-center gap-3 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => navigate(link.path)}
          >
            <link.icon className="h-5 w-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">{link.label}</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </Card>
        ))}
      </div>
    </div>
  );
}
