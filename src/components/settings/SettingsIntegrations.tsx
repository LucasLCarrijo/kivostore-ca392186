import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Video, Zap, Instagram, ExternalLink } from "lucide-react";

const INTEGRATIONS = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sincronize sessões de coaching com seu calendário",
    icon: Calendar,
    connected: false,
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Crie links de reunião automaticamente para calls",
    icon: Video,
    connected: false,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Conecte com milhares de apps e automações",
    icon: Zap,
    connected: false,
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "AutoDM e integração com stories (em breve)",
    icon: Instagram,
    connected: false,
  },
];

export function SettingsIntegrations() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {INTEGRATIONS.map((integration) => {
          const Icon = integration.icon;
          return (
            <Card key={integration.id} className="bg-card border border-border/50 shadow-sm rounded-xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{integration.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                    </div>
                  </div>
                  <Badge variant={integration.connected ? "default" : "secondary"} className="text-xs shrink-0">
                    {integration.connected ? "Conectado" : "Não conectado"}
                  </Badge>
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    {integration.connected ? "Gerenciar" : "+ Conectar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardContent className="p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Não vê uma integração?</p>
            <p className="text-xs text-muted-foreground">Nos diga o que você precisa</p>
          </div>
          <Button variant="ghost" size="sm" className="text-primary">
            <ExternalLink className="h-4 w-4 mr-2" />
            Solicitar Nova Integração
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}