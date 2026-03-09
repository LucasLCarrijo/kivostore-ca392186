import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import {
  MessageSquare,
  LayoutGrid,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";

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
}

const navItems = [
  { label: "Feed", icon: MessageSquare, path: "/circle/feed" },
  { label: "Espaços", icon: LayoutGrid, path: "/circle/spaces" },
  { label: "Membros", icon: Users, path: "/circle/members" },
  { label: "Leaderboard", icon: Trophy, path: "/circle/leaderboard" },
  { label: "Eventos", icon: Calendar, path: "/circle/events" },
  { label: "Classroom", icon: BookOpen, path: "/circle/classroom" },
];

export default function CircleLayout({ children }: CircleLayoutProps) {
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

  // Check entitlement for FREE_WITH_PRODUCT access
  const { data: hasEntitlement } = useQuery({
    queryKey: ["circle-entitlement", community?.linked_product_id, user?.id],
    queryFn: async () => {
      if (!community?.linked_product_id || !user) return false;
      const { data } = await supabase
        .from("entitlements")
        .select("id")
        .eq("product_id", community.linked_product_id)
        .is("revoked_at", null)
        .limit(1);
      return (data?.length || 0) > 0;
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

  // Auto-join for FREE_WITH_PRODUCT when user has entitlement
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

  // Loading states
  if (authLoading || communityLoading || (user && memberLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // === ACCESS CONTROL GATE ===

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md p-8 text-center space-y-4">
          <LogIn className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Faça login para acessar</h1>
          <p className="text-sm text-muted-foreground">
            Você precisa estar logado para acessar a comunidade.
          </p>
          <Button onClick={() => navigate("/member/login")} className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            Fazer Login
          </Button>
        </Card>
      </div>
    );
  }

  // No community exists (only workspace owner sees creation)
  if (!community) {
    return children; // CircleDashboard handles creation UI
  }

  // User is a member - check status
  if (member) {
    if (member.status === "BANNED") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md p-8 text-center space-y-4">
            <ShieldX className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-sm text-muted-foreground">
              Você foi banido desta comunidade.
              {member.ban_reason && (
                <span className="block mt-1">Motivo: {member.ban_reason}</span>
              )}
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          </Card>
        </div>
      );
    }

    if (member.status === "PENDING") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md p-8 text-center space-y-4">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Aguardando Aprovação</h1>
            <p className="text-sm text-muted-foreground">
              Sua solicitação está pendente de aprovação pelo administrador.
            </p>
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Voltar ao Dashboard
            </Button>
          </Card>
        </div>
      );
    }

    if (member.status === "LEFT") {
      // Allow rejoin
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md p-8 text-center space-y-4">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Você saiu desta comunidade</h1>
            <p className="text-sm text-muted-foreground">Deseja entrar novamente?</p>
            <Button onClick={() => joinCommunity.mutate()} disabled={joinCommunity.isPending}>
              Entrar Novamente
            </Button>
          </Card>
        </div>
      );
    }

    // ACTIVE or MUTED — render normally (MUTED has read-only enforced in children)
  } else {
    // Not a member — check access type
    if (community.access_type === "OPEN") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md p-8 text-center space-y-4">
            {community.icon_url ? (
              <img src={community.icon_url} alt="" className="h-16 w-16 rounded-2xl mx-auto object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
            )}
            <h1 className="text-xl font-bold text-foreground">{community.name}</h1>
            {community.description && (
              <p className="text-sm text-muted-foreground">{community.description}</p>
            )}
            <p className="text-xs text-muted-foreground">{community.member_count} membros</p>
            <Button onClick={() => joinCommunity.mutate()} disabled={joinCommunity.isPending} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              {community.require_approval ? "Solicitar Entrada" : "Entrar na Comunidade"}
            </Button>
          </Card>
        </div>
      );
    }

    if (community.access_type === "FREE_WITH_PRODUCT") {
      if (hasEntitlement) {
        // Auto-join
        if (!autoJoin.isPending && !autoJoin.isSuccess) {
          autoJoin.mutate();
        }
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        );
      }
      // No entitlement — show CTA to buy
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md p-8 text-center space-y-4">
            <ShoppingCart className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">{community.name}</h1>
            <p className="text-sm text-muted-foreground">
              O acesso a esta comunidade é incluso na compra do produto vinculado.
            </p>
            <Button onClick={() => navigate(`/checkout/${community.linked_product_id}`)} className="w-full">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Comprar Produto para Acessar
            </Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              Voltar
            </Button>
          </Card>
        </div>
      );
    }

    if (community.access_type === "PAID_SUBSCRIPTION") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Card className="max-w-md p-8 text-center space-y-4">
            <ShoppingCart className="h-12 w-12 text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">{community.name}</h1>
            <p className="text-sm text-muted-foreground">
              Esta comunidade requer uma assinatura ativa para acesso.
            </p>
            {community.linked_product_id && (
              <Button onClick={() => navigate(`/checkout/${community.linked_product_id}`)} className="w-full">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Assinar para Acessar
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
              Voltar
            </Button>
          </Card>
        </div>
      );
    }
  }

  // === MAIN LAYOUT (ACTIVE or MUTED members) ===
  const isMuted = member?.status === "MUTED";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          {community?.icon_url ? (
            <img src={community.icon_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground truncate">{community?.name || "Comunidade"}</h2>
            <p className="text-xs text-muted-foreground">{community?.member_count || 0} membros</p>
          </div>
        </div>
      </div>

      {/* Muted banner */}
      {isMuted && (
        <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs text-center">
          🔇 Você está silenciado (somente leitura)
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive(item.path)
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Admin link */}
      {isAdmin && (
        <div className="p-3 border-t border-border/40">
          <Link
            to="/circle/admin"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              isActive("/circle/admin")
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Admin</span>
          </Link>
        </div>
      )}

      {/* Member info */}
      {member && (
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarImage src={member.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {(member.display_name || user?.email || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.display_name || user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {levelInfo?.label} · {member.total_points} pts
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border/40 flex-col bg-card">
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-border/40 flex items-center px-4 gap-3 bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} className="hidden md:flex">
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <Button variant="ghost" size="icon" className="relative" onClick={() => navigate("/circle/notifications")}>
            <Bell className="h-5 w-5" />
            {(unreadCount ?? 0) > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
