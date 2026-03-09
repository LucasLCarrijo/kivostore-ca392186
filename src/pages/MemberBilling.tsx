import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Calendar, FileText, AlertTriangle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  ACTIVE: { label: "Ativa", variant: "default" },
  TRIALING: { label: "Trial", variant: "secondary" },
  PAST_DUE: { label: "Pagamento pendente", variant: "destructive" },
  CANCELLED: { label: "Cancelada", variant: "outline" },
  EXPIRED: { label: "Expirada", variant: "outline" },
};

const INTERVAL_MAP: Record<string, string> = {
  monthly: "/mês",
  quarterly: "/trimestre",
  yearly: "/ano",
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function MemberBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cancelId, setCancelId] = useState<string | null>(null);

  // Get customer id from email
  const { data: customer } = useQuery({
    queryKey: ["my-customer", user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const { data } = await supabase
        .from("customers")
        .select("id")
        .eq("email", user.email)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.email,
  });

  // Fetch subscriptions
  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["my-subscriptions", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          *,
          subscription_plans!inner(
            billing_interval,
            products!inner(name, thumbnail_url)
          )
        `)
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!customer?.id,
  });

  // Fetch invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["my-invoices", customer?.id],
    queryFn: async () => {
      if (!customer?.id) return [];
      const subIds = subscriptions.map((s: any) => s.id);
      if (!subIds.length) return [];
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .in("subscription_id", subIds)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: subscriptions.length > 0,
  });

  // Cancel subscription
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("subscriptions")
        .update({ cancel_at_period_end: true, cancelled_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Assinatura será cancelada ao fim do período atual" });
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      setCancelId(null);
    },
    onError: () => toast({ title: "Erro ao cancelar", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link to="/member">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Minhas Assinaturas</h1>
            <p className="text-sm text-muted-foreground">Gerencie seus planos e faturas</p>
          </div>
        </div>

        {/* Active Subscriptions */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-semibold text-foreground">Nenhuma assinatura ativa</h3>
              <p className="text-sm text-muted-foreground mt-1">Você não possui assinaturas no momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((sub: any) => {
              const plan = sub.subscription_plans;
              const product = plan?.products;
              const status = STATUS_MAP[sub.status] || { label: sub.status, variant: "outline" as const };

              return (
                <Card key={sub.id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {product?.thumbnail_url ? (
                          <img src={product.thumbnail_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-foreground">{product?.name || "Assinatura"}</h3>
                          <Badge variant={status.variant} className="mt-1">{status.label}</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Próxima cobrança</p>
                        <p className="font-medium text-foreground">
                          {sub.cancel_at_period_end
                            ? "Cancelamento agendado"
                            : format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Intervalo</p>
                        <p className="font-medium text-foreground capitalize">
                          {plan?.billing_interval === "monthly" ? "Mensal" : plan?.billing_interval === "quarterly" ? "Trimestral" : "Anual"}
                        </p>
                      </div>
                      {sub.trial_end && new Date(sub.trial_end) > new Date() && (
                        <div className="col-span-2">
                          <p className="text-muted-foreground">Trial até</p>
                          <p className="font-medium text-foreground">
                            {format(new Date(sub.trial_end), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      )}
                    </div>

                    {(sub.status === "ACTIVE" || sub.status === "TRIALING") && !sub.cancel_at_period_end && (
                      <div className="mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setCancelId(sub.id)}>
                          Cancelar assinatura
                        </Button>
                      </div>
                    )}

                    {sub.cancel_at_period_end && (
                      <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span>Acesso até {format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Invoices */}
        {invoices.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <FileText className="h-5 w-5" /> Histórico de Faturas
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {invoices.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {format(new Date(inv.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p className="text-xs text-muted-foreground">{fmt(inv.amount)}</p>
                        </div>
                      </div>
                      <Badge variant={inv.status === "PAID" ? "default" : inv.status === "PENDING" ? "secondary" : "destructive"}>
                        {inv.status === "PAID" ? "Pago" : inv.status === "PENDING" ? "Pendente" : "Falhou"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cancel Dialog */}
        <Dialog open={!!cancelId} onOpenChange={() => setCancelId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar assinatura</DialogTitle>
              <DialogDescription>
                Sua assinatura continuará ativa até o fim do período atual. Após isso, seu acesso será revogado.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelId(null)}>Manter assinatura</Button>
              <Button variant="destructive" onClick={() => cancelId && cancelMutation.mutate(cancelId)} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
