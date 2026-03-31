import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, AlertTriangle, Upload, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceProvider";

interface Props {
  community: any;
}

export default function AdminSettingsTab({ community }: Props) {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  const [settings, setSettings] = useState({
    name: community.name,
    description: community.description || "",
    long_description: community.long_description || "",
    access_type: community.access_type,
    linked_product_id: community.linked_product_id || "",
    require_approval: community.require_approval,
    allow_member_posts: community.allow_member_posts,
    allow_member_events: community.allow_member_events,
    points_per_post: community.points_per_post,
    points_per_comment: community.points_per_comment,
    points_per_like_received: community.points_per_like_received,
    points_per_course_completed: community.points_per_course_completed,
    points_per_daily_login: community.points_per_daily_login,
  });

  const [newJoinQuestion, setNewJoinQuestion] = useState("");
  const [newTag, setNewTag] = useState("");
  const [categoryDraft, setCategoryDraft] = useState("");

  // Fetch workspace products for linking
  const { data: products } = useQuery({
    queryKey: ["workspace-products", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [] as Array<{id: string; name: string; type: string}>;
      const { data } = await (supabase as any).from("products").select("id, name, type")
        .eq("workspace_id", currentWorkspace.id).eq("is_active", true).order("name");
      return (data || []) as Array<{id: string; name: string; type: string}>;
    },
    enabled: !!currentWorkspace && (settings.access_type === "FREE_WITH_PRODUCT" || settings.access_type === "PAID_SUBSCRIPTION"),
  });

  const { data: joinQuestions = [] } = useQuery({
    queryKey: ["community-join-questions", community.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_join_questions" as any)
        .select("id, question, required, position")
        .eq("community_id", community.id)
        .order("position", { ascending: true });
      if (error) return [];
      return (data || []) as any[];
    },
  });

  const addJoinQuestion = useMutation({
    mutationFn: async () => {
      if (!newJoinQuestion.trim()) return;
      const position = joinQuestions.length;
      const { error } = await supabase.from("community_join_questions" as any).insert({
        community_id: community.id,
        question: newJoinQuestion.trim(),
        required: true,
        position,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewJoinQuestion("");
      queryClient.invalidateQueries({ queryKey: ["community-join-questions", community.id] });
      toast.success("Pergunta adicionada");
    },
    onError: () => toast.error("Não foi possível adicionar pergunta"),
  });

  const removeJoinQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_join_questions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-join-questions", community.id] });
      toast.success("Pergunta removida");
    },
  });

  const toggleJoinQuestionRequired = useMutation({
    mutationFn: async ({ id, required }: { id: string; required: boolean }) => {
      const { error } = await supabase.from("community_join_questions" as any).update({ required }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community-join-questions", community.id] }),
  });

  const { data: discoveryMeta, refetch: refetchDiscoveryMeta } = useQuery({
    queryKey: ["community-discovery-meta", community.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_discovery_meta" as any)
        .select("*")
        .eq("community_id", community.id)
        .maybeSingle();
      if (error) return null;
      return data as any;
    },
  });

  const tags = useMemo(() => (Array.isArray(discoveryMeta?.tags) ? discoveryMeta.tags : []), [discoveryMeta]);

  const saveDiscoveryMeta = useMutation({
    mutationFn: async (patch: any) => {
      const payload = {
        community_id: community.id,
        is_discoverable: discoveryMeta?.is_discoverable ?? true,
        category: discoveryMeta?.category ?? null,
        tags: tags,
        ...patch,
      };

      const { error } = await supabase.from("community_discovery_meta" as any).upsert(payload, { onConflict: "community_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchDiscoveryMeta();
      toast.success("Discovery atualizado");
    },
    onError: () => toast.error("Tabela de discovery não encontrada. Crie community_discovery_meta no Lovable."),
  });

  const updateSettings = useMutation({
    mutationFn: async () => {
      const payload: any = { ...settings };
      if (!payload.linked_product_id) payload.linked_product_id = null;
      const { error } = await supabase.from("communities").update(payload).eq("id", community.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const uploadImage = async (file: File, type: "cover" | "icon") => {
    const ext = file.name.split(".").pop();
    const path = `${community.id}/${type}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("community").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Erro no upload"); return; }
    const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
    const field = type === "cover" ? "cover_image_url" : "icon_url";
    await supabase.from("communities").update({ [field]: urlData.publicUrl }).eq("id", community.id);
    queryClient.invalidateQueries({ queryKey: ["community"] });
    toast.success(`${type === "cover" ? "Capa" : "Ícone"} atualizado!`);
  };

  const deactivateCommunity = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("communities").update({ is_active: false }).eq("id", community.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Comunidade desativada.");
    },
  });

  const set = (key: string, value: any) => setSettings((s) => ({ ...s, [key]: value }));

  return (
    <div className="space-y-6">
      {/* General settings */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Geral</h3>
        <div>
          <Label>Nome da comunidade</Label>
          <Input value={settings.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <Label>Descrição curta</Label>
          <Input value={settings.description} onChange={(e) => set("description", e.target.value)} maxLength={200} />
        </div>
        <div>
          <Label>Descrição longa</Label>
          <Textarea value={settings.long_description} onChange={(e) => set("long_description", e.target.value)} rows={4} />
        </div>

        {/* Image uploads */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Imagem de capa</Label>
            <div className="mt-1.5">
              {community.cover_image_url && (
                <img src={community.cover_image_url} alt="" className="h-20 w-full object-cover rounded-lg mb-2 border border-border" />
              )}
              <label className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                <Upload className="h-4 w-4" />Enviar capa
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
              </label>
            </div>
          </div>
          <div>
            <Label>Ícone / Logo</Label>
            <div className="mt-1.5">
              {community.icon_url && (
                <img src={community.icon_url} alt="" className="h-16 w-16 object-cover rounded-xl mb-2 border border-border" />
              )}
              <label className="flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                <Upload className="h-4 w-4" />Enviar ícone
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "icon")} />
              </label>
            </div>
          </div>
        </div>

        {/* Access type */}
        <div>
          <Label>Tipo de acesso</Label>
          <Select value={settings.access_type} onValueChange={(v) => set("access_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Aberta (qualquer um entra)</SelectItem>
              <SelectItem value="FREE_WITH_PRODUCT">Inclusa na compra de produto</SelectItem>
              <SelectItem value="PAID_SUBSCRIPTION">Assinatura paga</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(settings.access_type === "FREE_WITH_PRODUCT" || settings.access_type === "PAID_SUBSCRIPTION") && (
          <div>
            <Label>Produto vinculado</Label>
            <Select value={settings.linked_product_id} onValueChange={(v) => set("linked_product_id", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>
                {products?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label>Requer aprovação para novos membros</Label>
            <Switch checked={settings.require_approval} onCheckedChange={(v) => set("require_approval", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Membros podem criar posts</Label>
            <Switch checked={settings.allow_member_posts} onCheckedChange={(v) => set("allow_member_posts", v)} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Membros podem criar eventos</Label>
            <Switch checked={settings.allow_member_events} onCheckedChange={(v) => set("allow_member_events", v)} />
          </div>
        </div>
      </Card>

      {/* Join Questions */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Perguntas para entrada</h3>
        <p className="text-sm text-muted-foreground">Essas perguntas aparecem no fluxo de entrada quando a comunidade exige aprovação.</p>

        <div className="space-y-2">
          {joinQuestions.map((q: any) => (
            <div key={q.id} className="flex items-center gap-2 rounded-lg border p-2">
              <div className="flex-1 text-sm">{q.question}</div>
              <div className="flex items-center gap-2 text-xs">
                <span>Obrigatória</span>
                <Switch
                  checked={!!q.required}
                  onCheckedChange={(v) => toggleJoinQuestionRequired.mutate({ id: q.id, required: v })}
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeJoinQuestion.mutate(q.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ex: Qual seu objetivo principal na comunidade?"
            value={newJoinQuestion}
            onChange={(e) => setNewJoinQuestion(e.target.value)}
          />
          <Button onClick={() => addJoinQuestion.mutate()} disabled={!newJoinQuestion.trim() || addJoinQuestion.isPending}>
            <Plus className="h-4 w-4 mr-1" />Adicionar
          </Button>
        </div>
      </Card>

      {/* Discovery config */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Discovery</h3>
        <p className="text-sm text-muted-foreground">Defina como sua comunidade aparece em /circles.</p>

        <div className="flex items-center justify-between">
          <Label>Aparecer no Discovery</Label>
          <Switch
            checked={discoveryMeta?.is_discoverable ?? true}
            onCheckedChange={(v) => saveDiscoveryMeta.mutate({ is_discoverable: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <div className="flex gap-2">
            <Input
              placeholder={discoveryMeta?.category || "Ex: Marketing, Fitness, Tech"}
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={() => saveDiscoveryMeta.mutate({ category: categoryDraft.trim() || null })}>
              Salvar
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex gap-2">
            <Input placeholder="Ex: lançamentos" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
            <Button
              type="button"
              onClick={() => {
                const t = newTag.trim();
                if (!t) return;
                const next = Array.from(new Set([...(tags || []), t])).slice(0, 10);
                saveDiscoveryMeta.mutate({ tags: next });
                setNewTag("");
              }}
            >
              <Plus className="h-4 w-4 mr-1" />Adicionar
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t: string) => (
              <span key={t} className="inline-flex items-center gap-1 text-xs rounded-full border px-2 py-1">
                {t}
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => saveDiscoveryMeta.mutate({ tags: tags.filter((x: string) => x !== t) })}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* Points config */}
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-foreground">Pontuação</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><Label className="text-xs">Pontos por post</Label><Input type="number" value={settings.points_per_post} onChange={(e) => set("points_per_post", +e.target.value || 0)} /></div>
          <div><Label className="text-xs">Pontos por comentário</Label><Input type="number" value={settings.points_per_comment} onChange={(e) => set("points_per_comment", +e.target.value || 0)} /></div>
          <div><Label className="text-xs">Pontos por like recebido</Label><Input type="number" value={settings.points_per_like_received} onChange={(e) => set("points_per_like_received", +e.target.value || 0)} /></div>
          <div><Label className="text-xs">Pontos por curso completo</Label><Input type="number" value={settings.points_per_course_completed} onChange={(e) => set("points_per_course_completed", +e.target.value || 0)} /></div>
          <div><Label className="text-xs">Pontos por login diário</Label><Input type="number" value={settings.points_per_daily_login} onChange={(e) => set("points_per_daily_login", +e.target.value || 0)} /></div>
        </div>
      </Card>

      {/* Save */}
      <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending} className="w-full md:w-auto">
        <Save className="h-4 w-4 mr-2" />Salvar configurações
      </Button>

      {/* Danger zone */}
      <Card className="p-6 border-destructive/30">
        <h3 className="font-semibold text-destructive flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4" />Zona de perigo
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Desativar a comunidade impedirá o acesso de todos os membros. Os dados não serão excluídos.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={!community.is_active}>
              {community.is_active ? "Desativar comunidade" : "Comunidade já desativada"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desativar comunidade?</AlertDialogTitle>
              <AlertDialogDescription>
                Todos os membros perderão acesso. Você poderá reativar depois.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => deactivateCommunity.mutate()}>Desativar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
