import { useState, useEffect, useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Users, Search, Download, CalendarIcon, Loader2, User,
  ShoppingBag, DollarSign, Mail, Phone, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";

interface CustomerRow {
  id: string;
  name: string | null;
  email: string;
  cpf: string | null;
  phone: string | null;
  created_at: string;
  total_spent: number;
  order_count: number;
  products: string[];
  last_order_date: string | null;
}

interface OrderRow {
  id: string;
  order_number: string | null;
  total_amount: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  product_name: string | null;
}

interface Product {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

export default function Customers() {
  const { currentWorkspace } = useWorkspace();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("ALL");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [minSpent, setMinSpent] = useState("");
  const [page, setPage] = useState(0);

  // Profile drawer
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [customerOrders, setCustomerOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (currentWorkspace) {
      loadCustomers();
      loadProducts();
    }
  }, [currentWorkspace]);

  const loadProducts = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase
      .from("products")
      .select("id, name")
      .eq("workspace_id", currentWorkspace.id)
      .is("deleted_at", null)
      .order("name");
    if (data) setProducts(data);
  };

  const loadCustomers = async () => {
    if (!currentWorkspace) return;
    setLoading(true);

    // Load customers
    const { data: customersData } = await supabase
      .from("customers")
      .select("id, name, email, cpf, phone, created_at")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });

    if (!customersData) {
      setLoading(false);
      return;
    }

    // Load orders for these customers
    const customerIds = customersData.map(c => c.id);
    const { data: ordersData } = await supabase
      .from("orders")
      .select("id, customer_id, total_amount, status, created_at, product_id")
      .eq("workspace_id", currentWorkspace.id)
      .in("customer_id", customerIds.length > 0 ? customerIds : ["__none__"])
      .in("status", ["PAID", "COMPLETED", "DELIVERED"]);

    // Load order items to get product names
    const orderIds = ordersData?.map(o => o.id) || [];
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("order_id, product_id")
      .in("order_id", orderIds.length > 0 ? orderIds : ["__none__"]);

    // Load all product names
    const allProductIds = [...new Set([
      ...(ordersData?.map(o => o.product_id).filter(Boolean) || []),
      ...(orderItems?.map(oi => oi.product_id) || []),
    ])];
    const { data: productNames } = await supabase
      .from("products")
      .select("id, name")
      .in("id", allProductIds.length > 0 ? allProductIds : ["__none__"]);

    const productMap = new Map(productNames?.map(p => [p.id, p.name]) || []);

    // Build customer rows
    const rows: CustomerRow[] = customersData.map(c => {
      const customerOrders = ordersData?.filter(o => o.customer_id === c.id) || [];
      const totalSpent = customerOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      const productIds = new Set<string>();
      customerOrders.forEach(o => {
        if (o.product_id) productIds.add(o.product_id);
      });
      orderItems?.filter(oi => customerOrders.some(o => o.id === oi.order_id))
        .forEach(oi => productIds.add(oi.product_id));

      const productNamesList = [...productIds].map(pid => productMap.get(pid) || "Produto").filter(Boolean);
      const sortedOrders = [...customerOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return {
        id: c.id,
        name: c.name,
        email: c.email,
        cpf: c.cpf,
        phone: c.phone,
        created_at: c.created_at,
        total_spent: totalSpent / 100,
        order_count: customerOrders.length,
        products: productNamesList,
        last_order_date: sortedOrders[0]?.created_at || null,
      };
    });

    setCustomers(rows);
    setLoading(false);
  };

  // Filtered customers
  const filtered = useMemo(() => {
    let result = customers;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.name?.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.cpf?.includes(q)
      );
    }

    if (productFilter !== "ALL") {
      const productName = products.find(p => p.id === productFilter)?.name;
      if (productName) {
        result = result.filter(c => c.products.includes(productName));
      }
    }

    if (dateFrom) {
      result = result.filter(c => c.last_order_date && new Date(c.last_order_date) >= dateFrom);
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      result = result.filter(c => c.last_order_date && new Date(c.last_order_date) <= endOfDay);
    }

    if (minSpent) {
      const min = parseFloat(minSpent);
      if (!isNaN(min)) {
        result = result.filter(c => c.total_spent >= min);
      }
    }

    return result;
  }, [customers, search, productFilter, dateFrom, dateTo, minSpent, products]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Stats
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((s, c) => s + c.total_spent, 0);
  const avgSpent = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  // Open profile
  const openProfile = async (customer: CustomerRow) => {
    setSelectedCustomer(customer);
    setDrawerOpen(true);
    setOrdersLoading(true);

    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, status, payment_method, created_at, product_id")
      .eq("workspace_id", currentWorkspace!.id)
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    const productIds = [...new Set(data?.map(o => o.product_id).filter(Boolean) || [])];
    const { data: prods } = await supabase
      .from("products")
      .select("id, name")
      .in("id", productIds.length > 0 ? productIds : ["__none__"]);
    const pMap = new Map(prods?.map(p => [p.id, p.name]) || []);

    setCustomerOrders(
      (data || []).map(o => ({
        ...o,
        total_amount: (o.total_amount || 0) / 100,
        product_name: o.product_id ? pMap.get(o.product_id) || null : null,
      }))
    );
    setOrdersLoading(false);
  };

  // Export CSV
  const exportCSV = () => {
    const headers = ["Nome", "Email", "CPF", "Telefone", "Total Gasto (R$)", "Qtd Pedidos", "Produtos", "Última Compra"];
    const rows = filtered.map(c => [
      c.name || "",
      c.email,
      c.cpf || "",
      c.phone || "",
      c.total_spent.toFixed(2),
      c.order_count.toString(),
      c.products.join("; "),
      c.last_order_date ? format(new Date(c.last_order_date), "dd/MM/yyyy") : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(r => r.map(v => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clientes-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    PAID: { label: "Pago", variant: "default" },
    COMPLETED: { label: "Completo", variant: "default" },
    DELIVERED: { label: "Entregue", variant: "default" },
    PENDING: { label: "Pendente", variant: "secondary" },
    REFUNDED: { label: "Reembolsado", variant: "destructive" },
    CANCELLED: { label: "Cancelado", variant: "outline" },
  };

  return (
    <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e visualize informações dos seus clientes
          </p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2 shrink-0">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total de Clientes</p>
              <p className="text-xl font-bold text-foreground">{totalCustomers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Receita Total</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10">
              <ShoppingBag className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ticket Médio</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(avgSpent)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou CPF..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>

            <Select value={productFilter} onValueChange={(v) => { setProductFilter(v); setPage(0); }}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os produtos</SelectItem>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full lg:w-[180px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Data início"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={(d) => { setDateFrom(d); setPage(0); }} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full lg:w-[180px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "Data fim"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={(d) => { setDateTo(d); setPage(0); }} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Input
              type="number"
              placeholder="Valor mín (R$)"
              value={minSpent}
              onChange={(e) => { setMinSpent(e.target.value); setPage(0); }}
              className="w-full lg:w-[140px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF</TableHead>
                <TableHead className="text-right">Total Gasto</TableHead>
                <TableHead className="text-center">Pedidos</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Última Compra</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    {customers.length === 0 ? "Nenhum cliente encontrado" : "Nenhum resultado para os filtros aplicados"}
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((c) => (
                  <TableRow
                    key={c.id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => openProfile(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-medium text-primary">
                            {(c.name || c.email)[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {c.name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {c.cpf || "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground text-right">
                      {formatCurrency(c.total_spent)}
                    </TableCell>
                    <TableCell className="text-sm text-center text-foreground">
                      {c.order_count}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.products.slice(0, 2).map((p, i) => (
                          <Badge key={i} variant="secondary" className="text-xs truncate max-w-[120px]">
                            {p}
                          </Badge>
                        ))}
                        {c.products.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{c.products.length - 2}
                          </Badge>
                        )}
                        {c.products.length === 0 && (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_order_date
                        ? format(new Date(c.last_order_date), "dd/MM/yyyy")
                        : "—"
                      }
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Customer Profile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedCustomer && (
            <div className="space-y-6">
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-xl">{selectedCustomer.name || "Cliente"}</SheetTitle>
                    <p className="text-sm text-muted-foreground">
                      Cliente desde {format(new Date(selectedCustomer.created_at), "MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              {/* Contact Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Informações</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedCustomer.email}</span>
                  </div>
                  {selectedCustomer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{selectedCustomer.phone}</span>
                    </div>
                  )}
                  {selectedCustomer.cpf && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground font-mono">{selectedCustomer.cpf}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(selectedCustomer.total_spent)}</p>
                  <p className="text-xs text-muted-foreground">Total gasto</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedCustomer.order_count}</p>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-foreground">{selectedCustomer.products.length}</p>
                  <p className="text-xs text-muted-foreground">Produtos</p>
                </div>
              </div>

              {/* Products */}
              {selectedCustomer.products.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">Produtos Comprados</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedCustomer.products.map((p, i) => (
                        <Badge key={i} variant="secondary">{p}</Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Order History */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Histórico de Pedidos</h3>
                {ordersLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Nenhum pedido encontrado</p>
                ) : (
                  <div className="space-y-2">
                    {customerOrders.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {o.product_name || o.order_number || "Pedido"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(o.created_at), "dd/MM/yyyy 'às' HH:mm")}
                            {o.payment_method && ` · ${o.payment_method}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge variant={statusLabel[o.status]?.variant || "secondary"} className="text-xs">
                            {statusLabel[o.status]?.label || o.status}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(o.total_amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
