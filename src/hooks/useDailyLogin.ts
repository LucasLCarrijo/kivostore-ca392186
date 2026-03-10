import { useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getLevelInfo } from "@/components/circle/CircleLayout";

/**
 * Tracks daily login for a community member.
 * Awards daily login points, updates streak, and awards streak bonus every 7 days.
 * Also detects level-up and shows celebration toast.
 */
export function useDailyLogin(member: any, community: any) {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  const trackLogin = useMutation({
    mutationFn: async () => {
      if (!member || !community) return null;

      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      const lastActiveStr = member.last_active_at
        ? new Date(member.last_active_at).toISOString().slice(0, 10)
        : null;

      // Already tracked today
      if (lastActiveStr === todayStr) return null;

      const previousLevel = getLevelInfo(member.total_points);

      // Calculate streak
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);

      const isConsecutive = lastActiveStr === yesterdayStr;
      const newStreak = isConsecutive ? (member.current_streak || 0) + 1 : 1;
      const longestStreak = Math.max(newStreak, member.longest_streak || 0);

      let totalPointsEarned = community.points_per_daily_login || 1;
      const pointLogs: any[] = [];

      // Daily login points
      pointLogs.push({
        community_id: community.id,
        member_id: member.id,
        action: "DAILY_LOGIN" as any,
        points: community.points_per_daily_login || 1,
        description: `Login diário (dia ${newStreak})`,
      });

      // Streak bonus every 7 days
      if (newStreak > 0 && newStreak % 7 === 0) {
        const streakBonus = 3;
        totalPointsEarned += streakBonus;
        pointLogs.push({
          community_id: community.id,
          member_id: member.id,
          action: "STREAK_BONUS" as any,
          points: streakBonus,
          description: `Bônus de streak: ${newStreak} dias consecutivos!`,
        });
      }

      // Insert point logs
      if (pointLogs.length > 0) {
        await supabase.from("community_points_log").insert(pointLogs);
      }

      const newTotal = (member.total_points || 0) + totalPointsEarned;

      // Update member
      await supabase
        .from("community_members")
        .update({
          last_active_at: now.toISOString(),
          current_streak: newStreak,
          longest_streak: longestStreak,
          total_points: newTotal,
        })
        .eq("id", member.id);

      // Check level-up
      const newLevel = getLevelInfo(newTotal);
      const didLevelUp = newLevel.level > previousLevel.level;

      if (didLevelUp) {
        // Create notification for level-up
        await supabase.from("community_notifications").insert({
          community_id: community.id,
          recipient_id: member.id,
          type: "LEVEL_UP" as any,
          title: `🎉 Parabéns! Você subiu para Level ${newLevel.level}!`,
          body: `Você alcançou o nível "${newLevel.label}" com ${newTotal} pontos.`,
        });
      }

      return {
        totalPointsEarned,
        newStreak,
        newTotal,
        didLevelUp,
        newLevel: didLevelUp ? newLevel : null,
        streakBonus: newStreak > 0 && newStreak % 7 === 0,
      };
    },
    onSuccess: (result) => {
      if (!result) return;
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });

      if (result.didLevelUp && result.newLevel) {
        toast.success(`🎉 Level Up! Você agora é ${result.newLevel.label} (Lv${result.newLevel.level})!`, {
          duration: 6000,
        });
      } else if (result.streakBonus) {
        toast.success(`🔥 Streak de ${result.newStreak} dias! +${result.totalPointsEarned} pts`, {
          duration: 4000,
        });
      }
    },
  });

  useEffect(() => {
    if (member && community && !hasRun.current && member.status === "ACTIVE") {
      hasRun.current = true;
      trackLogin.mutate();
    }
  }, [member?.id, community?.id]);
}
