import { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, addDays, isSameDay, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, Clock, CheckCircle, ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

export default function BookAppointment() {
  const { productSlug } = useParams<{ productSlug: string }>();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  // Fetch product by slug
  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["book-product", productSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, workspace_id, slug")
        .eq("slug", productSlug!)
        .eq("type", "SERVICE")
        .eq("status", "ACTIVE")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productSlug,
  });

  // Fetch availability slots
  const { data: availabilitySlots = [] } = useQuery({
    queryKey: ["book-availability", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("product_id", product.id)
        .eq("is_active", true)
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Fetch existing appointments to block taken slots
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["book-existing", product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from("appointments")
        .select("scheduled_date, start_time, end_time")
        .eq("product_id", product.id)
        .eq("status", "CONFIRMED")
        .gte("scheduled_date", new Date().toISOString().split("T")[0]);
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Generate calendar days (2 weeks from today + offset)
  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date());
    const start = addDays(today, weekOffset * 7);
    return Array.from({ length: 14 }, (_, i) => addDays(start, i)).filter(
      (d) => d >= today
    );
  }, [weekOffset]);

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const dayOfWeek = selectedDate.getDay();
    const daySlots = availabilitySlots.filter((s) => s.day_of_week === dayOfWeek);

    const result: TimeSlot[] = [];
    const dateStr = format(selectedDate, "yyyy-MM-dd");

    for (const slot of daySlots) {
      const startMinutes = timeToMinutes(slot.start_time);
      const endMinutes = timeToMinutes(slot.end_time);
      const duration = slot.duration_minutes;

      for (let t = startMinutes; t + duration <= endMinutes; t += duration) {
        const slotStart = minutesToTime(t);
        const slotEnd = minutesToTime(t + duration);

        // Check if slot is already taken
        const isTaken = existingAppointments.some(
          (a) =>
            a.scheduled_date === dateStr &&
            a.start_time?.slice(0, 5) === slotStart
        );

        // Check if slot is in the past
        const now = new Date();
        const slotDate = new Date(`${dateStr}T${slotStart}:00`);
        const isPast = slotDate <= now;

        if (!isTaken && !isPast) {
          result.push({ start: slotStart, end: slotEnd });
        }
      }
    }
    return result;
  }, [selectedDate, availabilitySlots, existingAppointments]);

  // Has availability on date
  const hasAvailability = (date: Date) => {
    const dayOfWeek = date.getDay();
    return availabilitySlots.some((s) => s.day_of_week === dayOfWeek);
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedSlot || !name || !email || !product) return;
    setBooking(true);

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      const { data, error } = await supabase.from("appointments").insert({
        product_id: product.id,
        workspace_id: product.workspace_id,
        customer_name: name,
        customer_email: email,
        scheduled_date: dateStr,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        notes: notes || null,
        status: "CONFIRMED",
        meeting_provider: "manual",
      }).select().single();

      if (error) throw error;
      setBooked(data);
      toast.success("Agendamento confirmado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao agendar");
    } finally {
      setBooking(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4 p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-bold mb-2">Serviço não encontrado</h2>
          <p className="text-muted-foreground">Este serviço não está disponível para agendamento.</p>
        </Card>
      </div>
    );
  }

  // Success state
  if (booked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--muted)/0.3)] p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Agendamento confirmado!</h2>
            <div className="bg-muted rounded-lg p-4 space-y-2 text-left">
              <p className="text-sm"><strong>Serviço:</strong> {product.name}</p>
              <p className="text-sm">
                <strong>Data:</strong>{" "}
                {format(new Date(booked.scheduled_date + "T00:00:00"), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm">
                <strong>Horário:</strong> {booked.start_time?.slice(0, 5)} - {booked.end_time?.slice(0, 5)}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Você receberá um email com os detalhes e o link da reunião.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--muted)/0.3)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">{product.name}</h1>
          <p className="text-muted-foreground mt-1">Escolha um horário disponível</p>
        </div>

        {/* Calendar */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Selecione a data
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  disabled={weekOffset <= 0}
                  onClick={() => setWeekOffset((w) => w - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setWeekOffset((w) => w + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.slice(0, 14).map((day) => {
                const hasSlots = hasAvailability(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());

                return (
                  <button
                    key={day.toISOString()}
                    disabled={!hasSlots}
                    onClick={() => {
                      setSelectedDate(day);
                      setSelectedSlot(null);
                    }}
                    className={`flex flex-col items-center p-2 rounded-lg text-center transition-all ${
                      isSelected
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : hasSlots
                        ? "hover:bg-muted cursor-pointer"
                        : "opacity-30 cursor-not-allowed"
                    } ${isToday && !isSelected ? "ring-1 ring-primary" : ""}`}
                  >
                    <span className="text-[10px] uppercase">
                      {format(day, "EEE", { locale: ptBR })}
                    </span>
                    <span className="text-lg font-semibold">{format(day, "d")}</span>
                    <span className="text-[10px]">{format(day, "MMM", { locale: ptBR })}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time slots */}
        {selectedDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Horários disponíveis —{" "}
                {format(selectedDate, "dd/MM", { locale: ptBR })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {availableTimeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum horário disponível nesta data
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {availableTimeSlots.map((slot) => (
                    <button
                      key={slot.start}
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${
                        selectedSlot?.start === slot.start
                          ? "bg-primary text-primary-foreground border-primary"
                          : "hover:border-primary/50 hover:bg-muted"
                      }`}
                    >
                      {slot.start}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Booking form */}
        {selectedSlot && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Seus dados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted rounded-lg p-3 flex items-center gap-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {format(selectedDate!, "dd/MM", { locale: ptBR })}
                </Badge>
                <span className="text-sm font-medium">
                  {selectedSlot.start} - {selectedSlot.end}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Input
                  placeholder="Algo que gostaria de compartilhar antes da reunião?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <Button
                className="w-full h-12 font-semibold"
                disabled={!name || !email || booking}
                onClick={handleBook}
              >
                {booking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirmar agendamento"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
