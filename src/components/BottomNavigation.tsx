import { Home, DollarSign, Store, BarChart3, MoreHorizontal } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";

const navigationItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Renda", url: "/earnings", icon: DollarSign },
  { title: "Loja", url: "/store", icon: Store },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Mais", url: "/settings", icon: MoreHorizontal },
];

export function BottomNavigation() {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end
            className="flex flex-col items-center justify-center px-3 py-2 rounded-lg text-muted-foreground hover:text-primary transition-colors min-w-0 flex-1"
            activeClassName="text-primary font-medium"
          >
            <item.icon className="h-5 w-5 mb-1" />
            <span className="text-xs truncate">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}