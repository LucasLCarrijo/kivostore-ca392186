import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, CheckCircle, Users } from "lucide-react";

export default function AffiliateApply() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [autoApproved, setAutoApproved] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", phone: "", note: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      if (!workspaceSlug) { setNotFound(true); setLoading(false); return; }

      const { data: ws } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("slug", workspaceSlug)
        .maybeSingle();

      if (!ws) { setNotFound(true); setLoading(false); return; }

      const { data: prog } = await supabase
        .from("affiliate_programs")
        .select("is_enabled, auto_approve")
        .eq("workspace_id", ws.id)
        .maybeSingle();

      if (!prog?.is_enabled) { setNotFound(true); setLoading(false); return; }

      setWorkspaceId(ws.id);
      setWorkspaceName(ws.name);
      setAutoApprove(prog.auto_approve);
      setLoading(false);
    }
    load();
  }, [workspaceSlug]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "Nome obrigatório";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Email inválido";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !workspaceId) return;
    setSubmitting(true);

    const status = autoApprove ? "APPROVED" : "PENDING";

    const { error } = await supabase.from("affiliates").insert({
      workspace_id: workspaceId,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim() || null,
      application_note: form.note.trim() || null,
      status,
      approved_at: autoApprove ? new Date().toISOString() : null,
    });

    if (error) {
      if (error.code === "23505") {
        toast.error("Este email já está cadastrado como afiliado");
      } else {
        toast.error("Erro ao enviar aplicação");
      }
      setSubmitting(false);
      return;
    }

    // If auto-approved, create default affiliate link
    if (autoApprove) {
      const { data: aff } = await supabase
        .from("affiliates")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("email", form.email.trim().toLowerCase())
        .single();
      
      if (aff) {
        await supabase.from("affiliate_links").insert({
          affiliate_id: aff.id,
          code: "",  // trigger generates code
        });
      }
      setAutoApproved(true);
    }

    setSubmitted(true);
    setSubmitting(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">Programa não encontrado</h1>
        <p className="text-muted-foreground">Este programa de afiliados não está disponível.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-accent mx-auto" />
            <h2 className="text-2xl font-bold text-foreground">
              {autoApproved ? "Bem-vindo ao programa!" : "Aplicação enviada!"}
            </h2>
            <p className="text-muted-foreground">
              {autoApproved
                ? "Você foi aprovado automaticamente. Acesse o painel de afiliado para começar a promover."
                : "Obrigado! Sua aplicação foi enviada para análise. Você receberá um email quando for aprovado."}
            </p>
            {autoApproved && (
              <Button onClick={() => window.location.href = "/affiliate/dashboard"} className="mt-4">
                Acessar painel do afiliado
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Programa de Afiliados</CardTitle>
          <p className="text-muted-foreground text-sm">{workspaceName}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo *</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label>Por que quer ser afiliado?</Label>
              <Textarea value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} rows={3} placeholder="Conte um pouco sobre você e como pretende divulgar..." />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Enviar aplicação
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
