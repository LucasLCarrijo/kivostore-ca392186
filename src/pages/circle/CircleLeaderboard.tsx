import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trophy, TrendingUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelInfo, LEVEL_THRESHOLDS } from "@/components/circle/CircleLayout";
import { Progress } from "@/components/ui/progress";
import LevelBadge from "@/components/circle/LevelBadge";
import MemberProfileModal from "@/components/circle/MemberProfileModal";
import { ACTION_LABELS } from "@/lib/community-utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const PODIUM_GRADIENTS = [
  "bg-gradient-to-b from-yellow-50 to-transparent dark:from-yellow-950/20",
  "bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-800/20",
  "bg-gradient-to-b from-amber-50 to-transparent dark:from-amber-950/20",
];

export default function CircleLeaderboard() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"all" | "monthly" | "weekly">("all");
  const [profileMemberId, setProfileMemberId] = useState<string | null>(null);

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
      const { data } = await supabase.from("community_members").select("*")
        .eq("community_id", community.id).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!community && !!user,
  });

  const { data: allTimeMembers } = useQuery({
    queryKey: ["circle-leaderboard-alltime", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase.from("community_members").select("*")
        .eq("community_id", community.id).eq("status", "ACTIVE")
        .order("total_points", { ascending: false }).limit(50);
      return data || [];
    },
    enabled: !!community && period === "all",
  });

  const { data: periodMembers } = useQuery({
    queryKey: ["circle-leaderboard-period", community?.id, period],
    queryFn: async () => {
      if (!community || period === "all") return [];
      const now = new Date();
      const start = period === "weekly"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: logs } = await supabase.from("community_points_log")
        .select("member_id, points").eq("community_id", community.id)
        .gte("created_at", start.toISOString());

      if (!logs) return [];
      const pointsMap = new Map<string, number>();
      logs.forEach((log: any) => {
        pointsMap.set(log.member_id, (pointsMap.get(log.member_id) || 0) + log.points);
      });

      const memberIds = Array.from(pointsMap.keys());
      if (memberIds.length === 0) return [];

      const { data: members } = await supabase.from("community_members").select("*")
        .in("id", memberIds).eq("status", "ACTIVE");

      return (members || [])
        .map((m: any) => ({ ...m, period_points: pointsMap.get(m.id) || 0 }))
        .sort((a: any, b: any) => b.period_points - a.period_points)
        .slice(0, 50);
    },
    enabled: !!community && period !== "all",
  });

  const { data: myPointsLog } = useQuery({
    queryKey: ["circle-my-points", member?.id],
    queryFn: async () => {
      if (!member) return [];
      const { data } = await supabase.from("community_points_log")
        .select("*").eq("member_id", member.id)
        .order("created_at", { ascending: false }).limit(20);
      return data || [];
    },
    enabled: !!member,
  });

  const members = period === "all" ? allTimeMembers : periodMembers;
  const getPoints = (m: any) => period === "all" ? m.total_points : m.period_points;

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];
  const medalEmoji = ["🥇", "🥈", "🥉"];

  const myLevel = member ? getLevelInfo(member.total_points) : null;
  const nextLevel = myLevel ? LEVEL_THRESHOLDS.find((l) => l.level === myLevel.level + 1) : null;
  const progress = myLevel && nextLevel
    ? Math.round(((member!.total_points - myLevel.min) / (nextLevel.min - myLevel.min)) * 100)
    : 100;

  // Find user's position in the list
  const myPosition = members?.findIndex((m: any) => m.id === member?.id);
  const myRank = myPosition !== undefined && myPosition >= 0 ? myPosition + 1 : null;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center">
        <Trophy className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Os membros mais ativos da comunidade</p>
      </div>

      {/* My level card */}
      {member && myLevel && (
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <LevelBadge points={member.total_points} size="md" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-foreground">{myLevel.label}</p>
                <LevelBadge points={member.total_points} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground">
                {member.total_points} pontos · <Flame className="h-3.5 w-3.5 inline text-orange-500" /> {member.current_streak} dias · Recorde: {member.longest_streak}d
              </p>
              {nextLevel && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Nível {myLevel.level}</span>
                    <span>Nível {nextLevel.level} ({nextLevel.min} pts)</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Faltam {nextLevel.min - member.total_points} pontos
                  </p>
                </div>
              )}
              {!nextLevel && <p className="text-xs text-primary mt-1">👑 Nível máximo atingido!</p>}
            </div>
          </div>
        </Card>
      )}

      {/* My rank banner (if outside top 10) */}
      {myRank && myRank > 10 && (
        <Card className="p-3 bg-primary/5 border-primary/20 text-center">
          <p className="text-sm text-foreground font-medium">
            Você está na posição <span className="font-bold text-primary">#{myRank}</span>
          </p>
        </Card>
      )}

      {/* Period filter */}
      <div className="flex gap-2 justify-center">
        {([
          { key: "weekly" as const, label: "Semanal" },
          { key: "monthly" as const, label: "Mensal" },
          { key: "all" as const, label: "Geral" },
        ]).map((p) => (
          <Button key={p.key} variant={period === p.key ? "default" : "outline"} size="sm" onClick={() => setPeriod(p.key)}>
            {p.label}
          </Button>
        ))}
      </div>

      {/* Top 3 podium with gradients */}
      {members && members.length >= 3 && (
        <div className="flex items-end justify-center gap-3 pt-4">
          {[1, 0, 2].map((idx) => {
            const m = members[idx];
            if (!m) return null;
            const isFirst = idx === 0;
            return (
              <div
                key={m.id}
                onClick={() => setProfileMemberId(m.id)}
                className={cn(
                  "flex flex-col items-center rounded-xl p-4 cursor-pointer transition-transform hover:scale-105",
                  PODIUM_GRADIENTS[idx],
                  isFirst ? "order-2" : idx === 1 ? "order-1" : "order-3"
                )}
              >
                <span className="text-2xl mb-1">{medalEmoji[idx]}</span>
                <div className={cn("relative", isFirst && "mb-1")}>
                  <Avatar className={cn(isFirst ? "h-20 w-20" : "h-14 w-14", "ring-2 ring-offset-2 ring-border")}>
                    <AvatarImage src={m.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(m.display_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <p className="text-sm font-semibold mt-2 truncate max-w-[90px] text-center text-foreground">{m.display_name || "Membro"}</p>
                <LevelBadge points={m.total_points} size="sm" />
                <p className="text-xs font-bold text-foreground mt-1">{getPoints(m)} pts</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <Flame className="h-3 w-3 text-orange-500" /> {m.current_streak}d
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {members?.map((m: any, i: number) => {
          const isMe = m.id === member?.id;
          return (
            <Card
              key={m.id}
              onClick={() => setProfileMemberId(m.id)}
              className={cn(
                "p-4 flex items-center gap-3 cursor-pointer transition-colors hover:bg-muted/50",
                i < 3 && "border-primary/20",
                isMe && "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
              )}
            >
              <span className={cn("w-8 text-center font-bold text-sm", i < 3 ? medalColors[i] : "text-muted-foreground")}>
                {i < 3 ? medalEmoji[i] : `#${i + 1}`}
              </span>
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(m.display_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn("font-medium text-sm truncate", isMe && "text-primary")}>{m.display_name || "Membro"}</p>
                  {isMe && <span className="text-[10px] text-primary font-medium">(você)</span>}
                  <LevelBadge points={m.total_points} size="sm" />
                </div>
                <p className="text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 inline text-orange-500" /> {m.current_streak}d
                </p>
              </div>
              <span className="font-bold text-sm text-foreground">{getPoints(m)} pts</span>
            </Card>
          );
        })}
        {(!members || members.length === 0) && (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">Nenhum dado para o período selecionado.</p>
          </Card>
        )}
      </div>

      {/* Level legend */}
      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Níveis de progressão</p>
        <div className="space-y-2">
          {LEVEL_THRESHOLDS.map((l) => (
            <div key={l.level} className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
              myLevel?.level === l.level ? "bg-primary/10 border border-primary/20" : "bg-muted/30"
            )}>
              <LevelBadge points={l.min} size="sm" showLabel />
              <span className="text-xs text-muted-foreground ml-auto">{l.min}+ pts</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Points config info */}
      {community && (
        <Card className="p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Como ganhar pontos</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { label: "Criar post", value: community.points_per_post },
              { label: "Comentar", value: community.points_per_comment },
              { label: "Receber like", value: community.points_per_like_received },
              { label: "Login diário", value: community.points_per_daily_login },
              { label: "Completar curso", value: community.points_per_course_completed },
              { label: "Melhor resposta", value: 5 },
              { label: "Participar de evento", value: 2 },
              { label: "Streak 7 dias", value: 3 },
            ].map((item) => (
              <div key={item.label} className="flex justify-between p-2 bg-muted/30 rounded">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-semibold text-foreground">+{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* My points history */}
      {myPointsLog && myPointsLog.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Seu histórico de pontos</h3>
          </div>
          <div className="space-y-1.5">
            {myPointsLog.map((log: any) => (
              <div key={log.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-600 dark:text-green-400">+{log.points}</span>
                  <span className="text-muted-foreground">{log.description || ACTION_LABELS[log.action] || log.action}</span>
                </div>
                <span className="text-muted-foreground text-[10px]">
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Member profile modal */}
      <MemberProfileModal
        memberId={profileMemberId}
        communityId={community?.id || null}
        open={!!profileMemberId}
        onOpenChange={(open) => !open && setProfileMemberId(null)}
      />
    </div>
  );
}
