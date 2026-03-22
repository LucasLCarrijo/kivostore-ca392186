import { addHours, isPast, isWithinInterval } from "date-fns";

// ── Level System ──

export const LEVEL_THRESHOLDS = [
  { level: 1, min: 0, label: "Iniciante" },
  { level: 2, min: 50, label: "Engajado" },
  { level: 3, min: 150, label: "Contribuidor" },
  { level: 4, min: 350, label: "Expert" },
  { level: 5, min: 750, label: "Lenda" },
];

export function getLevelInfo(points: number) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LEVEL_THRESHOLDS[i].min) return LEVEL_THRESHOLDS[i];
  }
  return LEVEL_THRESHOLDS[0];
}

// ── Event Status ──

export interface EventStatus {
  label: string;
  color: string;
  key: "cancelled" | "past" | "live" | "upcoming";
  isLive: boolean;
}

export function getEventStatus(event: { starts_at: string; ends_at?: string | null; status?: string }): EventStatus {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : addHours(start, 1);

  if (event.status === "CANCELLED") {
    return { label: "Cancelado", color: "bg-destructive/10 text-destructive", key: "cancelled", isLive: false };
  }
  if (isPast(end)) {
    return { label: "Encerrado", color: "bg-muted text-muted-foreground", key: "past", isLive: false };
  }
  if (isWithinInterval(new Date(), { start, end })) {
    return { label: "🔴 Ao vivo", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 animate-pulse", key: "live", isLive: true };
  }
  return { label: "Em breve", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300", key: "upcoming", isLive: false };
}

// ── Video Embed ──

export function getVideoEmbed(url: string | null | undefined): string | null {
  if (!url) return null;
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  const loomMatch = url.match(/loom\.com\/share\/([a-z0-9]+)/i);
  if (loomMatch) return `https://www.loom.com/embed/${loomMatch[1]}`;
  return null;
}

// ── Google Calendar URL ──

export function buildGCalUrl(event: { title: string; starts_at: string; ends_at?: string | null; description?: string | null; meeting_url?: string | null }): string {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(event.meeting_url || "")}`;
}

// ── Shared Constants ──

export const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  discord: "Discord",
  custom: "Link personalizado",
};

export const POST_BORDER: Record<string, string> = {
  ANNOUNCEMENT: "border-l-4 border-l-primary",
  WIN: "border-l-4 border-l-yellow-400",
};

export const POST_TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
  DISCUSSION: { emoji: "💬", label: "Discussão" },
  QUESTION: { emoji: "❓", label: "Pergunta" },
  WIN: { emoji: "🏆", label: "Conquista" },
  ANNOUNCEMENT: { emoji: "📢", label: "Anúncio" },
  POLL: { emoji: "📊", label: "Enquete" },
};

export const ACTION_LABELS: Record<string, string> = {
  POST_CREATED: "Criou um post",
  COMMENT_CREATED: "Comentou",
  LIKE_RECEIVED: "Recebeu like",
  DAILY_LOGIN: "Login diário",
  STREAK_BONUS: "Bônus de streak",
  ADMIN_BONUS: "Bônus admin",
  COURSE_COMPLETED: "Completou curso",
  EVENT_ATTENDED: "Participou de evento",
};

// ── Duration Formatting ──

export function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}min` : `${h}h`;
  }
  return `${minutes}min`;
}
