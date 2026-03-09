import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Video, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function CircleEvents() {
  const { currentWorkspace } = useWorkspace();

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

  const { data: events, isLoading } = useQuery({
    queryKey: ["circle-events", community?.id],
    queryFn: async () => {
      if (!community) return [];
      const { data } = await supabase
        .from("community_events")
        .select("*")
        .eq("community_id", community.id)
        .order("starts_at", { ascending: true });
      return data || [];
    },
    enabled: !!community,
  });

  const statusColor: Record<string, string> = {
    UPCOMING: "bg-blue-100 text-blue-700",
    LIVE: "bg-green-100 text-green-700",
    COMPLETED: "bg-muted text-muted-foreground",
    CANCELLED: "bg-destructive/10 text-destructive",
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Eventos</h1>
        <p className="text-sm text-muted-foreground mt-1">Próximos eventos da comunidade</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse space-y-3">
              <div className="h-5 bg-muted rounded w-1/2" />
              <div className="h-4 bg-muted rounded w-1/3" />
            </Card>
          ))}
        </div>
      ) : events?.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <h3 className="font-semibold">Nenhum evento agendado</h3>
          <p className="text-sm text-muted-foreground mt-1">Fique atento para novos eventos!</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {events?.map((event: any) => (
            <Card key={event.id} className="p-5 space-y-3">
              {event.cover_image_url && (
                <img src={event.cover_image_url} alt="" className="w-full h-40 object-cover rounded-lg" />
              )}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{event.title}</h3>
                  {event.description && (
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  )}
                </div>
                <Badge className={statusColor[event.status] || ""}>
                  {event.status === "UPCOMING" ? "Em breve" : event.status === "LIVE" ? "Ao vivo" : event.status === "COMPLETED" ? "Encerrado" : "Cancelado"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
              {event.meeting_url && event.status !== "COMPLETED" && event.status !== "CANCELLED" && (
                <Button variant="outline" size="sm" asChild>
                  <a href={event.meeting_url} target="_blank" rel="noopener noreferrer">
                    <Video className="h-4 w-4 mr-2" />
                    Entrar na reunião
                  </a>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
