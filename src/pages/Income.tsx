import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import {
  DollarSign, Download, Settings, ArrowRight, Wallet, Clock, Filter,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart,
} from "recharts";
import { format, subDays, startOfDay, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

const HOLD_DAYS = 14;
const PAGE_SIZE = 10;

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  PAID: { label: "Pago", variant: "default" },
  PENDING: { label: "Pendente", variant: "secondary" },
  REFUNDED: { label: "Reembolsado", variant: "destructive" },
  CANCELLED: { label: "Cancelado", variant: "outline" },
};

export default function Income() {
  const { currentWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const workspaceId = currentWorkspace?.id;

  const [page, setPage] = useState(1);
  const [showCashOut, setShowCashOut] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [cashOutMethod, setCashOutMethod] = useState("pix");
  const [filters, setFilters] = useState<string[]>([]);

  const FILTER_OPTIONS = ["Data", "Email", "Produto", "Valor", "Cupom", "Método", "Status"];

  const toggleFilter = (f: string) => {
    setFilters((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]);
  };

  const thirtyDaysAgo = useMemo(() => startOfDay(subDays(new Date(), 30)).toISOString(), []);

  // ── Orders ──
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ["income-orders", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, status, customer_email, customer_name, payment_method, product_id")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // ── Payments ──
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["income-payments", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("payments")
        .select("id, net_amount, amount, created_at, status, order_id, method")
        .eq("workspace_id", workspaceId!);
      return data || [];
    },
  });

  // ── Products for name lookup ──
  const { data: products = [] } = useQuery({
    queryKey: ["income-products", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name")
        .eq("workspace_id", workspaceId!);
      return data || [];
    },
  });

  const productMap = useMemo(() => {
    const m: Record<string, string> = {};
    products.forEach((p) => (m[p.id] = p.name));
    return m;
  }, [products]);

  // ── Balance calculations ──
  const now = new Date();
  const paidPayments = payments.filter((p) => p.status === "PAID" || p.status === "paid");

  const availableBalance = useMemo(() => {
    return paidPayments
      .filter((p) => differenceInDays(now, new Date(p.created_at)) >= HOLD_DAYS)
      .reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0);
  }, [paidPayments]);

  const pendingBalance = useMemo(() => {
    return paidPayments
      .filter((p) => differenceInDays(now, new Date(p.created_at)) < HOLD_DAYS)
      .reduce((sum, p) => sum + Number(p.net_amount || p.amount || 0), 0);
  }, [paidPayments]);

  // ── Chart data (last 30 days) ──
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = format(subDays(now, i), "yyyy-MM-dd");
      map[d] = 0;
    }
    orders
      .filter((o) => o.status === "PAID" && o.created_at >= thirtyDaysAgo)
      .forEach((o) => {
        const d = format(new Date(o.created_at), "yyyy-MM-dd");
        if (map[d] !== undefined) map[d] += Number(o.total_amount || 0);
      });
    return Object.entries(map).map(([date, value]) => ({
      date,
      label: format(new Date(date), "dd MMM", { locale: ptBR }),
      value: value / 100,
    }));
  }, [orders, thirtyDaysAgo]);

  // ── Pagination ──
  const paidOrders = orders;
  const totalPages = Math.max(1, Math.ceil(paidOrders.length / PAGE_SIZE));
  const pageOrders = paidOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const fmt = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  const downloadCSV = () => {
    const header = "Data,Produto,Email,Valor,Status,Método\n";
    const rows = paidOrders.map((o) =>
      [
        format(new Date(o.created_at), "dd/MM/yyyy HH:mm"),
        productMap[o.product_id || ""] || "—",
        o.customer_email,
        (Number(o.total_amount) / 100).toFixed(2),
        o.status,
        o.payment_method || "—",
      ].join(",")
    );
    const blob = new Blob([header + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `renda-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = loadingOrders || loadingPayments;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Income</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seus ganhos e faça saques</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/settings?tab=payments")}
          className="text-muted-foreground"
        >
          <Settings className="h-4 w-4 mr-1" /> Settings
        </Button>
      </div>

      {/* Revenue Chart */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Receita — Últimos 30 dias</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[250px] w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(6, 95%, 60%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(6, 95%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${v}`}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border border-border/50 shadow-lg rounded-lg px-3 py-2 text-xs">
                        <p className="font-medium text-foreground">{label}</p>
                        <p className="text-primary font-semibold">
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(6, 95%, 60%)"
                  strokeWidth={2}
                  fill="url(#incomeGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Balance Cards + Cash Out */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Wallet className="h-4 w-4" />
              Available for Cashout
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{fmt(availableBalance)}</p>
            )}
            <button
              className="text-xs text-primary hover:underline flex items-center gap-1"
              onClick={() => setShowBreakdown(true)}
            >
              View breakdown <ArrowRight className="h-3 w-3" />
            </button>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
          <CardContent className="p-5 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
              <Clock className="h-4 w-4" />
              Available Soon
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{fmt(pendingBalance)}</p>
            )}
            <p className="text-xs text-muted-foreground">Liberado em até {HOLD_DAYS} dias</p>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border/50 shadow-sm rounded-xl flex items-center justify-center">
          <CardContent className="p-5 text-center">
            <Button onClick={() => setShowCashOut(true)} className="w-full">
              <DollarSign className="h-4 w-4 mr-2" />
              + Cash Out
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Latest Orders */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Latest Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-4 w-4 mr-2" /> Download CSV
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((f) => (
              <Badge
                key={f}
                variant={filters.includes(f) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleFilter(f)}
              >
                <Filter className="h-3 w-3 mr-1" />
                {f}
              </Badge>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : pageOrders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No Transactions Matching Filters</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageOrders.map((order) => {
                    const s = STATUS_BADGE[order.status] || { label: order.status, variant: "secondary" as const };
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="text-sm">
                          {format(new Date(order.created_at), "dd/MM/yy HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {productMap[order.product_id || ""] || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[160px]">
                          {order.customer_email}
                        </TableCell>
                        <TableCell className="text-sm text-right font-medium">
                          {fmt(Number(order.total_amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                      <PaginationItem key={p}>
                        <PaginationLink isActive={p === page} onClick={() => setPage(p)} className="cursor-pointer">
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Cash Out Modal */}
      <Dialog open={showCashOut} onOpenChange={setShowCashOut}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar Saque</DialogTitle>
            <DialogDescription>
              Valor disponível: <strong>{fmt(availableBalance)}</strong>
            </DialogDescription>
          </DialogHeader>
          {availableBalance <= 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum saldo disponível para saque no momento.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Método de saque</label>
                <Select value={cashOutMethod} onValueChange={setCashOutMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="bank">Transferência Bancária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium">Valor do saque</p>
                <p className="text-xl font-bold text-foreground">{fmt(availableBalance)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCashOut(false)}>Cancelar</Button>
            {availableBalance > 0 ? (
              <Button onClick={() => setShowCashOut(false)}>Confirmar Saque</Button>
            ) : (
              <Button onClick={() => { setShowCashOut(false); navigate("/settings?tab=payments"); }}>
                Configurar Dados Bancários
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Breakdown Modal */}
      <Dialog open={showBreakdown} onOpenChange={setShowBreakdown}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Breakdown do Saldo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Receita total (pago)</span>
              <span className="font-medium">{fmt(availableBalance + pendingBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Disponível para saque</span>
              <span className="font-medium text-accent">{fmt(availableBalance)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Em hold ({HOLD_DAYS} dias)</span>
              <span className="font-medium">{fmt(pendingBalance)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBreakdown(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
