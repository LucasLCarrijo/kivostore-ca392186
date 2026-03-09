import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, ArrowLeft, Send, Pin, Lock, Trash2, CheckCircle, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getLevelInfo } from "@/components/circle/CircleLayout";

export default function CirclePostDetail() {
  const { id: postId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");

  const { data: community } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase.from("communities").select("*").eq("workspace_id", currentWorkspace.id).single();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: member } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase.from("community_members").select("*").eq("community_id", community.id).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!community && !!user,
  });

  const { data: post, isLoading } = useQuery({
    queryKey: ["circle-post", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_posts")
        .select(`*, author:community_members!author_id(id, display_name, avatar_url, level, role, total_points, user_id), space:community_spaces!space_id(id, name, emoji, slug)`)
        .eq("id", postId!)
        .single();

      // Increment view count
      if (data) {
        supabase.from("community_posts").update({ view_count: (data.view_count || 0) + 1 }).eq("id", postId!).then(() => {});
      }
      return data;
    },
    enabled: !!postId,
  });

  const { data: comments } = useQuery({
    queryKey: ["circle-comments", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("community_comments")
        .select(`*, author:community_members!author_id(id, display_name, avatar_url, level, role, total_points)`)
        .eq("post_id", postId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!postId,
  });

  const { data: userReactions } = useQuery({
    queryKey: ["circle-post-reactions", member?.id, postId],
    queryFn: async () => {
      if (!member) return { postLiked: false, commentLikes: [] as string[] };
      const { data: postReaction } = await supabase.from("community_reactions").select("id").eq("member_id", member.id).eq("post_id", postId!).maybeSingle();
      const { data: commentReactions } = await supabase.from("community_reactions").select("comment_id").eq("member_id", member.id).not("comment_id", "is", null);
      return {
        postLiked: !!postReaction,
        commentLikes: commentReactions?.map((r: any) => r.comment_id) || [],
      };
    },
    enabled: !!member && !!postId,
  });

  const { data: pollVotes } = useQuery({
    queryKey: ["circle-poll-votes", postId, member?.id],
    queryFn: async () => {
      if (!member || !postId) return { userVotes: [] as string[], allVotes: [] as any[] };
      const { data: userV } = await supabase.from("community_poll_votes").select("option_id").eq("post_id", postId).eq("member_id", member.id);
      const { data: allV } = await supabase.from("community_poll_votes").select("option_id").eq("post_id", postId);
      return {
        userVotes: userV?.map((v: any) => v.option_id) || [],
        allVotes: allV || [],
      };
    },
    enabled: !!member && !!postId && post?.post_type === "POLL",
  });

  const isMuted = member?.status === "MUTED";
  const isAdmin = member?.role === "OWNER" || member?.role === "ADMIN" || member?.role === "MODERATOR";
  const isAuthor = post?.author?.user_id === user?.id;

  const addComment = useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: string }) => {
      if (!member || !community || !postId) throw new Error("Missing");
      const { data: comment, error } = await supabase.from("community_comments").insert({
        post_id: postId,
        author_id: member.id,
        body: body.trim(),
        parent_id: parentId || null,
      }).select().single();
      if (error) throw error;

      // Award points
      await supabase.from("community_points_log").insert({
        community_id: community.id,
        member_id: member.id,
        action: "COMMENT_CREATED",
        points: community.points_per_comment,
        reference_id: comment.id,
        reference_type: "comment",
        description: "Comentou em um post",
      });
      await supabase.from("community_members").update({
        total_points: (member.total_points || 0) + community.points_per_comment,
        last_active_at: new Date().toISOString(),
      }).eq("id", member.id);

      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["circle-post", postId] });
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });
      setCommentBody("");
      setReplyTo(null);
      setReplyBody("");
      toast.success("Comentário publicado! +" + (community?.points_per_comment || 1) + " pt");
    },
    onError: () => toast.error("Erro ao comentar"),
  });

  const togglePostLike = useMutation({
    mutationFn: async () => {
      if (!member || !community) throw new Error("Missing");
      if (userReactions?.postLiked) {
        await supabase.from("community_reactions").delete().eq("member_id", member.id).eq("post_id", postId!);
      } else {
        await supabase.from("community_reactions").insert({ member_id: member.id, post_id: postId!, emoji: "❤️" });
        if (post?.author_id !== member.id) {
          await supabase.from("community_points_log").insert({
            community_id: community.id, member_id: post?.author_id, action: "LIKE_RECEIVED",
            points: community.points_per_like_received, reference_id: postId!, reference_type: "post", description: "Recebeu um like",
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-post-reactions"] });
      queryClient.invalidateQueries({ queryKey: ["circle-post", postId] });
    },
  });

  const toggleCommentLike = useMutation({
    mutationFn: async (commentId: string) => {
      if (!member || !community) throw new Error("Missing");
      const liked = userReactions?.commentLikes.includes(commentId);
      if (liked) {
        await supabase.from("community_reactions").delete().eq("member_id", member.id).eq("comment_id", commentId);
      } else {
        await supabase.from("community_reactions").insert({ member_id: member.id, comment_id: commentId, emoji: "❤️" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-post-reactions"] });
      queryClient.invalidateQueries({ queryKey: ["circle-comments", postId] });
    },
  });

  const markBestAnswer = useMutation({
    mutationFn: async (commentId: string) => {
      if (!postId) throw new Error("Missing");
      // Unmark previous
      await supabase.from("community_comments").update({ is_best_answer: false }).eq("post_id", postId);
      // Mark new
      await supabase.from("community_comments").update({ is_best_answer: true }).eq("id", commentId);
      await supabase.from("community_posts").update({ is_answered: true, best_answer_id: commentId }).eq("id", postId);

      // Award bonus points to comment author
      const comment = comments?.find((c: any) => c.id === commentId);
      if (comment && community) {
        await supabase.from("community_points_log").insert({
          community_id: community.id, member_id: comment.author_id, action: "ADMIN_BONUS",
          points: 5, reference_id: commentId, reference_type: "comment", description: "Melhor resposta",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-comments", postId] });
      queryClient.invalidateQueries({ queryKey: ["circle-post", postId] });
      toast.success("Melhor resposta marcada! +5 pts para o autor");
    },
  });

  // Admin actions
  const pinPost = useMutation({
    mutationFn: async () => {
      await supabase.from("community_posts").update({ is_pinned: !post?.is_pinned }).eq("id", postId!);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["circle-post", postId] }); toast.success(post?.is_pinned ? "Post desfixado" : "Post fixado"); },
  });

  const lockPost = useMutation({
    mutationFn: async () => {
      await supabase.from("community_posts").update({ is_locked: !post?.is_locked }).eq("id", postId!);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["circle-post", postId] }); toast.success(post?.is_locked ? "Comentários liberados" : "Comentários bloqueados"); },
  });

  const deletePost = useMutation({
    mutationFn: async () => {
      await supabase.from("community_posts").update({ deleted_at: new Date().toISOString() }).eq("id", postId!);
    },
    onSuccess: () => { toast.success("Post excluído"); navigate("/circle/feed"); },
  });

  const votePoll = useMutation({
    mutationFn: async (optionId: string) => {
      if (!member || !postId) throw new Error("Missing");
      const alreadyVoted = pollVotes?.userVotes.includes(optionId);
      if (alreadyVoted) return;
      await supabase.from("community_poll_votes").insert({ post_id: postId, member_id: member.id, option_id: optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-poll-votes"] });
      toast.success("Voto registrado!");
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  if (!post) {
    return <div className="p-6 text-center text-muted-foreground">Post não encontrado.</div>;
  }

  const topComments = comments?.filter((c: any) => !c.parent_id) || [];
  const getReplies = (parentId: string) => comments?.filter((c: any) => c.parent_id === parentId) || [];

  const totalPollVotes = pollVotes?.allVotes.length || 0;
  const getVoteCount = (optionId: string) => pollVotes?.allVotes.filter((v: any) => v.option_id === optionId).length || 0;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="h-4 w-4 mr-2" />Voltar
      </Button>

      {/* Post */}
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11">
            <AvatarImage src={post.author?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary">{(post.author?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{post.author?.display_name || "Membro"}</span>
              {post.author?.role !== "MEMBER" && <Badge variant="secondary" className="text-[10px] h-5">{post.author?.role}</Badge>}
              <span className="text-xs text-muted-foreground">{getLevelInfo(post.author?.total_points || 0).label}</span>
              <span className="text-xs text-muted-foreground">· {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}</span>
            </div>
            {post.space && <span className="text-xs text-muted-foreground">{post.space.emoji} {post.space.name}</span>}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-xl font-bold text-foreground">{post.title}</h1>
            {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
            {post.is_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          {post.body && <p className="text-foreground whitespace-pre-wrap">{post.body}</p>}
        </div>

        {/* Poll */}
        {post.post_type === "POLL" && post.poll_options && (
          <div className="mt-4 space-y-2">
            {(post.poll_options as any[]).map((opt: any) => {
              const count = getVoteCount(opt.id);
              const pct = totalPollVotes > 0 ? Math.round((count / totalPollVotes) * 100) : 0;
              const voted = pollVotes?.userVotes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => !isMuted && votePoll.mutate(opt.id)}
                  disabled={isMuted || voted}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-colors relative overflow-hidden",
                    voted ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  <div className="absolute inset-y-0 left-0 bg-primary/10 transition-all" style={{ width: `${pct}%` }} />
                  <div className="relative flex justify-between items-center">
                    <span className="text-sm font-medium">{opt.text}</span>
                    <span className="text-xs text-muted-foreground">{pct}% ({count})</span>
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground text-center">{totalPollVotes} votos</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center gap-4 pt-3 border-t border-border/40">
          <button
            onClick={() => !isMuted && togglePostLike.mutate()}
            disabled={isMuted}
            className={cn("flex items-center gap-1.5 text-sm", userReactions?.postLiked ? "text-primary" : "text-muted-foreground hover:text-primary")}
          >
            <Heart className={cn("h-4 w-4", userReactions?.postLiked && "fill-current")} />
            {post.like_count}
          </button>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="h-4 w-4" />{post.comment_count}
          </span>

          {/* Admin actions */}
          {(isAdmin || isAuthor) && (
            <div className="ml-auto flex gap-1">
              {isAdmin && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => pinPost.mutate()} title={post.is_pinned ? "Desfixar" : "Fixar"}>
                    <Pin className={cn("h-4 w-4", post.is_pinned && "text-primary fill-current")} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => lockPost.mutate()} title={post.is_locked ? "Desbloquear" : "Bloquear"}>
                    <Lock className={cn("h-4 w-4", post.is_locked && "text-destructive")} />
                  </Button>
                </>
              )}
              {(isAdmin || isAuthor) && (
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Excluir este post?")) deletePost.mutate(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Comment input */}
      {!post.is_locked && !isMuted && (
        <Card className="p-4">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">{(member?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <Textarea
                placeholder="Escreva um comentário..."
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
              />
              <div className="flex justify-end">
                <Button size="sm" onClick={() => addComment.mutate({ body: commentBody })} disabled={!commentBody.trim() || addComment.isPending}>
                  <Send className="h-3.5 w-3.5 mr-1.5" />Comentar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {post.is_locked && (
        <p className="text-center text-sm text-muted-foreground">🔒 Comentários bloqueados neste post.</p>
      )}

      {/* Comments */}
      <div className="space-y-3">
        {topComments.map((comment: any) => {
          const cLiked = userReactions?.commentLikes.includes(comment.id);
          const replies = getReplies(comment.id);
          return (
            <div key={comment.id}>
              <Card className={cn("p-4", comment.is_best_answer && "border-green-500/50 bg-green-50/50")}>
                {comment.is_best_answer && (
                  <Badge className="mb-2 bg-green-100 text-green-700">✅ Melhor Resposta</Badge>
                )}
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{(comment.author?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{comment.author?.display_name || "Membro"}</span>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{comment.body}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => !isMuted && toggleCommentLike.mutate(comment.id)}
                        disabled={isMuted}
                        className={cn("flex items-center gap-1 text-xs", cLiked ? "text-primary" : "text-muted-foreground hover:text-primary")}
                      >
                        <Heart className={cn("h-3.5 w-3.5", cLiked && "fill-current")} />{comment.like_count}
                      </button>
                      {!post.is_locked && !isMuted && (
                        <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="text-xs text-muted-foreground hover:text-foreground">
                          Responder
                        </button>
                      )}
                      {post.post_type === "QUESTION" && (isAdmin || isAuthor) && !comment.is_best_answer && (
                        <button onClick={() => markBestAnswer.mutate(comment.id)} className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />Melhor resposta
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reply input */}
                {replyTo === comment.id && (
                  <div className="mt-3 ml-11 flex gap-2">
                    <Textarea
                      placeholder="Escreva uma resposta..."
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                    <Button size="sm" onClick={() => addComment.mutate({ body: replyBody, parentId: comment.id })} disabled={!replyBody.trim()}>
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </Card>

              {/* Nested replies */}
              {replies.length > 0 && (
                <div className="ml-8 mt-2 space-y-2 border-l-2 border-border/40 pl-4">
                  {replies.map((reply: any) => (
                    <Card key={reply.id} className="p-3">
                      <div className="flex items-start gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-primary/10 text-primary text-[9px]">{(reply.author?.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs">{reply.author?.display_name || "Membro"}</span>
                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}</span>
                          </div>
                          <p className="text-xs text-foreground mt-0.5">{reply.body}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
