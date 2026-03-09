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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Settings, LayoutGrid, Users, BarChart3, Plus, Save, Shield, Ban, VolumeX, UserCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function CircleAdmin() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: community } = useQuery({
    queryKey: ["community", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return null;
      const { data } = await supabase.from("communities").select("*").eq("workspace_id", currentWorkspace.id).single();
      return data;
    },
    enabled: !!currentWorkspace,
  });

  const { data: member } = useQuery({
    queryKey: ["circle-member", community?.id, user?.id],
    queryFn: async () => {
      if (!community || !user) return null;
      const { data } = await supabase.from("community_members").select("*").eq("community_id", community.id).eq("user_id", user.id).single();
      return data;
    },
    enabled: !!community && !!user,
  });

  const { data: spaces } = useQuery({
    queryKey: ["circle-admin-spaces", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase.from("community_spaces").select("*").eq("community_id", community.id).order("position");
      return data || [];
    },
    enabled: !!community,
  });

  const { data: members } = useQuery({
    queryKey: ["circle-admin-members", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase.from("community_members").select("*").eq("community_id", community.id).order("joined_at", { ascending: false });
      return data || [];
    },
    enabled: !!community,
  });

  // Settings form
  const [settings, setSettings] = useState<any>(null);
  if (settings === null && community) {
    setSettings({
      name: community.name,
      description: community.description || "",
      access_type: community.access_type,
      require_approval: community.require_approval,
      allow_member_posts: community.allow_member_posts,
      allow_member_events: community.allow_member_events,
      points_per_post: community.points_per_post,
      points_per_comment: community.points_per_comment,
      points_per_like_received: community.points_per_like_received,
      points_per_course_completed: community.points_per_course_completed,
      points_per_daily_login: community.points_per_daily_login,
    });
  }

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!community || !settings) throw new Error("Missing");
      const { error } = await supabase.from("communities").update(settings).eq("id", community.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  // Spaces
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceEmoji, setNewSpaceEmoji] = useState("💬");

  const createSpace = useMutation({
    mutationFn: async () => {
      if (!community || !newSpaceName.trim()) throw new Error("Missing");
      const slug = newSpaceName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const { error } = await supabase.from("community_spaces").insert({
        community_id: community.id, name: newSpaceName.trim(), slug, emoji: newSpaceEmoji, position: (spaces?.length || 0),
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

  const deleteSpace = useMutation({
    mutationFn: async (spaceId: string) => {
      const { error } = await supabase.from("community_spaces").delete().eq("id", spaceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-admin-spaces"] });
      toast.success("Espaço excluído!");
    },
  });

  // Member management
  const updateMember = useMutation({
    mutationFn: async ({ memberId, updates }: { memberId: string; updates: any }) => {
      const { error } = await supabase.from("community_members").update(updates).eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-admin-members"] });
      queryClient.invalidateQueries({ queryKey: ["community"] });
      toast.success("Membro atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar membro"),
  });

  const isAdmin = member?.role === "OWNER" || member?.role === "ADMIN";
  if (!isAdmin) {
    return <div className="p-6 text-center"><p className="text-muted-foreground">Acesso restrito a administradores.</p></div>;
  }

  const pendingMembers = members?.filter((m: any) => m.status === "PENDING") || [];
  const activeMembers = members?.filter((m: any) => m.status !== "PENDING") || [];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin da Comunidade</h1>

      <Tabs defaultValue="settings">
        <TabsList className="flex-wrap">
          <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-1.5" />Config</TabsTrigger>
          <TabsTrigger value="spaces"><LayoutGrid className="h-4 w-4 mr-1.5" />Espaços</TabsTrigger>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-1.5" />Membros
            {pendingMembers.length > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px]">{pendingMembers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="h-4 w-4 mr-1.5" />Analytics</TabsTrigger>
        </TabsList>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          {settings && (
            <Card className="p-6 space-y-4">
              <div><Label>Nome</Label><Input value={settings.name} onChange={(e) => setSettings({ ...settings, name: e.target.value })} /></div>
              <div><Label>Descrição</Label><Textarea value={settings.description} onChange={(e) => setSettings({ ...settings, description: e.target.value })} rows={3} /></div>
              <div>
                <Label>Tipo de acesso</Label>
                <Select value={settings.access_type} onValueChange={(v) => setSettings({ ...settings, access_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Aberta (qualquer um entra)</SelectItem>
                    <SelectItem value="FREE_WITH_PRODUCT">Inclusa na compra de produto</SelectItem>
                    <SelectItem value="PAID_SUBSCRIPTION">Assinatura paga</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between"><Label>Exigir aprovação</Label><Switch checked={settings.require_approval} onCheckedChange={(v) => setSettings({ ...settings, require_approval: v })} /></div>
                <div className="flex items-center justify-between"><Label>Membros podem postar</Label><Switch checked={settings.allow_member_posts} onCheckedChange={(v) => setSettings({ ...settings, allow_member_posts: v })} /></div>
                <div className="flex items-center justify-between"><Label>Membros podem criar eventos</Label><Switch checked={settings.allow_member_events} onCheckedChange={(v) => setSettings({ ...settings, allow_member_events: v })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Pts/post</Label><Input type="number" value={settings.points_per_post} onChange={(e) => setSettings({ ...settings, points_per_post: +e.target.value || 0 })} /></div>
                <div><Label>Pts/comentário</Label><Input type="number" value={settings.points_per_comment} onChange={(e) => setSettings({ ...settings, points_per_comment: +e.target.value || 0 })} /></div>
                <div><Label>Pts/like recebido</Label><Input type="number" value={settings.points_per_like_received} onChange={(e) => setSettings({ ...settings, points_per_like_received: +e.target.value || 0 })} /></div>
                <div><Label>Pts/curso completo</Label><Input type="number" value={settings.points_per_course_completed} onChange={(e) => setSettings({ ...settings, points_per_course_completed: +e.target.value || 0 })} /></div>
              </div>
              <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}><Save className="h-4 w-4 mr-2" />Salvar</Button>
            </Card>
          )}
        </TabsContent>

        {/* Spaces */}
        <TabsContent value="spaces" className="space-y-4 mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Criar novo espaço</h3>
            <div className="flex gap-2">
              <Input placeholder="😀" value={newSpaceEmoji} onChange={(e) => setNewSpaceEmoji(e.target.value)} className="w-16 text-center" />
              <Input placeholder="Nome do espaço" value={newSpaceName} onChange={(e) => setNewSpaceName(e.target.value)} className="flex-1" />
              <Button onClick={() => createSpace.mutate()} disabled={!newSpaceName.trim() || createSpace.isPending}><Plus className="h-4 w-4" /></Button>
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
                {!s.is_default && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir espaço "{s.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>Todos os posts deste espaço serão excluídos permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSpace.mutate(s.id)}>Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Members */}
        <TabsContent value="members" className="space-y-4 mt-4">
          {/* Pending approvals */}
          {pendingMembers.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-foreground">Aguardando aprovação ({pendingMembers.length})</h3>
              {pendingMembers.map((m: any) => (
                <Card key={m.id} className="p-4 flex items-center gap-3 border-yellow-300/50 bg-yellow-50/30">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{(m.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{m.display_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground">Solicitou entrada</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="default" onClick={() => updateMember.mutate({ memberId: m.id, updates: { status: "ACTIVE" } })}>
                      <UserCheck className="h-3.5 w-3.5 mr-1" />Aprovar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => updateMember.mutate({ memberId: m.id, updates: { status: "BANNED", ban_reason: "Rejeitado" } })}>
                      Rejeitar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Active members */}
          <h3 className="font-semibold text-sm text-foreground">Membros ({activeMembers.length})</h3>
          <div className="space-y-2">
            {activeMembers.map((m: any) => (
              <Card key={m.id} className="p-4 flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={m.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{(m.display_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.display_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{m.role} · {m.total_points} pts · {m.status}</p>
                </div>
                <Badge variant={m.status === "ACTIVE" ? "secondary" : m.status === "MUTED" ? "outline" : "destructive"} className="text-xs">
                  {m.status}
                </Badge>
                {/* Actions (don't show for OWNER) */}
                {m.role !== "OWNER" && m.id !== member?.id && (
                  <div className="flex gap-1">
                    {/* Promote/Demote */}
                    <Select
                      value={m.role}
                      onValueChange={(role) => updateMember.mutate({ memberId: m.id, updates: { role } })}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MEMBER">Membro</SelectItem>
                        <SelectItem value="MODERATOR">Moderador</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {/* Mute/Unmute */}
                    {m.status === "ACTIVE" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Silenciar"
                        onClick={() => updateMember.mutate({ memberId: m.id, updates: { status: "MUTED", muted_at: new Date().toISOString() } })}>
                        <VolumeX className="h-4 w-4" />
                      </Button>
                    )}
                    {m.status === "MUTED" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Reativar"
                        onClick={() => updateMember.mutate({ memberId: m.id, updates: { status: "ACTIVE", muted_at: null } })}>
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                    {/* Ban */}
                    {m.status !== "BANNED" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Banir"><Ban className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Banir {m.display_name}?</AlertDialogTitle>
                            <AlertDialogDescription>O membro perderá acesso à comunidade.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => updateMember.mutate({ memberId: m.id, updates: { status: "BANNED", banned_at: new Date().toISOString(), ban_reason: "Banido pelo admin" } })}>
                              Banir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    {m.status === "BANNED" && (
                      <Button variant="ghost" size="sm" onClick={() => updateMember.mutate({ memberId: m.id, updates: { status: "ACTIVE", banned_at: null, ban_reason: null } })}>
                        Desbanir
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{community?.member_count || 0}</p>
              <p className="text-sm text-muted-foreground">Membros ativos</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{community?.post_count || 0}</p>
              <p className="text-sm text-muted-foreground">Posts totais</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{spaces?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Espaços</p>
            </Card>
            <Card className="p-6 text-center">
              <p className="text-3xl font-bold text-foreground">{pendingMembers.length}</p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
