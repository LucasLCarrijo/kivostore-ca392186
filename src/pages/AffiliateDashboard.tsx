import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Copy, MousePointer, ShoppingCart, DollarSign, Clock, LogOut } from "lucide-react";
import { Navigate } from "react-router-dom";

interface AffiliateData {
  id: string;
  name: string;
  email: string;
  status: string;
  pix_key: string | null;
  workspace_id: string;
}

interface AffLink {
  id: string;
  code: string;
  click_count: number;
  product_id: string | null;
}

interface CommissionRow {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function AffiliateDashboard() {
  const { user, session, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliateData | null>(null);
  const [links, setLinks] = useState<AffLink[]>([]);
  const [commissions, setCommissions] = useState<CommissionRow[]>([]);
  const [pixKey, setPixKey] = useState("");
  const [savingPix, setSavingPix] = useState(false);

  useEffect(() => {
    if (user) loadData();
    else setLoading(false);
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Find affiliate by user_id
    const { data: aff } = await supabase
      .from("affiliates")
      .select("id, name, email, status, pix_key, workspace_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!aff) {
      // Try by email
      const { data: affByEmail } = await supabase
        .from("affiliates")
        .select("id, name, email, status, pix_key, workspace_id")
        .eq("email", user.email || "")
        .maybeSingle();

      if (affByEmail) {
        // Link user_id
        await supabase.from("affiliates").update({ user_id: user.id }).eq("id", affByEmail.id);
        setAffiliate(affByEmail as AffiliateData);
        setPixKey(affByEmail.pix_key || "");
        await loadLinksAndCommissions(affByEmail.id);
      }
    } else {
      setAffiliate(aff as AffiliateData);
      setPixKey(aff.pix_key || "");
      await loadLinksAndCommissions(aff.id);
    }

    setLoading(false);
  };

  const loadLinksAndCommissions = async (affiliateId: string) => {
    const { data: lnks } = await supabase
      .from("affiliate_links")
      .select("id, code, click_count, product_id")
      .eq("affiliate_id", affiliateId);
    if (lnks) setLinks(lnks);

    const { data: comms } = await supabase
      .from("commissions")
      .select("id, amount, status, created_at")
      .eq("affiliate_id", affiliateId)
      .order("created_at", { ascending: false });
    if (comms) setCommissions(comms);
  };

  const copyLink = (code: string) => {
    const url = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const savePixKey = async () => {
    if (!affiliate) return;
    setSavingPix(true);
    await supabase.from("affiliates").update({ pix_key: pixKey.trim() }).eq("id", affiliate.id);
    setSavingPix(false);
    toast.success("Chave PIX salva");
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
  const statusBadge = (status: string) => {
    const map: Record<string, string> = { PENDING: "secondary", APPROVED: "default", PAID: "default", CANCELLED: "destructive" };
    return <Badge variant={map[status] as any || "secondary"}>{status}</Badge>;
  };

  if (!session) return <Navigate to="/login" replace />;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!affiliate) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Sem programa ativo</h1>
        <p className="text-muted-foreground mb-4">Você ainda não é afiliado de nenhum programa. Aplique-se a um programa de afiliados para começar.</p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    );
  }

  if (affiliate.status !== "APPROVED") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Aplicação {affiliate.status === "PENDING" ? "em análise" : "rejeitada"}</h1>
        <p className="text-muted-foreground mb-4">
          {affiliate.status === "PENDING" ? "Sua aplicação está sendo analisada. Você receberá um email quando for aprovado." : "Infelizmente sua aplicação não foi aprovada."}
        </p>
        <Button variant="outline" onClick={signOut}>Sair</Button>
      </div>
    );
  }

  const totalClicks = links.reduce((s, l) => s + l.click_count, 0);
  const totalSales = commissions.length;
  const pendingAmount = commissions.filter(c => c.status === "PENDING" || c.status === "APPROVED").reduce((s, c) => s + c.amount, 0);
  const paidAmount = commissions.filter(c => c.status === "PAID").reduce((s, c) => s + c.amount, 0);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">Painel do Afiliado</h1>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="w-4 h-4 mr-1" /> Sair</Button>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><MousePointer className="w-4 h-4" /> Cliques</div><p className="text-2xl font-bold text-foreground mt-1">{totalClicks}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><ShoppingCart className="w-4 h-4" /> Vendas</div><p className="text-2xl font-bold text-foreground mt-1">{totalSales}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><Clock className="w-4 h-4" /> Pendente</div><p className="text-2xl font-bold text-foreground mt-1">{fmt(pendingAmount)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="flex items-center gap-2 text-muted-foreground text-sm"><DollarSign className="w-4 h-4" /> Disponível</div><p className="text-2xl font-bold text-accent mt-1">{fmt(paidAmount)}</p></CardContent></Card>
        </div>

        {/* Links */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Seus Links</CardTitle></CardHeader>
          <CardContent>
            {links.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum link disponível ainda.</p>
            ) : (
              <div className="space-y-3">
                {links.map(link => (
                  <div key={link.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3">
                    <div>
                      <p className="text-sm font-mono text-foreground">{window.location.origin}/?ref={link.code}</p>
                      <p className="text-xs text-muted-foreground">{link.click_count} cliques</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyLink(link.code)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commissions */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Comissões</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhuma comissão ainda</TableCell></TableRow>
                ) : commissions.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{fmt(c.amount)}</TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Payout Settings */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Dados para Pagamento</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-3 items-end max-w-md">
              <div className="flex-1 space-y-2">
                <Label>Chave PIX</Label>
                <Input value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="CPF, email, celular ou chave aleatória" />
              </div>
              <Button onClick={savePixKey} disabled={savingPix}>
                {savingPix ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
