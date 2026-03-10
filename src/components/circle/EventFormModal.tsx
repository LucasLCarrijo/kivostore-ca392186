import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2, Video } from "lucide-react";
import { toast } from "sonner";

interface EventFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communityId: string;
  memberId: string;
  event?: any; // for editing
}

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Chicago", label: "Chicago (GMT-6)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Europe/Berlin", label: "Berlim (GMT+1)" },
];

function detectPlatform(url: string): string | null {
  if (!url) return null;
  if (url.includes("zoom.us") || url.includes("zoom.com")) return "zoom";
  if (url.includes("meet.google.com")) return "google_meet";
  if (url.includes("teams.microsoft.com")) return "teams";
  if (url.includes("discord.gg") || url.includes("discord.com")) return "discord";
  return "custom";
}

const PLATFORM_LABELS: Record<string, string> = {
  zoom: "Zoom",
  google_meet: "Google Meet",
  teams: "Microsoft Teams",
  discord: "Discord",
  custom: "Link personalizado",
};

export default function EventFormModal({ open, onOpenChange, communityId, memberId, event }: EventFormModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!event;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [timezone, setTimezone] = useState("America/Sao_Paulo");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [maxAttendees, setMaxAttendees] = useState("");
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title || "");
      setDescription(event.description || "");
      setStartsAt(event.starts_at ? new Date(event.starts_at).toISOString().slice(0, 16) : "");
      setEndsAt(event.ends_at ? new Date(event.ends_at).toISOString().slice(0, 16) : "");
      setIsAllDay(event.is_all_day || false);
      setTimezone(event.timezone || "America/Sao_Paulo");
      setMeetingUrl(event.meeting_url || "");
      setMaxAttendees(event.max_attendees?.toString() || "");
      setCoverImage(event.cover_image_url || null);
    } else {
      setTitle(""); setDescription(""); setStartsAt(""); setEndsAt("");
      setIsAllDay(false); setTimezone("America/Sao_Paulo"); setMeetingUrl("");
      setMaxAttendees(""); setCoverImage(null);
    }
  }, [event, open]);

  const detectedPlatform = detectPlatform(meetingUrl);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `events/${communityId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("community").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("community").getPublicUrl(path);
      setCoverImage(urlData.publicUrl);
    } catch {
      toast.error("Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        community_id: communityId,
        created_by: memberId,
        title: title.trim(),
        description: description.trim() || null,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_all_day: isAllDay,
        timezone,
        meeting_url: meetingUrl.trim() || null,
        meeting_platform: detectedPlatform,
        max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        cover_image_url: coverImage,
      };

      if (isEditing) {
        const { error } = await supabase.from("community_events").update(payload).eq("id", event.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("community_events").insert(payload);
        if (error) throw error;

        // Notify all active members
        const { data: activeMembers } = await supabase.from("community_members")
          .select("id").eq("community_id", communityId).eq("status", "ACTIVE");

        if (activeMembers && activeMembers.length > 0) {
          const notifications = activeMembers
            .filter((m: any) => m.id !== memberId)
            .map((m: any) => ({
              community_id: communityId,
              recipient_id: m.id,
              type: "NEW_EVENT" as any,
              title: `📅 Novo evento: ${title.trim()}`,
              body: `${startsAt ? new Date(startsAt).toLocaleDateString("pt-BR") : "Em breve"}`,
            }));
          if (notifications.length > 0) {
            await supabase.from("community_notifications").insert(notifications);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-events"] });
      onOpenChange(false);
      toast.success(isEditing ? "Evento atualizado!" : "Evento criado!");
    },
    onError: () => toast.error("Erro ao salvar evento"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!event) return;
      await supabase.from("community_events").delete().eq("id", event.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-events"] });
      onOpenChange(false);
      toast.success("Evento excluído");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Cover image */}
          <div>
            <Label>Imagem de capa</Label>
            {coverImage ? (
              <div className="relative mt-2">
                <img src={coverImage} alt="" className="w-full h-32 object-cover rounded-lg" />
                <Button
                  variant="destructive" size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setCoverImage(null)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <label className="mt-2 flex items-center justify-center h-24 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                <div className="text-center text-sm text-muted-foreground">
                  <Upload className="h-5 w-5 mx-auto mb-1" />
                  {uploading ? "Enviando..." : "Clique para enviar"}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>

          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nome do evento" />
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Detalhes do evento..." />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
            <Label className="cursor-pointer">Evento o dia inteiro</Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Início *</Label>
              <Input type={isAllDay ? "date" : "datetime-local"} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input type={isAllDay ? "date" : "datetime-local"} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Link da reunião</Label>
            <Input
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
            {detectedPlatform && meetingUrl && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Video className="h-3.5 w-3.5 text-muted-foreground" />
                <Badge variant="secondary" className="text-[10px]">
                  {PLATFORM_LABELS[detectedPlatform]}
                </Badge>
              </div>
            )}
          </div>

          <div>
            <Label>Máximo de participantes (opcional)</Label>
            <Input
              type="number" min="1"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              placeholder="Ilimitado"
            />
          </div>

          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || !startsAt || saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? "Salvando..." : isEditing ? "Salvar Alterações" : "Criar Evento"}
          </Button>

          {isEditing && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                if (confirm("Tem certeza que deseja excluir este evento?")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Excluir Evento
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
