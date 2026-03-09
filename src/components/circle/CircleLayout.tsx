import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!community && !!user,
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

  const isAdmin = member?.role === "OWNER" || member?.role === "ADMIN";
  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

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
              <p className="text-xs text-muted-foreground">Nível {member.level} · {member.total_points} pts</p>
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
          {/* Mobile menu */}
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
