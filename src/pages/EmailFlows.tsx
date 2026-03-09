import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Mail, Play, Pause, Trash2, GripVertical, Clock, Users, Eye, MousePointerClick, UserMinus, ChevronDown, ChevronUp, Sparkles, Loader2,
} from "lucide-react";

const TRIGGER_LABELS: Record<string, string> = {
  lead_captured: "Quando lead é capturado",
  product_purchased: "Quando compra produto",
  subscription: "Quando assina",
  manual: "Manual",
};

const DELAY_PRESETS = [
  { label: "1 hora", hours: 1 },
  { label: "6 horas", hours: 6 },
  { label: "1 dia", hours: 24 },
  { label: "3 dias", hours: 72 },
  { label: "7 dias", hours: 168 },
];

interface Step {
  id?: string;
  position: number;
  delay_hours: number;
  subject: string;
  body: string;
}

interface SequenceForm {
  name: string;
  trigger_type: string;
  trigger_product_id: string | null;
  steps: Step[];
}

const emptyStep = (pos: number): Step => ({
  position: pos,
  delay_hours: 24,
  subject: "",
  body: "",
});

const generateEmailCopy = async (
  stepIndex: number,
  updateStepFn: (idx: number, field: keyof Step, value: any) => void,
  setLoadingFn: (v: boolean) => void
) => {
  setLoadingFn(true);
  try {
    const { data, error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("ai-generate", {
      body: {
        type: "email",
        context: {
          objective: "engajamento e conversão",
          segment: "leads e clientes",
          productName: "produto digital",
          tone: "profissional e envolvente",
        },
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    const email = data.emails?.[0];
    if (email) {
      updateStepFn(stepIndex, "subject", email.subject);
      updateStepFn(stepIndex, "body", email.body);
    }
  } catch (err: any) {
    console.error("AI email error:", err);
  } finally {
    setLoadingFn(false);
  }
};

export default function EmailFlows() {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const qc = useQueryClient();
  const workspaceId = currentWorkspace?.id;

  const [showCreate, setShowCreate] = useState(false);
  const [expandedSeq, setExpandedSeq] = useState<string | null>(null);
  const [form, setForm] = useState<SequenceForm>({
    name: "",
    trigger_type: "lead_captured",
    trigger_product_id: null,
    steps: [emptyStep(0)],
  });

  // Fetch sequences
  const { data: sequences = [], isLoading } = useQuery({
    queryKey: ["email-sequences", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("email_sequences")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Fetch steps for expanded sequence
  const { data: expandedSteps = [] } = useQuery({
    queryKey: ["email-sequence-steps", expandedSeq],
    queryFn: async () => {
      if (!expandedSeq) return [];
      const { data, error } = await supabase
        .from("email_sequence_steps")
        .select("*")
        .eq("sequence_id", expandedSeq)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !!expandedSeq,
  });

  // Fetch enrollment metrics per sequence
  const { data: metrics = {} } = useQuery({
    queryKey: ["email-sequence-metrics", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return {};
      const seqIds = sequences.map((s: any) => s.id);
      if (!seqIds.length) return {};
      const { data, error } = await supabase
        .from("email_sequence_enrollments")
        .select("sequence_id, completed_at, unsubscribed_at")
        .in("sequence_id", seqIds);
      if (error) throw error;
      const m: Record<string, { enrolled: number; completed: number; unsubscribed: number }> = {};
      for (const e of data || []) {
        if (!m[e.sequence_id]) m[e.sequence_id] = { enrolled: 0, completed: 0, unsubscribed: 0 };
        m[e.sequence_id].enrolled++;
        if (e.completed_at) m[e.sequence_id].completed++;
        if (e.unsubscribed_at) m[e.sequence_id].unsubscribed++;
      }
      return m;
    },
    enabled: !!workspaceId && sequences.length > 0,
  });

  // Fetch products for trigger
  const { data: products = [] } = useQuery({
    queryKey: ["products-list", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await supabase.from("products").select("id, name").eq("workspace_id", workspaceId);
      return data || [];
    },
    enabled: !!workspaceId,
  });

  // Create sequence
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("No workspace");
      if (!form.name.trim()) throw new Error("Nome obrigatório");
      if (form.steps.some((s) => !s.subject.trim())) throw new Error("Todos os steps precisam de assunto");

      const { data: seq, error } = await supabase
        .from("email_sequences")
        .insert({
          workspace_id: workspaceId,
          name: form.name,
          trigger_type: form.trigger_type,
          trigger_product_id: form.trigger_product_id,
        })
        .select()
        .single();
      if (error) throw error;

      const stepsToInsert = form.steps.map((s, i) => ({
        sequence_id: seq.id,
        position: i,
        delay_hours: s.delay_hours,
        subject: s.subject,
        body: s.body,
      }));
      const { error: stepErr } = await supabase.from("email_sequence_steps").insert(stepsToInsert);
      if (stepErr) throw stepErr;

      return seq;
    },
    onSuccess: () => {
      toast({ title: "Sequência criada com sucesso!" });
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
      setShowCreate(false);
      setForm({ name: "", trigger_type: "lead_captured", trigger_product_id: null, steps: [emptyStep(0)] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  // Toggle active
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("email_sequences").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["email-sequences"] }),
  });

  // Delete sequence
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("email_sequences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sequência excluída" });
      qc.invalidateQueries({ queryKey: ["email-sequences"] });
    },
  });

  // Step management
  const addStep = () => {
    if (form.steps.length >= 10) return;
    setForm((f) => ({ ...f, steps: [...f.steps, emptyStep(f.steps.length)] }));
  };

  const removeStep = (idx: number) => {
    if (form.steps.length <= 1) return;
    setForm((f) => ({ ...f, steps: f.steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i })) }));
  };

  const updateStep = (idx: number, field: keyof Step, value: any) => {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s)),
    }));
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= form.steps.length) return;
    setForm((f) => {
      const steps = [...f.steps];
      [steps[idx], steps[newIdx]] = [steps[newIdx], steps[idx]];
      return { ...f, steps: steps.map((s, i) => ({ ...s, position: i })) };
    });
  };

  const formatDelay = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sequências de Email</h1>
          <p className="text-muted-foreground">Automatize envios com fluxos de emails programados</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Sequência
        </Button>
      </div>

      {/* Sequences List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground">Nenhuma sequência criada</h3>
            <p className="text-muted-foreground mt-1 mb-4">Crie sua primeira sequência de emails automatizados</p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" /> Criar Sequência
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq: any) => {
            const m = metrics[seq.id] || { enrolled: 0, completed: 0, unsubscribed: 0 };
            const isExpanded = expandedSeq === seq.id;
            return (
              <Card key={seq.id} className="overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => setExpandedSeq(isExpanded ? null : seq.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{seq.name}</h3>
                        <Badge variant={seq.is_active ? "default" : "secondary"} className="text-xs">
                          {seq.is_active ? "Ativa" : "Pausada"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {TRIGGER_LABELS[seq.trigger_type] || seq.trigger_type}
                      </p>
                    </div>

                    {/* Metrics */}
                    <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{m.enrolled}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <UserMinus className="h-4 w-4" />
                        <span>{m.unsubscribed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={seq.is_active}
                      onCheckedChange={(v) => {
                        toggleMutation.mutate({ id: seq.id, is_active: v });
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(seq.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>

                {/* Expanded: show steps timeline */}
                {isExpanded && (
                  <div className="border-t px-6 py-4 bg-muted/20">
                    <h4 className="text-sm font-medium text-foreground mb-3">Timeline dos emails</h4>
                    <div className="relative ml-4">
                      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />
                      {expandedSteps.map((step: any, i: number) => (
                        <div key={step.id} className="relative pl-6 pb-6 last:pb-0">
                          <div className="absolute left-0 top-1 w-2.5 h-2.5 rounded-full bg-primary -translate-x-1" />
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {i === 0 && step.delay_hours === 0
                                ? "Imediatamente"
                                : `Após ${formatDelay(step.delay_hours)}`}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-foreground">{step.subject}</p>
                          {step.body && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{step.body}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Sequência de Email</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <Label>Nome da sequência</Label>
              <Input
                placeholder="Ex: Boas-vindas para novos leads"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Trigger */}
            <div className="space-y-2">
              <Label>Trigger</Label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm((f) => ({ ...f, trigger_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_captured">Quando lead é capturado</SelectItem>
                  <SelectItem value="product_purchased">Quando compra produto</SelectItem>
                  <SelectItem value="subscription">Quando assina</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.trigger_type === "product_purchased" && (
              <div className="space-y-2">
                <Label>Produto</Label>
                <Select
                  value={form.trigger_product_id || ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, trigger_product_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Steps */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Emails da sequência ({form.steps.length}/10)</Label>
                <Button variant="outline" size="sm" onClick={addStep} disabled={form.steps.length >= 10}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar
                </Button>
              </div>

              <div className="relative ml-4">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-border" />
                {form.steps.map((step, i) => (
                  <div key={i} className="relative pl-8 pb-6 last:pb-0">
                    <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-primary -translate-x-[5px] z-10" />

                    <Card className="border">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Email {i + 1}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(i, -1)} disabled={i === 0}>
                              <ChevronUp className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStep(i, 1)} disabled={i === form.steps.length - 1}>
                              <ChevronDown className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeStep(i)} disabled={form.steps.length <= 1}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        </div>

                        {/* Delay */}
                        <div className="space-y-1">
                          <Label className="text-xs">Delay antes do envio</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {DELAY_PRESETS.map((d) => (
                              <Button
                                key={d.hours}
                                type="button"
                                variant={step.delay_hours === d.hours ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => updateStep(i, "delay_hours", d.hours)}
                              >
                                {d.label}
                              </Button>
                            ))}
                            <Input
                              type="number"
                              min={0}
                              className="w-20 h-7 text-xs"
                              placeholder="Custom h"
                              value={DELAY_PRESETS.some((d) => d.hours === step.delay_hours) ? "" : step.delay_hours}
                              onChange={(e) => updateStep(i, "delay_hours", parseInt(e.target.value) || 0)}
                            />
                          </div>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1">
                          <Label className="text-xs">Assunto</Label>
                          <Input
                            placeholder="Assunto do email"
                            value={step.subject}
                            onChange={(e) => updateStep(i, "subject", e.target.value)}
                          />
                        </div>

                        {/* Body */}
                        <div className="space-y-1">
                          <Label className="text-xs">Corpo do email</Label>
                          <Textarea
                            placeholder="Conteúdo do email..."
                            rows={3}
                            value={step.body}
                            onChange={(e) => updateStep(i, "body", e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Criando..." : "Criar Sequência"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
