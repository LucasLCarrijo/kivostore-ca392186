import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Bell, BellOff, Pencil, Shield, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PostCard from "@/components/circle/PostCard";
import PostComposer from "@/components/circle/PostComposer";
import SpaceFormModal from "@/components/circle/SpaceFormModal";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CircleFeed() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { slug: spaceSlug } = useParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [showCompose, setShowCompose] = useState(false);
  const [filter, setFilter] = useState("recent");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSpaceId, setFilterSpaceId] = useState<string>("all");
  const [editingSpace, setEditingSpace] = useState(false);

  const { data: community } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase
        .from("communities").select("*")
        .eq("workspace_id", currentWorkspace.id).single();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: member } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase
        .from("community_members").select("*")
        .eq("community_id", community.id).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!community && !!user,
  });

  const { data: spaces } = useQuery({
    queryKey: ["circle-spaces", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_spaces").select("*")
        .eq("community_id", community.id).eq("is_visible", true)
        .order("position");
      return data || [];
    },
    enabled: !!community,
  });

  const currentSpaceId = spaceSlug
    ? spaces?.find((s: any) => s.slug === spaceSlug)?.id
    : null;

  const { data: posts, isLoading } = useQuery({
    queryKey: ["circle-posts", community?.id, filter, filterType, filterSpaceId, currentSpaceId],
    queryFn: async () => {
      if (!community) return [];
      let query = supabase
        .from("community_posts")
        .select(`*, author:community_members!author_id(id, display_name, avatar_url, level, role, total_points),
          space:community_spaces!space_id(id, name, emoji, slug)`)
        .eq("community_id", community.id)
        .is("deleted_at", null);

      if (currentSpaceId) {
        query = query.eq("space_id", currentSpaceId);
      } else if (filterSpaceId !== "all") {
        query = query.eq("space_id", filterSpaceId);
      }

      if (filterType !== "all") {
        query = query.eq("post_type", filterType as any);
      }

      // "Sem resposta" filter for questions
      if (filter === "unanswered") {
        query = query.eq("post_type", "QUESTION" as any).or("is_answered.is.null,is_answered.eq.false");
        query = query.order("created_at", { ascending: false });
      } else if (filter === "recent") {
        query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
      } else if (filter === "popular") {
        query = query.order("like_count", { ascending: false });
      }

      const { data } = await query.limit(50);
      return data || [];
    },
    enabled: !!community,
  });

  const { data: userReactions } = useQuery({
    queryKey: ["circle-reactions", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase
        .from("community_reactions").select("post_id")
        .eq("member_id", member.id);
      return data?.map((r: any) => r.post_id) || [];
    },
    enabled: !!member,
  });

  const isMuted = member?.status === "MUTED";
  const isAdminMember = member?.role === "OWNER" || member?.role === "ADMIN" || member?.role === "MODERATOR";

  // Space subscription
  const { data: spaceSubscription } = useQuery({
    queryKey: ["circle-space-sub", member?.id, currentSpaceId],
    queryFn: async () => {
      if (!member || !currentSpaceId) return null;
      const { data } = await supabase
        .from("community_space_subscriptions").select("*")
        .eq("member_id", member.id).eq("space_id", currentSpaceId)
        .maybeSingle();
      return data;
    },
    enabled: !!member && !!currentSpaceId,
  });

  const toggleSubscription = useMutation({
    mutationFn: async () => {
      if (!member || !currentSpaceId) throw new Error("Missing");
      if (spaceSubscription) {
        await supabase.from("community_space_subscriptions")
          .update({ notify_new_posts: !spaceSubscription.notify_new_posts } as any)
          .eq("member_id", member.id).eq("space_id", currentSpaceId);
      } else {
        await supabase.from("community_space_subscriptions")
          .insert([{ member_id: member.id, space_id: currentSpaceId, notify_new_posts: true }] as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-space-sub"] });
      const isNow = spaceSubscription ? !spaceSubscription.notify_new_posts : true;
      toast.success(isNow ? "Notificações ativadas" : "Notificações silenciadas");
    },
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!member || !community) throw new Error("Not a member");
      const liked = userReactions?.includes(postId);
      if (liked) {
        await supabase.from("community_reactions").delete().eq("member_id", member.id).eq("post_id", postId);
      } else {
        await supabase.from("community_reactions").insert({ member_id: member.id, post_id: postId, emoji: "❤️" });
        const post = posts?.find((p: any) => p.id === postId);
        if (post && post.author_id !== member.id) {
          await supabase.from("community_points_log").insert({
            community_id: community.id, member_id: post.author_id,
            action: "LIKE_RECEIVED", points: community.points_per_like_received,
            reference_id: postId, reference_type: "post", description: "Recebeu um like",
          });
          await supabase.from("community_members")
            .update({ total_points: (post.author?.total_points || 0) + community.points_per_like_received })
            .eq("id", post.author_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-posts"] });
      queryClient.invalidateQueries({ queryKey: ["circle-reactions"] });
    },
  });

  const currentSpace = spaceSlug ? spaces?.find((s: any) => s.slug === spaceSlug) : null;
  const canPostInSpace = currentSpace?.only_admins_can_post ? isAdminMember : true;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* Space header */}
      {currentSpace && (
        <div className="flex items-center gap-3">
          <span className="text-[40px] leading-none">{currentSpace.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{currentSpace.name}</h1>
              {currentSpace.only_admins_can_post && (
                <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                  <Shield className="h-3 w-3 mr-0.5" />Admin only
                </Badge>
              )}
            </div>
            {currentSpace.description && (
              <p className="text-sm text-muted-foreground">{currentSpace.description}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">{currentSpace.post_count} posts</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => toggleSubscription.mutate()}
              title={spaceSubscription?.notify_new_posts === false ? "Ativar notificações" : "Silenciar"}>
              {spaceSubscription?.notify_new_posts === false
                ? <BellOff className="h-4 w-4 text-muted-foreground" />
                : <Bell className="h-4 w-4 text-primary" />}
            </Button>
            {isAdminMember && (
              <Button variant="ghost" size="icon" className="h-8 w-8"
                onClick={() => setEditingSpace(true)}>
                <Pencil className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Compose trigger / composer */}
      {!isMuted && canPostInSpace && (
        <>
          {!showCompose ? (
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-dashed"
              onClick={() => setShowCompose(true)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(member?.display_name || user?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-sm flex-1">Compartilhe algo com a comunidade...</span>
                <Button size="sm" variant="default">
                  <Plus className="h-4 w-4 mr-1.5" />Criar Post
                </Button>
              </div>
            </Card>
          ) : community && member && (
            <PostComposer
              communityId={community.id}
              memberId={member.id}
              memberPoints={member.total_points || 0}
              pointsPerPost={community.points_per_post}
              spaces={spaces || []}
              isAdmin={isAdminMember}
              preselectedSpaceId={currentSpaceId}
              onClose={() => setShowCompose(false)}
              onSuccess={() => {}}
              isMobile={isMobile}
            />
          )}
        </>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {[
            { key: "recent", label: "Recentes" },
            { key: "popular", label: "Populares" },
            { key: "unanswered", label: "Sem resposta" },
          ].map((f) => (
            <Button key={f.key} variant={filter === f.key ? "default" : "outline"} size="sm"
              onClick={() => setFilter(f.key)} className="text-xs">
              {f.label}
            </Button>
          ))}
        </div>
        {!spaceSlug && (
          <Select value={filterSpaceId} onValueChange={setFilterSpaceId}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Espaço" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos espaços</SelectItem>
              {spaces?.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.emoji} {s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            <SelectItem value="DISCUSSION">Discussão</SelectItem>
            <SelectItem value="QUESTION">Pergunta</SelectItem>
            <SelectItem value="WIN">Conquista</SelectItem>
            <SelectItem value="POLL">Enquete</SelectItem>
            <SelectItem value="ANNOUNCEMENT">Anúncio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts?.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">
            {filter === "unanswered" ? "Nenhuma pergunta sem resposta" : "Nenhum post ainda"}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "unanswered" ? "Todas as perguntas foram respondidas! 🎉" : "Seja o primeiro a compartilhar algo! 🎉"}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post: any) => (
            <PostCard
              key={post.id}
              post={post}
              liked={userReactions?.includes(post.id) || false}
              onToggleLike={(id) => toggleLike.mutate(id)}
              isMuted={isMuted}
              showSpace={!spaceSlug}
            />
          ))}
        </div>
      )}

      {/* Edit Space Modal */}
      {editingSpace && currentSpace && community && (
        <SpaceFormModal
          communityId={community.id}
          spacesCount={spaces?.length || 0}
          space={currentSpace}
          onClose={() => setEditingSpace(false)}
        />
      )}
    </div>
  );
}
