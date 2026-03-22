import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { supabase } from "@/integrations/supabase/client";

interface Sale {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_avatar_url?: string;
  total_amount: number;
  currency: string;
  created_at: string;
  product?: {
    name: string;
  };
}

export function RecentSales() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!currentWorkspace) return;

    const fetchRecentSales = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            `
            *,
            products:product_id (name)
          `,
          )
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "PAID")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) throw error;
        setSales(data || []);
      } catch (error) {
        console.error("Erro ao buscar vendas:", error);
        setSales([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentSales();

    const channel = supabase
      .channel("recent-sales")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `workspace_id=eq.${currentWorkspace.id}`,
        },
        () => {
          fetchRecentSales();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspace]);

  const formatCurrency = (amount: number, currency: string = "BRL") =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(
      amount,
    );

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const saleDate = new Date(date);
    const diffInMinutes = Math.floor(
      (now.getTime() - saleDate.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return "agora";
    if (diffInMinutes < 60) return `${diffInMinutes} min`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <Card className="border-border/40 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Ultimas Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 bg-secondary rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-secondary rounded w-24" />
                  <div className="h-3 bg-secondary rounded w-32" />
                </div>
                <div className="h-3.5 bg-secondary rounded w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sales.length === 0) {
    return (
      <Card className="border-border/40 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">
            Ultimas Vendas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary mb-3">
              <ShoppingBag className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium mb-1">Nenhuma venda ainda</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
              Compartilhe sua loja para fazer sua primeira venda
            </p>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5" />
              Compartilhar Loja
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Ultimas Vendas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sales.map((sale) => (
            <div
              key={sale.id}
              className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-secondary/60 transition-colors"
            >
              <Avatar className="h-9 w-9">
                <AvatarImage src={sale.customer_avatar_url} />
                <AvatarFallback className="bg-secondary text-foreground text-xs font-medium">
                  {getInitials(sale.customer_name || sale.customer_email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {sale.customer_name ||
                    sale.customer_email.split("@")[0]}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {sale.product?.name || "Produto"}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">
                  {formatCurrency(sale.total_amount, sale.currency)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(sale.created_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
