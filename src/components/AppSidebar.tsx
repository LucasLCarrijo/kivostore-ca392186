import { Home, DollarSign, Store, BarChart3, MoreHorizontal, Menu } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthProvider";

const navigationItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Renda", url: "/earnings", icon: DollarSign },
  { title: "Minha Loja", url: "/store", icon: Store },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Mais", url: "/settings", icon: MoreHorizontal },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;
  const { currentWorkspace } = useWorkspace();
  const { signOut } = useAuth();

  const isActive = (path: string) => currentPath === path;
  const isExpanded = navigationItems.some((i) => isActive(i.url));

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Workspace Info */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {!collapsed ? (currentWorkspace?.name || "Kivo") : "K"}
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Sign Out */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={signOut}
                  >
                    {!collapsed && <span>Sair</span>}
                  </Button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}