import { Home, DollarSign, Store, BarChart3, MoreHorizontal } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navigationItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Renda", url: "/earnings", icon: DollarSign },
  { title: "Loja", url: "/store", icon: Store },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Mais", url: "/settings", icon: MoreHorizontal },
];

export function BottomNavigation() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-background/90 backdrop-blur-md safe-area-pb">
      <div className="flex items-stretch justify-around">
        {navigationItems.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.url === "/dashboard"}
            className="relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">
              {item.title}
            </span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
