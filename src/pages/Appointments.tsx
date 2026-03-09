import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, Clock, Plus, Trash2, Video, CalendarCheck, CalendarX, Users,
} from "lucide-react";

const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const STATUS_MAP: Record<string, { label: string; class: string }> = {
  CONFIRMED: { label: "Confirmado", class: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelado", class: "bg-red-100 text-red-800" },
  COMPLETED: { label: "Concluído", class: "bg-blue-100 text-blue-800" },
  NO_SHOW: { label: "Não compareceu", class: "bg-yellow-100 text-yellow-800" },
};

export default function Appointments() {
  const { currentWorkspace } = useWorkspace();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("appointments");
  const [showSlotDialog, setShowSlotDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("all");

  // New slot form
  const [slotProduct, setSlotProduct] = useState("");
  const [slotDay, setSlotDay] = useState("1");
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");
  const [slotDuration, setSlotDuration] = useState("60");

  // Fetch SERVICE products
  const { data: serviceProducts = [] } = useQuery({
    queryKey: ["service-products", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .eq("type", "SERVICE")
        .order("name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch availability slots
  const { data: slots = [] } = useQuery({
    queryKey: ["availability-slots", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*, products:product_id(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ["appointments", currentWorkspace?.id, selectedProduct],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      let query = supabase
        .from("appointments")
        .select("*, products:product_id(name)")
        .eq("workspace_id", currentWorkspace.id)
        .order("scheduled_date", { ascending: true })
        .order("start_time", { ascending: true });
      
      if (selectedProduct !== "all") {
        query = query.eq("product_id", selectedProduct);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Create slot mutation
  const createSlot = useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id || !slotProduct) throw new Error("Dados incompletos");
      const { error } = await supabase.from("availability_slots").insert({
        product_id: slotProduct,
        workspace_id: currentWorkspace.id,
        day_of_week: parseInt(slotDay),
        start_time: slotStart,
        end_time: slotEnd,
        duration_minutes: parseInt(slotDuration),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      toast.success("Horário adicionado!");
      setShowSlotDialog(false);
      setSlotProduct("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Delete slot
  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("availability_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability-slots"] });
      toast.success("Horário removido!");
    },
  });

  // Toggle slot active
  const toggleSlot = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("availability_slots")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability-slots"] }),
  });

  // Update appointment status
  const updateAppointmentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status };
      if (status === "CANCELLED") updates.cancelled_at = new Date().toISOString();
      const { error } = await supabase.from("appointments").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Status atualizado!");
    },
  });

  // Metrics
  const today = new Date().toISOString().split("T")[0];
  const upcomingCount = appointments.filter(
    (a) => a.status === "CONFIRMED" && a.scheduled_date >= today
  ).length;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const cancelledCount = appointments.filter((a) => a.status === "CANCELLED").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Agendamentos</h1>
          <p className="text-muted-foreground">Gerencie consultorias e horários disponíveis</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Próximos</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{upcomingCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{completedCount}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cancelados</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{cancelledCount}</div></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="appointments">
            <Calendar className="h-4 w-4 mr-2" /> Agendamentos
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Clock className="h-4 w-4 mr-2" /> Disponibilidade
          </TabsTrigger>
        </TabsList>

        {/* APPOINTMENTS TAB */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex gap-4">
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Produto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Serviços</SelectItem>
                {serviceProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {appointments.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum agendamento</h3>
              <p className="text-muted-foreground">Configure horários disponíveis para receber agendamentos</p>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Meeting</TableHead>
                    <TableHead className="w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((apt) => {
                    const st = STATUS_MAP[apt.status] || STATUS_MAP.CONFIRMED;
                    return (
                      <TableRow key={apt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{apt.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{apt.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{(apt as any).products?.name || "-"}</TableCell>
                        <TableCell>
                          {format(new Date(apt.scheduled_date + "T00:00:00"), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {apt.start_time?.slice(0, 5)} - {apt.end_time?.slice(0, 5)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={st.class}>{st.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {apt.meeting_url ? (
                            <a href={apt.meeting_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="ghost" size="sm" className="gap-1">
                                <Video className="h-3 w-3" /> Entrar
                              </Button>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {apt.status === "CONFIRMED" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm" variant="outline"
                                onClick={() => updateAppointmentStatus.mutate({ id: apt.id, status: "COMPLETED" })}
                              >
                                Concluir
                              </Button>
                              <Button
                                size="sm" variant="ghost" className="text-destructive"
                                onClick={() => updateAppointmentStatus.mutate({ id: apt.id, status: "CANCELLED" })}
                              >
                                Cancelar
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* AVAILABILITY TAB */}
        <TabsContent value="availability" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Configure os horários em que você está disponível para cada serviço
            </p>
            <Button onClick={() => setShowSlotDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Adicionar horário
            </Button>
          </div>

          {slots.length === 0 ? (
            <Card className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum horário configurado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione seus horários disponíveis para que clientes possam agendar
              </p>
              <Button onClick={() => setShowSlotDialog(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Configurar horários
              </Button>
            </Card>
          ) : (
            <div className="grid gap-3">
              {DAYS.map((dayName, dayIndex) => {
                const daySlots = slots.filter((s) => s.day_of_week === dayIndex);
                if (daySlots.length === 0) return null;
                return (
                  <Card key={dayIndex}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">{dayName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={slot.is_active}
                              onCheckedChange={(checked) =>
                                toggleSlot.mutate({ id: slot.id, is_active: checked })
                              }
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(slot as any).products?.name} · {slot.duration_minutes}min
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive h-8 w-8"
                            onClick={() => deleteSlot.mutate(slot.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Slot Dialog */}
      <Dialog open={showSlotDialog} onOpenChange={setShowSlotDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar horário disponível</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select value={slotProduct} onValueChange={setSlotProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {serviceProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dia da semana</Label>
              <Select value={slotDay} onValueChange={setSlotDay}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={i.toString()}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" value={slotStart} onChange={(e) => setSlotStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim</Label>
                <Input type="time" value={slotEnd} onChange={(e) => setSlotEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duração por sessão (minutos)</Label>
              <Select value={slotDuration} onValueChange={setSlotDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                  <SelectItem value="90">1h30</SelectItem>
                  <SelectItem value="120">2 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSlotDialog(false)}>Cancelar</Button>
            <Button
              onClick={() => createSlot.mutate()}
              disabled={!slotProduct || createSlot.isPending}
            >
              {createSlot.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
