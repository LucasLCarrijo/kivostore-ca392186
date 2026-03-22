import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Eye, Users } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

import { MetricCard } from "@/components/dashboard/MetricCard";
import { PeriodFilter } from "@/components/dashboard/PeriodFilter";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { RecentSales } from "@/components/dashboard/RecentSales";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { UsageAlerts } from "@/components/dashboard/UsageAlerts";
import { EmailVerificationBanner } from "@/components/dashboard/EmailVerificationBanner";

interface Metrics {
  totalRevenue: number;
  totalSales: number;
  totalVisits: number;
  totalLeads: number;
  revenueChange: number;
  salesChange: number;
  visitsChange: number;
  leadsChange: number;
}

interface RevenueData {
  date: string;
  revenue: number;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<number | "custom">(30);
  const [metrics, setMetrics] = useState<Metrics>({
    totalRevenue: 0,
    totalSales: 0,
    totalVisits: 0,
    totalLeads: 0,
    revenueChange: 0,
    salesChange: 0,
    visitsChange: 0,
    leadsChange: 0,
  });
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const currentDate = new Date();
  const userName = user?.email?.split("@")[0] || "Creator";
  const dateString = currentDate.toLocaleDateString("pt-BR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const periodDays =
          selectedPeriod === "custom" ? 30 : selectedPeriod;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - periodDays);

        const prevStartDate = new Date();
        prevStartDate.setDate(prevStartDate.getDate() - periodDays * 2);
        const prevEndDate = new Date();
        prevEndDate.setDate(prevEndDate.getDate() - periodDays);

        const { data: revenueData, error: revenueError } = await supabase
          .from("orders")
          .select("total_amount, created_at")
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "PAID")
          .gte("created_at", startDate.toISOString());

        if (revenueError) throw revenueError;

        const totalRevenue =
          revenueData?.reduce(
            (sum, order) => sum + Number(order.total_amount),
            0,
          ) || 0;

        const { data: salesData, error: salesError } = await supabase
          .from("orders")
          .select("id, created_at")
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "PAID")
          .gte("created_at", startDate.toISOString());

        if (salesError) throw salesError;
        const totalSales = salesData?.length || 0;

        const { data: visitsData, error: visitsError } = await supabase
          .from("analytics_events")
          .select("id, created_at")
          .eq("workspace_id", currentWorkspace.id)
          .eq("event_type", "PAGE_VIEW")
          .gte("created_at", startDate.toISOString());

        if (visitsError) throw visitsError;
        const totalVisits = visitsData?.length || 0;

        const { data: leadsData, error: leadsError } = await supabase
          .from("leads")
          .select("id, created_at")
          .eq("workspace_id", currentWorkspace.id)
          .gte("created_at", startDate.toISOString());

        if (leadsError) throw leadsError;
        const totalLeads = leadsData?.length || 0;

        const { data: prevRevenueData } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "PAID")
          .gte("created_at", prevStartDate.toISOString())
          .lt("created_at", prevEndDate.toISOString());

        const prevRevenue =
          prevRevenueData?.reduce(
            (sum, order) => sum + Number(order.total_amount),
            0,
          ) || 0;
        const revenueChange =
          prevRevenue > 0
            ? ((totalRevenue - prevRevenue) / prevRevenue) * 100
            : 0;

        const chartData: RevenueData[] = [];
        for (let i = periodDays - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];

          const dayRevenue =
            revenueData
              ?.filter((order) => order.created_at.startsWith(dateStr))
              .reduce(
                (sum, order) => sum + Number(order.total_amount),
                0,
              ) || 0;

          chartData.push({ date: dateStr, revenue: dayRevenue });
        }

        setMetrics({
          totalRevenue,
          totalSales,
          totalVisits,
          totalLeads,
          revenueChange,
          salesChange: 0,
          visitsChange: 0,
          leadsChange: 0,
        });

        setRevenueData(chartData);
      } catch (error) {
        console.error("Erro ao buscar metricas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [currentWorkspace, selectedPeriod]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Ola, {userName}
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {dateString}
          </p>
        </div>
      </div>

      {/* Alerts */}
      <EmailVerificationBanner />
      <UsageAlerts />
      <OnboardingChecklist />

      {/* Overview section */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Visao Geral
        </h2>
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          title="Receita Total"
          value={formatCurrency(metrics.totalRevenue)}
          icon={DollarSign}
          change={metrics.revenueChange}
        />
        <MetricCard
          title="Vendas"
          value={metrics.totalSales}
          icon={TrendingUp}
          change={metrics.salesChange}
        />
        <MetricCard
          title="Visitas"
          value={metrics.totalVisits}
          icon={Eye}
          change={metrics.visitsChange}
        />
        <MetricCard
          title="Leads"
          value={metrics.totalLeads}
          icon={Users}
          change={metrics.leadsChange}
        />
      </div>

      {/* Charts + Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueChart data={revenueData} period={selectedPeriod} />
        </div>
        <div>
          <RecentSales />
        </div>
      </div>
    </div>
  );
}
