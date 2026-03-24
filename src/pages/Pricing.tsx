import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CreditCard, QrCode, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type BillingCycle = "monthly" | "annual";
type Step = 1 | 2 | 3;

type Plan = {
  id: "creator" | "creator-pro";
  name: string;
  monthly: number;
  annual: number;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "creator",
    name: "Creator",
    monthly: 49,
    annual: 39,
    popular: true,
    features: ["Até 10 produtos", "Área de membros", "Afiliados", "Email marketing"],
  },
  {
    id: "creator-pro",
    name: "Creator Pro",
    monthly: 149,
    annual: 119,
    features: ["Produtos ilimitados", "Automações avançadas", "NFS-e", "Suporte prioritário"],
  },
];

export default function Pricing() {
  const [step, setStep] = useState<Step>(1);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [planId, setPlanId] = useState<Plan["id"]>("creator");
  const [method, setMethod] = useState<"card" | "pix" | null>(null);

  const selectedPlan = useMemo(() => PLANS.find((p) => p.id === planId)!, [planId]);
  const price = cycle === "annual" ? selectedPlan.annual : selectedPlan.monthly;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Pricing</h1>
        <p className="text-muted-foreground">Plano > Pagamento > Confirmação</p>
      </div>

      <div className="flex gap-2 text-sm">
        <Badge variant={step === 1 ? "default" : "secondary"}>1. Planos</Badge>
        <Badge variant={step === 2 ? "default" : "secondary"}>2. Pagamento</Badge>
        <Badge variant={step === 3 ? "default" : "secondary"}>3. Confirmação</Badge>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Escolha seu plano</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Button variant={cycle === "monthly" ? "default" : "outline"} onClick={() => setCycle("monthly")}>Mensal</Button>
              <Button variant={cycle === "annual" ? "default" : "outline"} onClick={() => setCycle("annual")}>
                Anual <span className="ml-1 text-xs opacity-80">(desconto)</span>
              </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {PLANS.map((plan) => {
                const planPrice = cycle === "annual" ? plan.annual : plan.monthly;
                const active = plan.id === planId;
                return (
                  <Card
                    key={plan.id}
                    className={cn("cursor-pointer border", active && "ring-2 ring-primary")}
                    onClick={() => setPlanId(plan.id)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{plan.name}</p>
                        {plan.popular && <Badge>Popular</Badge>}
                      </div>
                      <p className="text-2xl font-bold">R${planPrice}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
                      <ul className="space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-sm flex items-center gap-2"><Check className="w-4 h-4 text-primary" />{f}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)}>Continuar <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Plano: <b>{selectedPlan.name}</b> • R${price}/mês</p>
            <div className="grid md:grid-cols-2 gap-3">
              <Button variant={method === "card" ? "default" : "outline"} onClick={() => setMethod("card")} className="justify-start gap-2">
                <CreditCard className="w-4 h-4" /> Cartão de crédito
              </Button>
              <Button variant={method === "pix" ? "default" : "outline"} onClick={() => setMethod("pix")} className="justify-start gap-2">
                <QrCode className="w-4 h-4" /> PIX
              </Button>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button disabled={!method} onClick={() => setStep(3)}>Confirmar assinatura</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Assinatura confirmada 🎉</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Tudo certo! Seu plano <b>{selectedPlan.name}</b> foi confirmado via <b>{method === "card" ? "Cartão" : "PIX"}</b>.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <a href="/store/editor">Criar sua loja</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/dashboard">Ir para Dashboard</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
