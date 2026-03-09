import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, MessageCircle, Eye, Pin, Send, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLevelInfo } from "@/components/circle/CircleLayout";

export default function CircleFeed() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const { slug: spaceSlug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("DISCUSSION");
  const [filter, setFilter] = useState("recent");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSpaceId, setFilterSpaceId] = useState<string>("all");

  // Poll state
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

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

  const { data: member } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!community && !!user,
  });

  const { data: spaces } = useQuery({
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

  // Resolve space slug to ID
  const currentSpaceId = spaceSlug
    ? spaces?.find((s: any) => s.slug === spaceSlug)?.id
    : null;

  const { data: posts, isLoading } = useQuery({
    queryKey: ["circle-posts", community?.id, filter, filterType, filterSpaceId, currentSpaceId],
    queryFn: async () => {
      if (!community) return [];
      let query = supabase
        .from("community_posts")
        .select(`
          *,
          author:community_members!author_id(id, display_name, avatar_url, level, role, total_points),
          space:community_spaces!space_id(id, name, emoji, slug)
        `)
        .eq("community_id", community.id)
        .is("deleted_at", null);

      // Space filter (from URL slug or dropdown)
      if (currentSpaceId) {
        query = query.eq("space_id", currentSpaceId);
      } else if (filterSpaceId !== "all") {
        query = query.eq("space_id", filterSpaceId);
      }

      // Type filter
      if (filterType !== "all") {
        query = query.eq("post_type", filterType);
      }

      // Sort
      if (filter === "recent") {
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
        .from("community_reactions")
        .select("post_id")
        .eq("member_id", member.id);
      return data?.map((r: any) => r.post_id) || [];
    },
    enabled: !!member,
  });

  const isMuted = member?.status === "MUTED";
  const isAdminMember = member?.role === "OWNER" || member?.role === "ADMIN" || member?.role === "MODERATOR";

  const createPost = useMutation({
    mutationFn: async () => {
      if (!community || !member || !selectedSpace || !newTitle.trim()) throw new Error("Missing data");

      const postData: any = {
        community_id: community.id,
        space_id: selectedSpace,
        author_id: member.id,
        title: newTitle.trim(),
        body: newBody.trim() || null,
        post_type: selectedType,
      };

      // Add poll options if poll
      if (selectedType === "POLL") {
        const validOptions = pollOptions.filter((o) => o.trim());
        if (validOptions.length < 2) throw new Error("Poll needs at least 2 options");
        postData.poll_options = validOptions.map((text, i) => ({
          id: `opt_${i}`,
          text: text.trim(),
          votes: 0,
        }));
      }

      const { data: post, error } = await supabase
        .from("community_posts")
        .insert(postData)
        .select()
        .single();
      if (error) throw error;

      // Award points
      await supabase.from("community_points_log").insert({
        community_id: community.id,
        member_id: member.id,
        action: "POST_CREATED",
        points: community.points_per_post,
        reference_id: post.id,
        reference_type: "post",
        description: "Criou um post",
      });

      // Update member points
      await supabase
        .from("community_members")
        .update({
          total_points: (member.total_points || 0) + community.points_per_post,
          last_active_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      return post;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-posts"] });
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });
      setNewTitle("");
      setNewBody("");
      setSelectedSpace("");
      setSelectedType("DISCUSSION");
      setPollOptions(["", ""]);
      setShowCompose(false);
      toast.success("Post publicado! +" + (community?.points_per_post || 3) + " pts");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao publicar post"),
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!member || !community) throw new Error("Not a member");
      const liked = userReactions?.includes(postId);
      if (liked) {
        await supabase.from("community_reactions").delete().eq("member_id", member.id).eq("post_id", postId);
      } else {
        await supabase.from("community_reactions").insert({ member_id: member.id, post_id: postId, emoji: "❤️" });

        // Award point to the post author
        const post = posts?.find((p: any) => p.id === postId);
        if (post && post.author_id !== member.id) {
          await supabase.from("community_points_log").insert({
            community_id: community.id,
            member_id: post.author_id,
            action: "LIKE_RECEIVED",
            points: community.points_per_like_received,
            reference_id: postId,
            reference_type: "post",
            description: "Recebeu um like",
          });
          await supabase.rpc("increment_member_points" as any, {
            p_member_id: post.author_id,
            p_points: community.points_per_like_received,
          }).then(() => {}).catch(() => {
            // Fallback: direct update
            supabase
              .from("community_members")
              .update({ total_points: (post.author?.total_points || 0) + community.points_per_like_received })
              .eq("id", post.author_id);
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-posts"] });
      queryClient.invalidateQueries({ queryKey: ["circle-reactions"] });
    },
  });

  const postTypeLabels: Record<string, { label: string; color: string }> = {
    QUESTION: { label: "Pergunta", color: "bg-blue-100 text-blue-700" },
    POLL: { label: "Enquete", color: "bg-purple-100 text-purple-700" },
    ANNOUNCEMENT: { label: "Anúncio", color: "bg-yellow-100 text-yellow-700" },
    WIN: { label: "🏆 Conquista", color: "bg-green-100 text-green-700" },
  };

  const currentSpace = spaceSlug ? spaces?.find((s: any) => s.slug === spaceSlug) : null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Space header */}
      {currentSpace && (
        <div className="flex items-center gap-3">
          <span className="text-2xl">{currentSpace.emoji}</span>
          <div>
            <h1 className="text-xl font-bold text-foreground">{currentSpace.name}</h1>
            {currentSpace.description && (
              <p className="text-sm text-muted-foreground">{currentSpace.description}</p>
            )}
          </div>
        </div>
      )}

      {/* Compose */}
      {!isMuted && (
        <>
          {!showCompose ? (
            <Card
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setShowCompose(true)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={member?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {(member?.display_name || user?.email || "U").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-muted-foreground text-sm">Compartilhe algo com a comunidade...</span>
              </div>
            </Card>
          ) : (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Novo Post</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowCompose(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-2">
                <Select value={selectedSpace || (currentSpaceId || "")} onValueChange={setSelectedSpace}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Espaço" />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces?.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.emoji} {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISCUSSION">💬 Discussão</SelectItem>
                    <SelectItem value="QUESTION">❓ Pergunta</SelectItem>
                    <SelectItem value="WIN">🏆 Conquista</SelectItem>
                    {isAdminMember && <SelectItem value="ANNOUNCEMENT">📢 Anúncio</SelectItem>}
                    <SelectItem value="POLL">📊 Enquete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="Título do post"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Conte mais detalhes... (opcional)"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                rows={4}
              />
              {/* Poll options */}
              {selectedType === "POLL" && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Opções da enquete:</p>
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder={`Opção ${i + 1}`}
                        value={opt}
                        onChange={(e) => {
                          const copy = [...pollOptions];
                          copy[i] = e.target.value;
                          setPollOptions(copy);
                        }}
                      />
                      {pollOptions.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <Button variant="outline" size="sm" onClick={() => setPollOptions([...pollOptions, ""])}>
                      + Adicionar opção
                    </Button>
                  )}
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  onClick={() => createPost.mutate()}
                  disabled={!newTitle.trim() || !(selectedSpace || currentSpaceId) || createPost.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Publicar
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {[
            { key: "recent", label: "Recentes" },
            { key: "popular", label: "Populares" },
          ].map((f) => (
            <Button
              key={f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
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
                <SelectItem key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </SelectItem>
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : posts?.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground">Nenhum post ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a compartilhar algo!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post: any) => {
            const liked = userReactions?.includes(post.id);
            const typeInfo = postTypeLabels[post.post_type];
            const authorLevel = getLevelInfo(post.author?.total_points || 0);

            return (
              <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {(post.author?.display_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{post.author?.display_name || "Membro"}</span>
                      {post.author?.role && post.author.role !== "MEMBER" && (
                        <Badge variant="secondary" className="text-[10px] h-5">
                          {post.author.role === "OWNER" ? "Criador" : post.author.role === "ADMIN" ? "Admin" : "Mod"}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{authorLevel.label}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {post.space && !spaceSlug && (
                        <Link
                          to={`/circle/spaces/${post.space.slug}`}
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {post.space.emoji} {post.space.name}
                        </Link>
                      )}
                      {typeInfo && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                      )}
                      {post.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                      {post.is_locked && <span className="text-[10px] text-muted-foreground">🔒</span>}
                      {post.is_answered && <span className="text-[10px] text-green-600">✅ Respondido</span>}
                    </div>
                  </div>
                </div>

                {/* Content - clickable to post detail */}
                <Link to={`/circle/post/${post.id}`} className="block mt-3 ml-[52px]">
                  <h3 className="font-semibold text-foreground hover:text-primary transition-colors">{post.title}</h3>
                  {post.body && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                      {post.body}
                    </p>
                  )}
                  {/* Poll preview */}
                  {post.post_type === "POLL" && post.poll_options && (
                    <div className="mt-2 space-y-1.5">
                      {(post.poll_options as any[]).slice(0, 3).map((opt: any) => (
                        <div key={opt.id} className="flex items-center gap-2 text-xs">
                          <BarChart3 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{opt.text}</span>
                        </div>
                      ))}
                      <p className="text-xs text-primary">Votar →</p>
                    </div>
                  )}
                </Link>

                {/* Actions */}
                <div className="mt-3 ml-[52px] flex items-center gap-4">
                  <button
                    onClick={() => !isMuted && toggleLike.mutate(post.id)}
                    disabled={isMuted}
                    className={cn(
                      "flex items-center gap-1.5 text-sm transition-colors",
                      liked ? "text-primary" : "text-muted-foreground hover:text-primary",
                      isMuted && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                    <span>{post.like_count}</span>
                  </button>
                  <Link
                    to={`/circle/post/${post.id}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comment_count}</span>
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" />
                    <span>{post.view_count}</span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
