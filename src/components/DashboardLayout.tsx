import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Separator } from "@/components/ui/separator";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Dark sidebar */}
        <AppSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Clean minimal header */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 backdrop-blur-sm px-4 lg:px-6">
            <SidebarTrigger className="h-8 w-8 shrink-0" />
            <Separator orientation="vertical" className="h-5 hidden lg:block" />
            <h1 className="text-base font-semibold text-primary lg:hidden tracking-tight">
              Kivo
            </h1>
          </header>

          {/* Main content — pb-20 on any viewport where BottomNavigation is visible (< lg) */}
          <main className="flex-1 overflow-y-auto bg-secondary/50 pb-20 lg:pb-0">
            {children}
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </SidebarProvider>
  );
}
