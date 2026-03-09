import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

interface NotifToggle {
  key: string;
  label: string;
  description: string;
  defaultValue: boolean;
}

const CREATOR_NOTIFS: NotifToggle[] = [
  { key: "calendar_bookings", label: "Calendar Bookings", description: "Quando alguém agendar uma sessão", defaultValue: true },
  { key: "orders_fulfillment", label: "Pedidos Pendentes", description: "Pedidos que precisam de ação manual", defaultValue: true },
  { key: "purchase_confirmations", label: "Confirmação de Compra", description: "Quando uma nova compra for realizada", defaultValue: true },
  { key: "lead_captured", label: "Lead Capturado", description: "Quando um novo lead se inscrever", defaultValue: false },
  { key: "membership_cancellations", label: "Cancelamento de Assinatura", description: "Quando um membro cancelar", defaultValue: true },
];

const CUSTOMER_NOTIFS: NotifToggle[] = [
  { key: "recurring_payments", label: "Pagamentos Recorrentes", description: "Notificar assinantes sobre cobranças futuras", defaultValue: true },
];

export function SettingsNotifications() {
  const [settings, setSettings] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    [...CREATOR_NOTIFS, ...CUSTOMER_NOTIFS].forEach((n) => (map[n.key] = n.defaultValue));
    return map;
  });

  const toggle = (key: string) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderToggles = (items: NotifToggle[]) =>
    items.map((item) => (
      <div key={item.key} className="flex items-center justify-between py-3 border-b border-border/30 last:border-0">
        <div>
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.description}</p>
        </div>
        <Switch checked={settings[item.key]} onCheckedChange={() => toggle(item.key)} />
      </div>
    ));

  return (
    <div className="space-y-6">
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Para Mim</CardTitle>
          <p className="text-sm text-muted-foreground">Notificações que você recebe como creator</p>
        </CardHeader>
        <CardContent>{renderToggles(CREATOR_NOTIFS)}</CardContent>
      </Card>

      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Para Clientes</CardTitle>
          <p className="text-sm text-muted-foreground">Notificações enviadas aos seus clientes</p>
        </CardHeader>
        <CardContent>{renderToggles(CUSTOMER_NOTIFS)}</CardContent>
      </Card>
    </div>
  );
}