import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, LayoutGrid, Users, BarChart3, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CircleAdmin() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: community } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase
        .from("communities")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .single();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: member } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!community && !!user,
  });

  const { data: spaces } = useQuery({
    queryKey: ["circle-admin-spaces", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_spaces")
        .select("*")
        .eq("community_id", community.id)
        .order("position");
      return data || [];
    },
    enabled: !!community,
  });

  const { data: members } = useQuery({
    queryKey: ["circle-admin-members", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_members")
        .select("*")
        .eq("community_id", community.id)
        .order("joined_at", { ascending: false });
      return data || [];
    },
    enabled: !!community,
  });

  // Settings form
  const [settings, setSettings] = useState<any>(null);
  const settingsLoaded = settings !== null;
  if (!settingsLoaded && community) {
    setSettings({
      name: community.name,
      description: community.description || "",
      require_approval: community.require_approval,
      allow_member_posts: community.allow_member_posts,
      allow_member_events: community.allow_member_events,
      points_per_post: community.points_per_post,
      points_per_comment: community.points_per_comment,
    });
  }

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!community || !settings) throw new Error("Missing");
      const { error } = await supabase
        .from("communities")
        .update(settings)
        .eq("id", community.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  // New space
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceEmoji, setNewSpaceEmoji] = useState("💬");

  const createSpace = useMutation({
    mutationFn: async () => {
      if (!community || !newSpaceName.trim()) throw new Error("Missing");
      const slug = newSpaceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { error } = await supabase.from("community_spaces").insert({
        community_id: community.id,
        name: newSpaceName.trim(),
        slug,
        emoji: newSpaceEmoji,
        position: (spaces?.length || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-admin-spaces"] });
      setNewSpaceName("");
      toast.success("Espaço criado!");
    },
    onError: () => toast.error("Erro ao criar espaço"),
  });

  const isAdmin = member?.role === "OWNER" || member?.role === "ADMIN";
  if (!isAdmin) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin da Comunidade</h1>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5" />Configurações</TabsTrigger>
          <TabsTrigger value="spaces"><LayoutGrid className="h-4 w-4 mr-1.5" />Espaços</TabsTrigger>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1.5" />Membros</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" />Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4 mt-4">
          {settings && (
            <Card className="p-6 space-y-4">
              <div>
                <Label>Nome da comunidade</Label>
                <Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Exigir aprovação para entrar</Label>
                  <Switch checked={settings.require_approval} onCheckedChange={(v) => setSettings({ ...settings, require_approval: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Membros podem criar posts</Label>
                  <Switch checked={settings.allow_member_posts} onCheckedChange={(v) => setSettings({ ...settings, allow_member_posts: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Membros podem criar eventos</Label>
                  <Switch checked={settings.allow_member_events} onCheckedChange={(v) => setSettings({ ...settings, allow_member_events: v })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pontos por post</Label>
                  <Input type="number" value={settings.points_per_post} onChange={(e) => setSettings({ ...settings, points_per_post: parseInt(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Pontos por comentário</Label>
                  <Input type="number" value={settings.points_per_comment} onChange={(e) => setSettings({ ...settings, points_per_comment: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
                <Save className="h-4 w-4 mr-2" />Salvar
              </Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="spaces" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Criar novo espaço</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Emoji"
                value={newSpaceEmoji}
                onChange={(e) => setNewSpaceEmoji(e.target.value)}
                className="w-16 text-center"
              />
              <Input
                placeholder="Nome do espaço"
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={() => createSpace.mutate()} disabled={!newSpaceName.trim() || createSpace.isPending}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </Card>

          <div className="space-y-2">
            {spaces?.map((s: any) => (
              <Card key={s.id} className="p-4 flex items-center gap-3">
                <span className="text-xl">{s.emoji}</span>
                <div className="flex-1">
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.post_count} posts · /{s.slug}</p>
                </div>
                {s.is_default && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                {s.only_admins_can_post && <Badge variant="outline" className="text-xs">Admin only</Badge>}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4 mt-4">
          <div className="space-y-2">
            {members?.map((m: any) => (
              <Card key={m.id} className="p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{m.display_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.role} · {m.status} · {m.total_points} pts
                  </p>
                </div>
                <Badge variant={m.status === "ACTIVE" ? "secondary" : "destructive"} className="text-xs">
                  {m.status}
                </Badge>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{community?.member_count || 0}</p>
              <p className="text-sm text-muted-foreground">Membros</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{community?.post_count || 0}</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{spaces?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Espaços</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{spaces?.reduce((acc: number, s: any) => acc + s.post_count, 0) || 0}</p>
              <p className="text-sm text-muted-foreground">Total de posts</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
