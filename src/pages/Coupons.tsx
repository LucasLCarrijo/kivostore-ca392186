import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Tag, CalendarIcon, Trash2, Copy, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type CouponFilter = "all" | "active" | "expired";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

const defaultForm = {
  code: generateCode(),
  type: "PERCENT" as "PERCENT" | "FIXED",
  value: "",
  min_order_amount: "",
  max_uses: "",
  max_uses_per_customer: "1",
  valid_from: new Date(),
  valid_until: null as Date | null,
  is_active: true,
};

export default function Coupons() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const [filter, setFilter] = useState<CouponFilter>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...defaultForm });

  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ["coupons", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (!form.code.trim()) throw new Error("Código obrigatório");
      if (!form.value || Number(form.value) <= 0) throw new Error("Valor obrigatório");
      if (form.type === "PERCENT" && Number(form.value) > 100) throw new Error("Porcentagem máxima: 100%");

      const { error } = await supabase.from("coupons").insert({
        workspace_id: workspaceId,
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: Number(form.value),
        min_order_amount: form.min_order_amount ? Number(form.min_order_amount) : null,
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        max_uses_per_customer: Number(form.max_uses_per_customer) || 1,
        valid_from: form.valid_from.toISOString(),
        valid_until: form.valid_until?.toISOString() || null,
        is_active: form.is_active,
      });
      if (error) {
        if (error.code === "23505") throw new Error("Código já existe");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      setShowCreate(false);
      setForm({ ...defaultForm, code: generateCode() });
      toast({ title: "Cupom criado!" });
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["coupons"] });
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["coupons"] });
    toast({ title: "Cupom excluído" });
  };

  const now = new Date();
  const filtered = useMemo(() => {
    return coupons.filter((c: any) => {
      if (filter === "active") {
        return c.is_active && (!c.valid_until || new Date(c.valid_until) > now);
      }
      if (filter === "expired") {
        return !c.is_active || (c.valid_until && new Date(c.valid_until) <= now);
      }
      return true;
    });
  }, [coupons, filter]);

  const isExpired = (c: any) => c.valid_until && new Date(c.valid_until) <= now;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cupons</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus cupons de desconto</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" /> Criar Cupom
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "active", "expired"] as CouponFilter[]).map((f) => (
          <Badge
            key={f}
            variant={filter === f ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Todos" : f === "active" ? "Ativos" : "Expirados"}
          </Badge>
        ))}
      </div>

      {/* Table */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum cupom encontrado</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                Criar primeiro cupom
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-center">Usos</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((coupon: any) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono font-semibold bg-muted px-2 py-0.5 rounded">
                          {coupon.code}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(coupon.code);
                            toast({ title: "Copiado!" });
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.type === "PERCENT" ? "Porcentagem" : "Valor Fixo"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {coupon.type === "PERCENT" ? `${coupon.value}%` : fmt(coupon.value)}
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {coupon.current_uses}/{coupon.max_uses ?? "∞"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {coupon.valid_until
                        ? format(new Date(coupon.valid_until), "dd/MM/yy")
                        : "Sem limite"}
                    </TableCell>
                    <TableCell>
                      {isExpired(coupon) ? (
                        <Badge variant="secondary" className="text-xs">Expirado</Badge>
                      ) : coupon.is_active ? (
                        <Badge className="bg-accent/10 text-accent text-xs">Ativo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Inativo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => toggleActive(coupon.id, coupon.is_active)}>
                            {coupon.is_active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => deleteCoupon(coupon.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Coupon Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Cupom</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Code */}
            <div className="space-y-2">
              <Label>Código do cupom</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-_]/g, "") })}
                  className="uppercase font-mono"
                  maxLength={20}
                />
                <Button variant="outline" size="sm" onClick={() => setForm({ ...form, code: generateCode() })}>
                  Gerar
                </Button>
              </div>
            </div>

            {/* Type + Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">Porcentagem (%)</SelectItem>
                    <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor do desconto</Label>
                <Input
                  type="number"
                  min="0"
                  max={form.type === "PERCENT" ? "100" : undefined}
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "PERCENT" ? "10" : "50.00"}
                />
              </div>
            </div>

            {/* Min order */}
            <div className="space-y-2">
              <Label>Valor mínimo do pedido (opcional)</Label>
              <Input
                type="number"
                min="0"
                value={form.min_order_amount}
                onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                placeholder="Sem mínimo"
              />
            </div>

            {/* Max uses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Máximo de usos total</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="Ilimitado"
                />
              </div>
              <div className="space-y-2">
                <Label>Máximo por cliente</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.max_uses_per_customer}
                  onChange={(e) => setForm({ ...form, max_uses_per_customer: e.target.value })}
                />
              </div>
            </div>

            {/* Date pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Válido de</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {format(form.valid_from, "dd/MM/yyyy", { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.valid_from}
                      onSelect={(d) => d && setForm({ ...form, valid_from: d })}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Válido até (opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.valid_until && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {form.valid_until ? format(form.valid_until, "dd/MM/yyyy", { locale: ptBR }) : "Sem limite"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.valid_until ?? undefined}
                      onSelect={(d) => setForm({ ...form, valid_until: d || null })}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Cupom"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
