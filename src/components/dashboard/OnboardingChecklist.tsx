import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: string;
  href?: string;
}

export function OnboardingChecklist() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [isVisible, setIsVisible] = useState(true);
  const { currentWorkspace } = useWorkspace();

  useEffect(() => {
    if (!currentWorkspace) return;

    const checkOnboardingStatus = async () => {
      try {
        // Verificar se tem produtos
        const { data: products } = await supabase
          .from('products')
          .select('id')
          .eq('workspace_id', currentWorkspace.id)
          .limit(1);

        // Verificar se tem storefront personalizado
        const { data: theme } = await supabase
          .from('storefront_themes')
          .select('id')
          .limit(1);

        // Verificar se tem vendas
        const { data: sales } = await supabase
          .from('orders')
          .select('id')
          .eq('workspace_id', currentWorkspace.id)
          .eq('status', 'PAID')
          .limit(1);

        // Verificar se storefront está publicado
        const { data: storefront } = await supabase
          .from('storefronts')
          .select('is_published')
          .eq('workspace_id', currentWorkspace.id)
          .single();

        const items: ChecklistItem[] = [
          {
            id: 'account',
            title: 'Criar conta',
            description: 'Conta criada com sucesso',
            completed: true,
          },
          {
            id: 'product',
            title: 'Criar primeiro produto',
            description: 'Adicione um produto digital, lead magnet ou link',
            completed: (products?.length || 0) > 0,
            action: 'Criar produto',
            href: '/store?tab=products',
          },
          {
            id: 'customize',
            title: 'Personalizar loja',
            description: 'Escolha cores e template para sua storefront',
            completed: (theme?.length || 0) > 0,
            action: 'Personalizar',
            href: '/store?tab=design',
          },
          {
            id: 'publish',
            title: 'Publicar loja',
            description: 'Torne sua loja visível para clientes',
            completed: storefront?.is_published || false,
            action: 'Publicar',
            href: '/store?tab=settings',
          },
          {
            id: 'sale',
            title: 'Fazer primeira venda',
            description: 'Compartilhe sua loja e faça sua primeira venda',
            completed: (sales?.length || 0) > 0,
            action: 'Compartilhar loja',
            href: '/store?tab=share',
          },
        ];

        setChecklist(items);

        // Ocultar checklist se tudo estiver completo
        const allCompleted = items.every(item => item.completed);
        setIsVisible(!allCompleted);
      } catch (error) {
        console.error('Erro ao verificar status do onboarding:', error);
      }
    };

    checkOnboardingStatus();
  }, [currentWorkspace]);

  if (!isVisible || checklist.every(item => item.completed)) {
    return null;
  }

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Card className="bg-white border border-border/50 shadow-sm rounded-xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Complete sua configuração</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount} de {totalCount} etapas concluídas
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mt-3">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/30 hover:border-border/60 transition-colors"
            >
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center",
                item.completed 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {item.completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <span className="text-xs font-semibold">
                    {checklist.indexOf(item) + 1}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-medium",
                  item.completed ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {item.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>

              {!item.completed && item.action && item.href && (
                <Button asChild size="sm" variant="outline">
                  <Link to={item.href}>
                    {item.action}
                  </Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}