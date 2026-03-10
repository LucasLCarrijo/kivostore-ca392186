import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Users, MessageSquare, MessageCircle, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  community: any;
}

export default function AdminDashboardTab({ community }: Props) {
  const weekAgo = subDays(new Date(), 7).toISOString();
  const monthAgo = subDays(new Date(), 30).toISOString();

  const { data: activeMembers } = useQuery({
    queryKey: ["admin-active-members", community.id],
    queryFn: async () => {
      const { count } = await supabase.from("community_members").select("*", { count: "exact", head: true })
        .eq("community_id", community.id).eq("status", "ACTIVE");
      return count || 0;
    },
  });

  const { data: postsThisWeek } = useQuery({
    queryKey: ["admin-posts-week", community.id],
    queryFn: async () => {
      const { count } = await supabase.from("community_posts").select("*", { count: "exact", head: true })
        .eq("community_id", community.id).gte("created_at", weekAgo).is("deleted_at", null);
      return count || 0;
    },
  });

  const { data: commentsThisWeek } = useQuery({
    queryKey: ["admin-comments-week", community.id],
    queryFn: async () => {
      const { data: posts } = await supabase.from("community_posts").select("id")
        .eq("community_id", community.id);
      if (!posts?.length) return 0;
      const postIds = posts.map((p: any) => p.id);
      const { count } = await supabase.from("community_comments").select("*", { count: "exact", head: true })
        .in("post_id", postIds).gte("created_at", weekAgo).is("deleted_at", null);
      return count || 0;
    },
  });

  const { data: reactionsThisWeek } = useQuery({
    queryKey: ["admin-reactions-week", community.id],
    queryFn: async () => {
      const { data: members } = await supabase.from("community_members").select("id")
        .eq("community_id", community.id);
      if (!members?.length) return 0;
      const memberIds = members.map((m: any) => m.id);
      const { count } = await supabase.from("community_reactions").select("*", { count: "exact", head: true })
        .in("member_id", memberIds).gte("created_at", weekAgo);
      return count || 0;
    },
  });

  const engagement = activeMembers && activeMembers > 0
    ? Math.round(((postsThisWeek || 0) + (commentsThisWeek || 0) + (reactionsThisWeek || 0)) / activeMembers * 100)
    : 0;

  // New members per day (last 30 days)
  const { data: newMembersChart } = useQuery({
    queryKey: ["admin-members-chart", community.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_members").select("joined_at")
        .eq("community_id", community.id).gte("joined_at", monthAgo);
      const days: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        days[d] = 0;
      }
      data?.forEach((m: any) => {
        const d = format(new Date(m.joined_at), "yyyy-MM-dd");
        if (days[d] !== undefined) days[d]++;
      });
      return Object.entries(days).map(([date, count]) => ({
        date: format(new Date(date), "dd/MM"),
        membros: count,
      }));
    },
  });

  // Posts per day (last 30 days)
  const { data: postsChart } = useQuery({
    queryKey: ["admin-posts-chart", community.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_posts").select("created_at")
        .eq("community_id", community.id).gte("created_at", monthAgo).is("deleted_at", null);
      const days: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        days[d] = 0;
      }
      data?.forEach((p: any) => {
        const d = format(new Date(p.created_at), "yyyy-MM-dd");
        if (days[d] !== undefined) days[d]++;
      });
      return Object.entries(days).map(([date, count]) => ({
        date: format(new Date(date), "dd/MM"),
        posts: count,
      }));
    },
  });

  // Top 10 posts by engagement this week
  const { data: topPosts } = useQuery({
    queryKey: ["admin-top-posts", community.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_posts")
        .select("id, title, like_count, comment_count, view_count, created_at, author:community_members!author_id(display_name)")
        .eq("community_id", community.id).gte("created_at", weekAgo).is("deleted_at", null)
        .order("like_count", { ascending: false }).limit(10);
      return data || [];
    },
  });

  const metrics = [
    { label: "Membros Ativos", value: activeMembers ?? 0, icon: Users, color: "text-primary" },
    { label: "Posts esta semana", value: postsThisWeek ?? 0, icon: MessageSquare, color: "text-blue-500" },
    { label: "Comentários esta semana", value: commentsThisWeek ?? 0, icon: MessageCircle, color: "text-green-500" },
    { label: "Engajamento", value: `${engagement}%`, icon: TrendingUp, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Novos membros (30 dias)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={newMembersChart || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="membros" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4">Posts por dia (30 dias)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={postsChart || []}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="posts" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Top posts table */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4">Posts mais engajados (esta semana)</h3>
        {topPosts && topPosts.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Autor</TableHead>
                <TableHead className="text-center">❤️</TableHead>
                <TableHead className="text-center">💬</TableHead>
                <TableHead className="text-center">👁️</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPosts.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-sm max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.author?.display_name || "—"}</TableCell>
                  <TableCell className="text-center text-sm">{p.like_count}</TableCell>
                  <TableCell className="text-center text-sm">{p.comment_count}</TableCell>
                  <TableCell className="text-center text-sm">{p.view_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum post esta semana.</p>
        )}
      </Card>
    </div>
  );
}
