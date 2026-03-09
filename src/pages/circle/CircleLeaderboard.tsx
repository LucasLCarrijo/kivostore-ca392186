import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CircleLeaderboard() {
  const { currentWorkspace } = useWorkspace();

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

  const { data: members } = useQuery({
    queryKey: ["circle-leaderboard", community?.id],
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
    enabled: !!community,
  });

  const medalColors = ["text-yellow-500", "text-gray-400", "text-amber-600"];

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center">
        <Trophy className="h-10 w-10 text-yellow-500 mx-auto mb-2" />
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Os membros mais ativos da comunidade</p>
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
                  <Avatar className={cn(isFirst ? "h-20 w-20" : "h-14 w-14", "ring-2 ring-offset-2", medalColors[idx] ? `ring-current ${medalColors[idx]}` : "ring-border")}>
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
                <p className="text-xs text-muted-foreground">{m.total_points} pts</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Full list */}
      <div className="space-y-2">
        {members?.map((m: any, i: number) => (
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
              <p className="text-xs text-muted-foreground">Nível {m.level} · 🔥 {m.current_streak}d</p>
            </div>
            <span className="font-bold text-sm text-foreground">{m.total_points} pts</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
