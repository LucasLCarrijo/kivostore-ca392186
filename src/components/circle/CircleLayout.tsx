import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { useDailyLogin } from "@/hooks/useDailyLogin";
import {
  MessageSquare,
  Users,
  Trophy,
  Calendar,
  BookOpen,
  Settings,
  Bell,
  ChevronLeft,
  Menu,
  LogIn,
  ShieldX,
  Clock,
  ShoppingCart,
  UserPlus,
  Eye,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import CircleRightSidebar from "@/components/circle/CircleRightSidebar";
import NotificationPanel from "@/components/circle/NotificationPanel";

// Level thresholds
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

interface CircleLayoutProps {
  children: ReactNode;
  showRightSidebar?: boolean;
}

const navItems = [
  { label: "Feed", icon: MessageSquare, path: "/circle/feed" },
  { label: "Classroom", icon: BookOpen, path: "/circle/classroom" },
  { label: "Eventos", icon: Calendar, path: "/circle/events" },
  { label: "Membros", icon: Users, path: "/circle/members" },
  { label: "Leaderboard", icon: Trophy, path: "/circle/leaderboard" },
];

// Mobile bottom tab items (5 icons)
const mobileTabItems = [
  { label: "Feed", icon: MessageSquare, path: "/circle/feed" },
  { label: "Classroom", icon: BookOpen, path: "/circle/classroom" },
  { label: "Eventos", icon: Calendar, path: "/circle/events" },
  { label: "Membros", icon: Users, path: "/circle/members" },
  { label: "Ranking", icon: Trophy, path: "/circle/leaderboard" },
];

export default function CircleLayout({ children, showRightSidebar = true }: CircleLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase
        .from("communities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: member, isLoading: memberLoading } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .maybeSingle();
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

  // Check entitlement for FREE_WITH_PRODUCT access
  const { data: hasEntitlement } = useQuery({
    queryKey: ["circle-entitlement", community?.linked_product_id, user?.id],
    queryFn: async () => {
      if (!community?.linked_product_id || !user) return false;
      const { data } = await supabase
        .from("entitlements" as any)
        .select("id")
        .eq("product_id", community.linked_product_id)
        .is("revoked_at", null)
        .limit(1);
      return ((data as any[])?.length || 0) > 0;
    },
    enabled: !!community?.linked_product_id && !!user && community?.access_type === "FREE_WITH_PRODUCT",
  });

  const { data: unreadCount } = useQuery({
    queryKey: ["circle-unread", member?.id],
    queryFn: async () => {
      if (!member) return 0;
      const { count } = await supabase
        .from("community_notifications")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", member.id)
        .eq("is_read", false);
      return count || 0;
    },
    enabled: !!member,
  });

  // Recent posts for landing page preview
  const { data: previewPosts } = useQuery({
    queryKey: ["circle-preview-posts", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_posts")
        .select("*, author:community_members!author_id(display_name, avatar_url)")
        .eq("community_id", community.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!community && !member,
  });

  // Join community mutation
  const joinCommunity = useMutation({
    mutationFn: async () => {
      if (!community || !user) throw new Error("Missing data");
      const status = community.require_approval ? "PENDING" : "ACTIVE";
      const { error } = await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: user.id,
        role: "MEMBER",
        status,
        display_name: user.email?.split("@")[0] || "Membro",
      });
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });
      queryClient.invalidateQueries({ queryKey: ["community"] });
      if (status === "PENDING") {
        toast.success("Solicitação enviada! Aguarde aprovação do admin.");
      } else {
        toast.success("Bem-vindo à comunidade!");
      }
    },
    onError: () => toast.error("Erro ao entrar na comunidade"),
  });

  // Auto-join for FREE_WITH_PRODUCT
  const autoJoin = useMutation({
    mutationFn: async () => {
      if (!community || !user) throw new Error("Missing");
      const { error } = await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: user.id,
        role: "MEMBER",
        status: "ACTIVE",
        display_name: user.email?.split("@")[0] || "Membro",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });
      toast.success("Acesso liberado! Bem-vindo à comunidade!");
    },
  });

  const isAdmin = member?.role === "OWNER" || member?.role === "ADMIN";
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");
  const levelInfo = member ? getLevelInfo(member.total_points) : null;

  // Track daily login, streak, and level-up
  useDailyLogin(member, community);

  // Loading states
  if (authLoading || communityLoading || (user && memberLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // === ACCESS CONTROL GATE ===

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Card className="max-w-md p-8 text-center space-y-4">
          <LogIn className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Faça login para acessar</h1>
          <p className="text-sm text-muted-foreground">
            Você precisa estar logado para acessar a comunidade.
          </p>
          <Button onClick={() => navigate("/member/login?redirect=/circle")} className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            Fazer Login
          </Button>
        </Card>
      </div>
    );
  }

  // No community exists
  if (!community) {
    return children; // CircleDashboard handles creation UI
  }

  // User is a member - check status
  if (member) {
    if (member.status === "BANNED") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <Card className="max-w-md p-8 text-center space-y-4">
            <ShieldX className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-sm text-muted-foreground">
              Seu acesso foi revogado.
              {member.ban_reason && <span className="block mt-1">Motivo: {member.ban_reason}</span>}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
          </Card>
        </div>
      );
    }

    if (member.status === "PENDING") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <Card className="max-w-md p-8 text-center space-y-4">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Aguardando Aprovação</h1>
            <p className="text-sm text-muted-foreground">Sua solicitação está pendente de aprovação.</p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar</Button>
          </Card>
        </div>
      );
    }

    if (member.status === "LEFT") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30">
          <Card className="max-w-md p-8 text-center space-y-4">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Você saiu desta comunidade</h1>
            <Button onClick={() => joinCommunity.mutate()} disabled={joinCommunity.isPending}>Entrar Novamente</Button>
          </Card>
        </div>
      );
    }
  } else {
    // Not a member — LANDING PAGE
    return (
      <div className="min-h-screen bg-muted/30">
        {/* Cover */}
        <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary/20 via-primary/10 to-muted overflow-hidden">
          {community.cover_image_url && (
            <img src={community.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-16 relative z-10 pb-12">
          {/* Community info */}
          <div className="flex items-end gap-4 mb-6">
            {community.icon_url ? (
              <img src={community.icon_url} alt="" className="h-20 w-20 rounded-2xl object-cover border-4 border-background shadow-lg" />
            ) : (
              <div className="h-20 w-20 rounded-2xl bg-primary/10 border-4 border-background shadow-lg flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="pb-1">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{community.name}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{community.member_count} membros</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-4 w-4" />{community.post_count} posts</span>
              </div>
            </div>
          </div>

          {community.description && (
            <p className="text-muted-foreground mb-6">{community.description}</p>
          )}

          {/* CTA */}
          <div className="mb-8">
            {community.access_type === "OPEN" && (
              <Button size="lg" onClick={() => joinCommunity.mutate()} disabled={joinCommunity.isPending} className="w-full md:w-auto">
                <UserPlus className="h-5 w-5 mr-2" />
                {community.require_approval ? "Solicitar Entrada" : "Entrar na Comunidade"}
              </Button>
            )}
            {community.access_type === "FREE_WITH_PRODUCT" && (
              <>
                {hasEntitlement ? (
                  <Button size="lg" onClick={() => { if (!autoJoin.isPending && !autoJoin.isSuccess) autoJoin.mutate(); }} disabled={autoJoin.isPending} className="w-full md:w-auto">
                    <UserPlus className="h-5 w-5 mr-2" />Entrar na Comunidade
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      <span>Acesso incluso na compra do produto vinculado</span>
                    </div>
                    <Button size="lg" onClick={() => navigate(`/checkout/${community.linked_product_id}`)} className="w-full md:w-auto">
                      <ShoppingCart className="h-5 w-5 mr-2" />Comprar para Acessar
                    </Button>
                  </div>
                )}
              </>
            )}
            {community.access_type === "PAID_SUBSCRIPTION" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Lock className="h-4 w-4" />
                  <span>Assinatura necessária para acesso</span>
                </div>
                {community.linked_product_id && (
                  <Button size="lg" onClick={() => navigate(`/checkout/${community.linked_product_id}`)} className="w-full md:w-auto">
                    <ShoppingCart className="h-5 w-5 mr-2" />Assinar para Acessar
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Preview posts with blur */}
          {previewPosts && previewPosts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Posts recentes</h3>
              {previewPosts.map((post: any, i: number) => (
                <Card key={post.id} className={cn("p-4 relative overflow-hidden", i > 0 && "blur-[2px] pointer-events-none select-none")}>
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={post.author?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(post.author?.display_name || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{post.author?.display_name || "Membro"}</span>
                      <h4 className="font-semibold text-foreground mt-1">{post.title}</h4>
                      {post.body && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.body}</p>}
                    </div>
                  </div>
                </Card>
              ))}
              <div className="text-center">
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Eye className="h-4 w-4" /> Entre para ver todos os posts
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // === MAIN LAYOUT (ACTIVE or MUTED members) ===
  const isMuted = member?.status === "MUTED";
  const showRight = showRightSidebar && (location.pathname === "/circle/feed" || location.pathname === "/circle" || location.pathname.startsWith("/circle/spaces/"));

  const DesktopSidebar = () => (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Community header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          {community?.icon_url ? (
            <img src={community.icon_url} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20" />
          ) : (
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-sm truncate">{community?.name || "Comunidade"}</h2>
            <p className="text-xs text-muted-foreground">{community?.description?.slice(0, 40) || `${community?.member_count || 0} membros`}</p>
          </div>
        </div>
      </div>

      {/* Muted banner */}
      {isMuted && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs text-center">
          🔇 Somente leitura
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive(item.path)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}

        {/* Admin link */}
        {isAdmin && (
          <Link
            to="/circle/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isActive("/circle/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            <span>Admin</span>
          </Link>
        )}

        {/* Separator + Spaces */}
        {spaces && spaces.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Espaços</p>
            </div>
            {spaces.map((space: any) => (
              <Link
                key={space.id}
                to={`/circle/spaces/${space.slug}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors",
                  isActive(`/circle/spaces/${space.slug}`)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <span className="text-base">{space.emoji}</span>
                <span className="flex-1 truncate">{space.name}</span>
                {space.post_count > 0 && (
                  <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-1.5 py-0.5">
                    {space.post_count}
                  </span>
                )}
              </Link>
            ))}
            {isAdmin && (
              <Link
                to="/circle/admin"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-primary/70 hover:text-primary transition-colors"
              >
                <span className="text-xs">+</span>
                <span className="text-xs">Criar espaço</span>
              </Link>
            )}
          </>
        )}
      </nav>

      {/* Member info */}
      {member && (
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 px-1">
            <Avatar className="h-8 w-8 ring-2 ring-primary/20">
              <AvatarImage src={member.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(member.display_name || user?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{member.display_name || user?.email}</p>
              <p className="text-[10px] text-muted-foreground">
                {levelInfo?.label} · {member.total_points} pts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 flex">
      {/* Desktop left sidebar - 220px */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col sticky top-0 h-screen">
        <DesktopSidebar />
      </aside>

      {/* Central content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-12 border-b border-border flex items-center px-4 gap-3 bg-card sticky top-0 z-20">
          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              <DesktopSidebar />
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hidden md:flex h-8 w-8">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="text-sm font-semibold text-foreground md:hidden">{community?.name}</span>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative h-8 w-8" onClick={() => navigate("/circle/feed")}>
            <Bell className="h-4 w-4" />
            {(unreadCount ?? 0) > 0 && (
              <Badge className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-[9px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </header>

        {/* Main content area with optional right sidebar */}
        <div className="flex-1 flex">
          <main className="flex-1 overflow-auto pb-20 md:pb-0">
            <div className="max-w-[680px] mx-auto">
              {children}
            </div>
          </main>

          {/* Desktop right sidebar - 280px */}
          {showRight && (
            <aside className="hidden lg:block w-[280px] flex-shrink-0 border-l border-border bg-card overflow-y-auto sticky top-12 h-[calc(100vh-48px)]">
              <CircleRightSidebar community={community} member={member} />
            </aside>
          )}
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border">
        <nav className="flex items-center justify-around h-14">
          {mobileTabItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 px-2 py-1 min-w-0",
                isActive(item.path)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
