import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useToast } from "@/hooks/use-toast";

interface StepPlanProps {
  selectedPlan: 'free' | 'creator' | 'creator-pro';
  onUpdate: (plan: 'free' | 'creator' | 'creator-pro') => void;
  onNext: () => void;
}

const PLANS = [
  {
    id: 'free' as const,
    name: 'Free',
    price: 'R$0',
    period: '/mês',
    description: 'Perfeito para começar',
    icon: Zap,
    features: [
      '1 produto',
      'Taxa de 7%',
      'Link-in-bio',
      'Com marca Kivo',
    ],
    limitations: ['Funcionalidades básicas'],
  },
  {
    id: 'creator' as const,
    name: 'Creator',
    price: 'R$49',
    period: '/mês',
    description: 'Para quem quer crescer',
    icon: Crown,
    popular: true,
    features: [
      'Até 10 produtos',
      'Taxa de 5%',
      'Sem marca Kivo',
      'Área de membros',
      'Analytics básico',
    ],
    limitations: [],
  },
  {
    id: 'creator-pro' as const,
    name: 'Creator Pro',
    price: 'R$149',
    period: '/mês',
    description: 'Para profissionais',
    icon: Sparkles,
    features: [
      'Produtos ilimitados',
      'Taxa de 3%',
      'WhatsApp integrado',
      'IA para conteúdo',
      'NFS-e automática',
      'Analytics avançado',
    ],
    limitations: [],
  },
];

export function StepPlan({ selectedPlan, onUpdate, onNext }: StepPlanProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const handlePlanSelect = (planId: 'free' | 'creator' | 'creator-pro') => {
    onUpdate(planId);
  };

  const handleContinue = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          metadata: { plan: selectedPlan }
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      onNext();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o plano escolhido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Escolha seu plano</h2>
        <p className="text-muted-foreground">
          Você pode mudar ou cancelar a qualquer momento
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selectedPlan === plan.id;
          
          return (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected 
                  ? 'ring-2 ring-primary shadow-lg' 
                  : 'hover:shadow-md'
              } ${plan.popular ? 'scale-105' : ''}`}
              onClick={() => handlePlanSelect(plan.id)}
            >
              <CardHeader className="text-center relative">
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                    Mais popular
                  </Badge>
                )}
                
                <div className="flex justify-center mb-3">
                  <div className={`p-3 rounded-full ${
                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  }`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {plan.limitations.length > 0 && (
                  <div className="pt-2 border-t">
                    {plan.limitations.map((limitation, index) => (
                      <p key={index} className="text-xs text-muted-foreground">
                        {limitation}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center">
        <Button
          onClick={handleContinue}
          disabled={isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading ? "Salvando..." : "Começar grátis"}
        </Button>
        
        <p className="text-xs text-muted-foreground mt-4">
          O plano Free é gratuito para sempre. Você pode fazer upgrade a qualquer momento.
        </p>
      </div>
    </div>
  );
}