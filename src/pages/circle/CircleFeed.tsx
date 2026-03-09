import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Heart, MessageCircle, Eye, Pin, Send, Image, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CircleFeed() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [selectedSpace, setSelectedSpace] = useState<string>("");
  const [filter, setFilter] = useState("recent");

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

  const { data: posts, isLoading } = useQuery({
    queryKey: ["circle-posts", community?.id, filter],
    queryFn: async () => {
      if (!community) return [];
      let query = supabase
        .from("community_posts")
        .select(`
          *,
          author:community_members!author_id(id, display_name, avatar_url, level, role),
          space:community_spaces!space_id(id, name, emoji, slug)
        `)
        .eq("community_id", community.id)
        .is("deleted_at", null);

      if (filter === "recent") {
        query = query.order("created_at", { ascending: false });
      } else if (filter === "popular") {
        query = query.order("like_count", { ascending: false });
      } else if (filter === "pinned") {
        query = query.eq("is_pinned", true).order("created_at", { ascending: false });
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

  const createPost = useMutation({
    mutationFn: async () => {
      if (!community || !member || !selectedSpace || !newTitle.trim()) throw new Error("Missing data");
      const { error } = await supabase.from("community_posts").insert({
        community_id: community.id,
        space_id: selectedSpace,
        author_id: member.id,
        title: newTitle.trim(),
        body: newBody.trim() || null,
        post_type: "DISCUSSION",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-posts"] });
      setNewTitle("");
      setNewBody("");
      setSelectedSpace("");
      setShowCompose(false);
      toast.success("Post publicado!");
    },
    onError: () => toast.error("Erro ao publicar post"),
  });

  const toggleLike = useMutation({
    mutationFn: async (postId: string) => {
      if (!member) throw new Error("Not a member");
      const liked = userReactions?.includes(postId);
      if (liked) {
        await supabase.from("community_reactions").delete().eq("member_id", member.id).eq("post_id", postId);
      } else {
        await supabase.from("community_reactions").insert({ member_id: member.id, post_id: postId, emoji: "❤️" });
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
    WIN: { label: "Conquista", color: "bg-green-100 text-green-700" },
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Compose */}
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
          <Select value={selectedSpace} onValueChange={setSelectedSpace}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um espaço" />
            </SelectTrigger>
            <SelectContent>
              {spaces?.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.emoji} {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          <div className="flex justify-end">
            <Button
              onClick={() => createPost.mutate()}
              disabled={!newTitle.trim() || !selectedSpace || createPost.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Publicar
            </Button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: "recent", label: "Recentes" },
          { key: "popular", label: "Populares" },
          { key: "pinned", label: "Fixados" },
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
          <h3 className="font-semibold text-foreground">Nenhum post ainda</h3>
          <p className="text-sm text-muted-foreground mt-1">Seja o primeiro a compartilhar algo!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts?.map((post: any) => {
            const liked = userReactions?.includes(post.id);
            const typeInfo = postTypeLabels[post.post_type];

            return (
              <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">
                {/* Author */}
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
                      <span className="text-xs text-muted-foreground">Lv.{post.author?.level || 1}</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {post.space && (
                        <span className="text-xs text-muted-foreground">
                          {post.space.emoji} {post.space.name}
                        </span>
                      )}
                      {typeInfo && (
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", typeInfo.color)}>
                          {typeInfo.label}
                        </span>
                      )}
                      {post.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="mt-3 ml-[52px]">
                  <h3 className="font-semibold text-foreground">{post.title}</h3>
                  {post.body && (
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-4">
                      {post.body}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-3 ml-[52px] flex items-center gap-4">
                  <button
                    onClick={() => toggleLike.mutate(post.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-sm transition-colors",
                      liked ? "text-primary" : "text-muted-foreground hover:text-primary"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", liked && "fill-current")} />
                    <span>{post.like_count}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span>{post.comment_count}</span>
                  </button>
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
