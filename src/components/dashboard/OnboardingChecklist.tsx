import { useEffect, useState } from "react";
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
        const { data: products } = await supabase
          .from("products")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .limit(1);

        // Get user's storefront to check theme
        const { data: userStorefront } = await supabase
          .from("storefronts")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .maybeSingle();

        const { data: theme } = userStorefront
          ? await supabase
              .from("storefront_themes")
              .select("id")
              .eq("storefront_id", userStorefront.id)
              .limit(1)
          : { data: null };

        const { data: sales } = await supabase
          .from("orders")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .eq("status", "PAID")
          .limit(1);

        const { data: storefront } = await supabase
          .from("storefronts")
          .select("is_published")
          .eq("workspace_id", currentWorkspace.id)
          .single();

        const items: ChecklistItem[] = [
          {
            id: "account",
            title: "Criar conta",
            description: "Conta criada com sucesso",
            completed: true,
          },
          {
            id: "product",
            title: "Criar primeiro produto",
            description: "Adicione um produto digital, lead magnet ou link",
            completed: (products?.length || 0) > 0,
            action: "Criar produto",
            href: "/store?tab=products",
          },
          {
            id: "customize",
            title: "Personalizar loja",
            description: "Escolha cores e template para sua storefront",
            completed: (theme?.length || 0) > 0,
            action: "Personalizar",
            href: "/store?tab=design",
          },
          {
            id: "publish",
            title: "Publicar loja",
            description: "Torne sua loja visível para clientes",
            completed: storefront?.is_published || false,
            action: "Publicar",
            href: "/store?tab=settings",
          },
          {
            id: "sale",
            title: "Fazer primeira venda",
            description: "Compartilhe sua loja e faça sua primeira venda",
            completed: (sales?.length || 0) > 0,
            action: "Compartilhar loja",
            href: "/store?tab=share",
          },
        ];

        setChecklist(items);
        setIsVisible(!items.every((item) => item.completed));
      } catch (error) {
        console.error("Erro ao verificar status do onboarding:", error);
      }
    };

    checkOnboardingStatus();
  }, [currentWorkspace]);

  if (!isVisible || checklist.every((item) => item.completed)) {
    return null;
  }

  const completedCount = checklist.filter((item) => item.completed).length;
  const totalCount = checklist.length;
  const progress = (completedCount / totalCount) * 100;

  return (
    <Card className="border-border/40 shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Complete sua configuração
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {completedCount} de {totalCount} etapas concluídas
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-secondary rounded-full h-1.5 mt-3">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1.5">
          {checklist.map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                !item.completed && "hover:bg-secondary/60",
              )}
            >
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs",
                  item.completed
                    ? "bg-primary text-primary-foreground"
                    : "border-2 border-border text-muted-foreground font-medium",
                )}
              >
                {item.completed ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  index + 1
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium",
                    item.completed
                      ? "text-muted-foreground line-through"
                      : "text-foreground",
                  )}
                >
                  {item.title}
                </p>
                {!item.completed && (
                  <p className="text-xs text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </div>

              {!item.completed && item.action && item.href && (
                <Button
                  asChild
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/5 shrink-0"
                >
                  <Link to={item.href}>{item.action}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
