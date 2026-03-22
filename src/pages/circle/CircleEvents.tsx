import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Video, Users, Plus, List, CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { format, isPast, addHours, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getEventStatus, PLATFORM_LABELS, formatDuration } from "@/lib/community-utils";
import EventFormModal from "@/components/circle/EventFormModal";
import EventDetailModal from "@/components/circle/EventDetailModal";

export default function CircleEvents() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [view, setView] = useState<"list" | "calendar">("list");
  const [filter, setFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [showCreate, setShowCreate] = useState(false);
  const [editEvent, setEditEvent] = useState<any>(null);
  const [detailEvent, setDetailEvent] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

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

  const rsvp = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: "GOING" | "MAYBE" | "NOT_GOING" }) => {
      if (!member) throw new Error("Not a member");
      const existing = userRsvps?.[eventId];
      if (existing) {
        await supabase.from("community_event_rsvps").update({ status } as any).eq("event_id", eventId).eq("member_id", member.id);
      } else {
        await supabase.from("community_event_rsvps").insert([{ event_id: eventId, member_id: member.id, status }] as any);
      }

      // Update rsvp_count (count GOING)
      const { count } = await supabase
        .from("community_event_rsvps")
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "GOING");

      await supabase.from("community_events").update({ rsvp_count: count || 0 }).eq("id", eventId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-rsvps"] });
      queryClient.invalidateQueries({ queryKey: ["circle-events"] });
      toast.success("RSVP atualizado!");
    },
  });

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!events) return [];
    return events.filter((e: any) => {
      const end = e.ends_at ? new Date(e.ends_at) : addHours(new Date(e.starts_at), 1);
      if (filter === "upcoming") return !isPast(end);
      if (filter === "past") return isPast(end);
      return true;
    });
  }, [events, filter]);

  // Events for selected calendar date
  const dateEvents = useMemo(() => {
    if (!selectedDate || !events) return [];
    return events.filter((e: any) => isSameDay(new Date(e.starts_at), selectedDate));
  }, [events, selectedDate]);

  // Dates with events for calendar dots
  const eventDates = useMemo(() => {
    if (!events) return new Set<string>();
    return new Set(events.map((e: any) => format(new Date(e.starts_at), "yyyy-MM-dd")));
  }, [events]);

  const handleRsvp = (eventId: string, status: "GOING" | "MAYBE" | "NOT_GOING") => {
    rsvp.mutate({ eventId, status });
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
          <p className="text-sm text-muted-foreground mt-1">Próximos eventos da comunidade</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant="ghost" size="sm"
              className={cn("rounded-none h-8", view === "list" && "bg-muted")}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost" size="sm"
              className={cn("rounded-none h-8", view === "calendar" && "bg-muted")}
              onClick={() => setView("calendar")}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>

          {(isAdmin || community?.allow_member_events) && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" />Criar
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {([
          { key: "upcoming" as const, label: "Próximos" },
          { key: "past" as const, label: "Passados" },
          { key: "all" as const, label: "Todos" },
        ]).map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="space-y-4">
          <Card className="p-4 flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              className="pointer-events-auto"
              modifiers={{ hasEvent: (date) => eventDates.has(format(date, "yyyy-MM-dd")) }}
              modifiersStyles={{ hasEvent: { position: "relative" } }}
              modifiersClassNames={{ hasEvent: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1.5 after:w-1.5 after:rounded-full after:bg-primary" }}
            />
          </Card>

          {selectedDate && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">
                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                {dateEvents.length === 0 && <span className="text-muted-foreground ml-2">— sem eventos</span>}
              </p>
              {dateEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={event}
                  myRsvp={userRsvps?.[event.id]}
                  onRsvp={handleRsvp}
                  rsvpPending={rsvp.isPending}
                  onClick={() => setDetailEvent(event)}
                  isAdmin={isAdmin}
                  onEdit={() => setEditEvent(event)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-6 animate-pulse space-y-3">
                  <div className="h-5 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </Card>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <Card className="p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="font-semibold text-foreground">Nenhum evento programado</h3>
              <p className="text-sm text-muted-foreground mt-1">Fique ligado! 📅</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredEvents.map((event: any) => (
                <EventCard
                  key={event.id}
                  event={event}
                  myRsvp={userRsvps?.[event.id]}
                  onRsvp={handleRsvp}
                  rsvpPending={rsvp.isPending}
                  onClick={() => setDetailEvent(event)}
                  isAdmin={isAdmin}
                  onEdit={() => setEditEvent(event)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <EventFormModal
        open={showCreate || !!editEvent}
        onOpenChange={(open) => {
          if (!open) { setShowCreate(false); setEditEvent(null); }
        }}
        communityId={community?.id || ""}
        memberId={member?.id || ""}
        event={editEvent}
      />

      <EventDetailModal
        event={detailEvent}
        open={!!detailEvent}
        onOpenChange={(open) => !open && setDetailEvent(null)}
        myRsvp={detailEvent ? userRsvps?.[detailEvent.id] : undefined}
        onRsvp={handleRsvp}
        rsvpPending={rsvp.isPending}
      />
    </div>
  );
}

// ──────────── Event Card Component ────────────

interface EventCardProps {
  event: any;
  myRsvp?: string;
  onRsvp: (eventId: string, status: "GOING" | "MAYBE" | "NOT_GOING") => void;
  rsvpPending: boolean;
  onClick: () => void;
  isAdmin: boolean;
  onEdit: () => void;
}

function EventCard({ event, myRsvp, onRsvp, rsvpPending, onClick, isAdmin, onEdit }: EventCardProps) {
  const status = getEventStatus(event);
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  const duration = end ? Math.round((end.getTime() - start.getTime()) / 60000) : null;
  const isEnded = status.key === "past";

  return (
    <Card className="overflow-hidden group">
      {/* Cover image or gradient */}
      <div
        className={cn(
          "relative h-32 cursor-pointer",
          event.cover_image_url ? "" : "bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5"
        )}
        onClick={onClick}
      >
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="font-bold text-white text-lg leading-tight drop-shadow-sm">{event.title}</h3>
        </div>
        <Badge className={cn("absolute top-3 right-3", status.color)}>{status.label}</Badge>
      </div>

      <div className="p-4 space-y-3">
        {/* Info row */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            {format(start, "EEE, dd MMM yyyy", { locale: ptBR })}
          </span>
          {!event.is_all_day && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {format(start, "HH:mm")}
            </span>
          )}
          {duration && (
            <span className="flex items-center gap-1.5">
              ⏱️ {formatDuration(duration)}
            </span>
          )}
          {event.meeting_platform && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {PLATFORM_LABELS[event.meeting_platform] || "Link"}
            </Badge>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {event.rsvp_count} confirmado{event.rsvp_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* RSVP & Actions */}
        {!isEnded && event.status !== "CANCELLED" && (
          <div className="flex items-center gap-2 flex-wrap">
            {(["GOING", "MAYBE", "NOT_GOING"] as const).map((s) => (
              <Button
                key={s}
                variant={myRsvp === s ? "default" : "outline"}
                size="sm"
                onClick={() => onRsvp(event.id, s)}
                disabled={rsvpPending}
              >
                {s === "GOING" ? "✅ Vou" : s === "MAYBE" ? "🤔 Talvez" : "❌ Não vou"}
              </Button>
            ))}

            {status.key === "live" && event.meeting_url && (
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" asChild>
                <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                  <Video className="h-3.5 w-3.5 mr-1" />Entrar
                </a>
              </Button>
            )}

            {isAdmin && (
              <Button variant="ghost" size="sm" onClick={onEdit} className="ml-auto text-muted-foreground">
                Editar
              </Button>
            )}
          </div>
        )}

        {isEnded && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary">✅ {event.rsvp_count} participaram</Badge>
          </div>
        )}
      </div>
    </Card>
  );
}
