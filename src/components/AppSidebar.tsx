import {
  Home,
  DollarSign,
  Store,
  BarChart3,
  Settings,
  LogOut,
  Package,
  Users,
  UserCheck,
  Tag,
  Mail,
  CalendarCheck,
  MessagesSquare,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const mainNavItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Minha Loja", url: "/store", icon: Store },
  { title: "Circles", url: "/circle", icon: MessagesSquare },
];

const businessNavItems = [
  { title: "Renda", url: "/earnings", icon: DollarSign },
  { title: "Leads", url: "/leads", icon: UserCheck },
  { title: "Clientes", url: "/clients", icon: Users },
  { title: "Afiliados", url: "/affiliates", icon: Users },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
];

const toolNavItems = [
  { title: "Cupons", url: "/coupons", icon: Tag },
  { title: "Email Flows", url: "/email-flows", icon: Mail },
  { title: "Agendamentos", url: "/appointments", icon: CalendarCheck },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { currentWorkspace } = useWorkspace();
  const { signOut, user } = useAuth();

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const renderNavSection = (
    items: typeof mainNavItems,
    label?: string,
  ) => (
    <SidebarGroup>
      {label && !collapsed && (
        <span className="px-3 mb-1 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--sidebar-muted))]">
          {label}
        </span>
      )}
      <SidebarGroupContent>
        <SidebarMenu className="space-y-0.5">
          {items.map((item) => {
            const active = isActive(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end={item.url === "/dashboard"}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-sidebar-accent text-sidebar-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    }`}
                    activeClassName=""
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-sidebar-primary" />
                    )}
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  const initials =
    user?.email?.charAt(0).toUpperCase() || "U";

  return (
    <Sidebar
      collapsible="icon"
      className="w-[240px] border-r-0"
    >
      {/* Brand header */}
      <SidebarHeader className="px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <span className="text-sm font-bold text-white">K</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-sidebar-foreground tracking-tight">
                Kivo
              </h2>
              <p className="text-xs text-[hsl(var(--sidebar-muted))] truncate">
                {currentWorkspace?.name || "Meu Workspace"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="mx-3 w-auto bg-sidebar-border" />

      <SidebarContent className="px-2 py-3">
        {renderNavSection(mainNavItems)}
        {renderNavSection(businessNavItems, "Negocio")}
        {renderNavSection(toolNavItems, "Ferramentas")}
      </SidebarContent>

      <Separator className="mx-3 w-auto bg-sidebar-border" />

      {/* Footer: settings + user */}
      <SidebarFooter className="px-2 py-3 space-y-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <NavLink
                to="/settings"
                end
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/settings")
                    ? "bg-sidebar-accent text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                }`}
                activeClassName=""
              >
                <Settings className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span>Configuracoes</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* User section */}
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0 ring-1 ring-sidebar-border">
            <AvatarImage src="" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.email?.split("@")[0] || "Usuario"}
                </p>
                <p className="text-xs text-[hsl(var(--sidebar-muted))] truncate">
                  {user?.email || ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
