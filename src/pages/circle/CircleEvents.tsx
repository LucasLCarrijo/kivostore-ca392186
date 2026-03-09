import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Video, Users, Plus, X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CircleEvents() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

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

  const { data: events, isLoading } = useQuery({
    queryKey: ["circle-events", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase.from("community_events").select("*").eq("community_id", community.id).order("starts_at", { ascending: true });
      return data || [];
    },
    enabled: !!community,
  });

  const { data: userRsvps } = useQuery({
    queryKey: ["circle-rsvps", member?.id],
    queryFn: async () => {
      if (!member) return {};
      const { data } = await supabase.from("community_event_rsvps").select("event_id, status").eq("member_id", member.id);
      const map: Record<string, string> = {};
      data?.forEach((r: any) => { map[r.event_id] = r.status; });
      return map;
    },
    enabled: !!member,
  });

  const isAdmin = member?.role === "OWNER" || member?.role === "ADMIN";

  const createEvent = useMutation({
    mutationFn: async () => {
      if (!community || !member || !title.trim() || !startsAt) throw new Error("Missing");
      const { error } = await supabase.from("community_events").insert({
        community_id: community.id,
        created_by: member.id,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        meeting_url: meetingUrl.trim() || null,
        meeting_platform: meetingUrl.includes("zoom") ? "zoom" : meetingUrl.includes("meet.google") ? "google_meet" : "custom",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-events"] });
      setShowCreate(false);
      setTitle(""); setDescription(""); setStartsAt(""); setMeetingUrl("");
      toast.success("Evento criado!");
    },
    onError: () => toast.error("Erro ao criar evento"),
  });

  const rsvp = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      if (!member) throw new Error("Not a member");
      const existing = userRsvps?.[eventId];
      if (existing) {
        await supabase.from("community_event_rsvps").update({ status }).eq("event_id", eventId).eq("member_id", member.id);
      } else {
        await supabase.from("community_event_rsvps").insert({ event_id: eventId, member_id: member.id, status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-rsvps"] });
      queryClient.invalidateQueries({ queryKey: ["circle-events"] });
      toast.success("RSVP atualizado!");
    },
  });

  const buildGCalUrl = (event: any) => {
    const start = new Date(event.starts_at);
    const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(event.description || "")}&location=${encodeURIComponent(event.meeting_url || "")}`;
  };

  const statusColor: Record<string, string> = {
    UPCOMING: "bg-blue-100 text-blue-700",
    LIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-destructive/10 text-destructive",
  };

  const statusLabel: Record<string, string> = {
    UPCOMING: "Em breve",
    LIVE: "Ao vivo",
    COMPLETED: "Encerrado",
    CANCELLED: "Cancelado",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground mt-1">Próximos eventos da comunidade</p>
        </div>
        {(isAdmin || community?.allow_member_events) && (
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Criar Evento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Evento</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
                <div><Label>Data e hora</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
                <div><Label>Link da reunião (Zoom, Google Meet, etc.)</Label><Input value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://..." /></div>
                <Button onClick={() => createEvent.mutate()} disabled={!title.trim() || !startsAt || createEvent.isPending} className="w-full">
                  Criar Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => <Card key={i} className="p-6 animate-pulse space-y-3"><div className="h-5 bg-muted rounded w-1/2" /></Card>)}
        </div>
      ) : events?.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold">Nenhum evento agendado</h3>
          <p className="text-sm text-muted-foreground mt-1">Fique atento para novos eventos!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {events?.map((event: any) => {
            const myRsvp = userRsvps?.[event.id];
            return (
              <Card key={event.id} className="p-5 space-y-3">
                {event.cover_image_url && (
                  <img src={event.cover_image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
                )}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{event.title}</h3>
                    {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                  </div>
                  <Badge className={statusColor[event.status] || ""}>{statusLabel[event.status] || event.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(event.starts_at), "dd MMM yyyy", { locale: ptBR })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {format(new Date(event.starts_at), "HH:mm")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    {event.rsvp_count} confirmados
                  </span>
                </div>
                {event.status !== "COMPLETED" && event.status !== "CANCELLED" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* RSVP buttons */}
                    {(["GOING", "MAYBE", "NOT_GOING"] as const).map((s) => (
                      <Button
                        key={s}
                        variant={myRsvp === s ? "default" : "outline"}
                        size="sm"
                        onClick={() => rsvp.mutate({ eventId: event.id, status: s })}
                        disabled={rsvp.isPending}
                      >
                        {s === "GOING" ? "✅ Vou" : s === "MAYBE" ? "🤔 Talvez" : "❌ Não vou"}
                      </Button>
                    ))}
                    {/* Google Calendar */}
                    <Button variant="ghost" size="sm" asChild>
                      <a href={buildGCalUrl(event)} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Google Calendar
                      </a>
                    </Button>
                    {/* Meeting link */}
                    {event.meeting_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1.5" />Entrar
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
