import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Eye, Pin, BarChart3, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import LevelBadge from "@/components/circle/LevelBadge";

interface PostCardProps {
  post: any;
  liked: boolean;
  onToggleLike: (postId: string) => void;
  isMuted: boolean;
  showSpace?: boolean;
}

const POST_TYPE_STYLES: Record<string, { label: string; badge: string; border?: string }> = {
  QUESTION: { label: "❓ Pergunta", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300", border: "" },
  POLL: { label: "📊 Enquete", badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300", border: "" },
  ANNOUNCEMENT: { label: "📢 Anúncio", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", border: "border-l-4 border-l-primary" },
  WIN: { label: "🏆 Conquista", badge: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300", border: "border-l-4 border-l-yellow-400" },
};

function getVideoThumb(url: string | null) {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return null;
}

export default function PostCard({ post, liked, onToggleLike, isMuted, showSpace = true }: PostCardProps) {
  const typeStyle = POST_TYPE_STYLES[post.post_type];
  const videoThumb = getVideoThumb(post.video_url);

  return (
    <Card className={cn(
      "p-4 hover:shadow-md transition-shadow",
      typeStyle?.border,
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-primary/10">
          <AvatarImage src={post.author?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            {(post.author?.display_name || "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-foreground">
              {post.author?.display_name || "Membro"}
            </span>
            {post.author?.role && post.author.role !== "MEMBER" && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {post.author.role === "OWNER" ? "Criador" : post.author.role === "ADMIN" ? "Admin" : "Mod"}
              </Badge>
            )}
            <LevelBadge points={post.author?.total_points || 0} size="sm" />
            <span className="text-xs text-muted-foreground">
              · {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {showSpace && post.space && (
              <Link
                to={`/circle/spaces/${post.space.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-primary transition-colors"
              >
                {post.space.emoji} {post.space.name}
              </Link>
            )}
            {typeStyle && post.post_type !== "DISCUSSION" && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", typeStyle.badge)}>
                {typeStyle.label}
              </span>
            )}
            {post.is_pinned && (
              <span className="flex items-center gap-0.5 text-[10px] text-primary font-medium">
                <Pin className="h-3 w-3" /> Fixado
              </span>
            )}
            {post.post_type === "QUESTION" && post.is_answered && (
              <span className="text-[10px] text-green-600 font-medium">✅ Respondida</span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <Link to={`/circle/post/${post.id}`} className="block mt-3 ml-[52px]">
        <h3 className="font-semibold text-foreground hover:text-primary transition-colors leading-snug">
          {post.title}
        </h3>
        {post.body && (
          <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3 whitespace-pre-wrap">
            {post.body.replace(/<[^>]*>/g, "")}
          </p>
        )}

        {/* Image preview */}
        {post.images && (post.images as string[]).length > 0 && (
          <div className="mt-3 flex gap-2">
            <img
              src={(post.images as string[])[0]}
              alt=""
              className="max-h-[200px] rounded-lg object-cover border border-border"
            />
            {(post.images as string[]).length > 1 && (
              <div className="flex items-center justify-center h-20 w-20 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                +{(post.images as string[]).length - 1}
              </div>
            )}
          </div>
        )}

        {/* Video thumbnail */}
        {videoThumb && (
          <div className="mt-3 relative max-h-[200px] overflow-hidden rounded-lg border border-border">
            <img src={videoThumb} alt="" className="w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="h-12 w-12 rounded-full bg-primary/90 flex items-center justify-center">
                <Play className="h-5 w-5 text-primary-foreground ml-0.5" />
              </div>
            </div>
          </div>
        )}

        {/* Poll preview */}
        {post.post_type === "POLL" && post.poll_options && (
          <div className="mt-3 space-y-1.5">
            {(post.poll_options as any[]).slice(0, 3).map((opt: any) => (
              <div key={opt.id} className="flex items-center gap-2 text-xs">
                <BarChart3 className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{opt.text}</span>
              </div>
            ))}
            {(post.poll_options as any[]).length > 3 && (
              <p className="text-xs text-muted-foreground">+{(post.poll_options as any[]).length - 3} opções</p>
            )}
            <p className="text-xs text-primary font-medium">Votar →</p>
          </div>
        )}
      </Link>

      {/* Footer actions */}
      <div className="mt-3 ml-[52px] flex items-center gap-5">
        <button
          onClick={() => !isMuted && onToggleLike(post.id)}
          disabled={isMuted}
          className={cn(
            "flex items-center gap-1.5 text-sm transition-all",
            liked ? "text-primary" : "text-muted-foreground hover:text-primary",
            isMuted && "opacity-50 cursor-not-allowed"
          )}
        >
          <Heart className={cn("h-4 w-4 transition-transform", liked && "fill-current scale-110")} />
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
}
