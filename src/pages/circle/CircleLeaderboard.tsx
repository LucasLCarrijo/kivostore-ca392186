import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLevelInfo, LEVEL_THRESHOLDS } from "@/components/circle/CircleLayout";
import { Progress } from "@/components/ui/progress";

export default function CircleLeaderboard() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [period, setPeriod] = useState<"all" | "monthly" | "weekly">("all");

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
      const { data } = await supabase.from("community_members").select("*").eq("community_id", community.id).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!community && !!user,
  });

  // All-time leaderboard
  const { data: allTimeMembers } = useQuery({
    queryKey: ["circle-leaderboard-alltime", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("status", "ACTIVE")
        .order("total_points", { ascending: false })
        .limit(50);
      return data || [];
    },
    enabled: !!community && period === "all",
  });

  // Period leaderboard from points_log
  const { data: periodMembers } = useQuery({
    queryKey: ["circle-leaderboard-period", community?.id, period],
    queryFn: async () => {
      if (!community || period === "all") return [];
      const now = new Date();
      const start = period === "weekly"
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getFullYear(), now.getMonth(), 1);

      const { data: logs } = await supabase
        .from("community_points_log")
        .select("member_id, points")
        .eq("community_id", community.id)
        .gte("created_at", start.toISOString());

      if (!logs) return [];

      // Aggregate points per member
      const pointsMap = new Map<string, number>();
      logs.forEach((log: any) => {
        pointsMap.set(log.member_id, (pointsMap.get(log.member_id) || 0) + log.points);
      });

      // Get member details
      const memberIds = Array.from(pointsMap.keys());
      if (memberIds.length === 0) return [];

      const { data: members } = await supabase
        .from("community_members")
        .select("*")
        .in("id", memberIds)
        .eq("status", "ACTIVE");

      return (members || [])
        .map((m: any) => ({ ...m, period_points: pointsMap.get(m.id) || 0 }))
        .sort((a: any, b: any) => b.period_points - a.period_points)
        .slice(0, 10);
    },
    enabled: !!community && period !== "all",
  });

  const members = period === "all" ? allTimeMembers : periodMembers;
  const getPoints = (m: any) => period === "all" ? m.total_points : m.period_points;

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  // Current user level progress
  const myLevel = member ? getLevelInfo(member.total_points) : null;
  const nextLevel = myLevel ? LEVEL_THRESHOLDS.find((l) => l.level === myLevel.level + 1) : null;
  const progress = myLevel && nextLevel
    ? Math.round(((member!.total_points - myLevel.min) / (nextLevel.min - myLevel.min)) * 100)
    : 100;

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
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
              {myLevel.level}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">{myLevel.label}</p>
              <p className="text-sm text-muted-foreground">{member.total_points} pontos · 🔥 {member.current_streak} dias</p>
              {nextLevel && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Nível {myLevel.level}</span>
                    <span>Nível {nextLevel.level} ({nextLevel.min} pts)</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}
              {!nextLevel && <p className="text-xs text-primary mt-1">🏆 Nível máximo atingido!</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Level legend */}
      <Card className="p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Níveis</p>
        <div className="flex flex-wrap gap-2">
          {LEVEL_THRESHOLDS.map((l) => (
            <Badge key={l.level} variant={myLevel?.level === l.level ? "default" : "outline"} className="text-xs">
              Lv.{l.level} {l.label} ({l.min}+ pts)
            </Badge>
          ))}
        </div>
      </Card>

      {/* Period filter */}
      <div className="flex gap-2 justify-center">
        {[
          { key: "weekly" as const, label: "Semanal" },
          { key: "monthly" as const, label: "Mensal" },
          { key: "all" as const, label: "Geral" },
        ].map((p) => (
          <Button
            key={p.key}
            variant={period === p.key ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Top 3 podium */}
      {members && members.length >= 3 && (
        <div className="flex items-end justify-center gap-4 pt-4">
          {[1, 0, 2].map((idx) => {
            const m = members[idx];
            if (!m) return null;
            const isFirst = idx === 0;
            return (
              <div key={m.id} className={cn("flex flex-col items-center", isFirst ? "order-2" : idx === 1 ? "order-1" : "order-3")}>
                <div className={cn("relative", isFirst && "mb-2")}>
                  <Avatar className={cn(isFirst ? "h-20 w-20" : "h-14 w-14", "ring-2 ring-offset-2 ring-border")}>
                    <AvatarImage src={m.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(m.display_name || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className={cn("absolute -bottom-1 -right-1 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold bg-card border-2 border-border", medalColors[idx])}>
                    {idx + 1}
                  </span>
                </div>
                <p className="text-sm font-semibold mt-2 truncate max-w-[80px] text-center">{m.display_name || "Membro"}</p>
                <p className="text-xs text-muted-foreground">{getPoints(m)} pts</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {members?.map((m: any, i: number) => {
          const levelInfo = getLevelInfo(m.total_points);
          return (
            <Card key={m.id} className={cn("p-4 flex items-center gap-3", i < 3 && "border-primary/20")}>
              <span className={cn("w-8 text-center font-bold text-sm", i < 3 ? medalColors[i] : "text-muted-foreground")}>
                {i + 1}
              </span>
              <Avatar className="h-10 w-10">
                <AvatarImage src={m.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {(m.display_name || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{m.display_name || "Membro"}</p>
                <p className="text-xs text-muted-foreground">{levelInfo.label} · 🔥 {m.current_streak}d</p>
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
    </div>
  );
}
