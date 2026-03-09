import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

export default function Onboarding() {
  const [workspaceName, setWorkspaceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { createWorkspace } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para sua loja",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const workspace = await createWorkspace(workspaceName.trim());
      
      if (workspace) {
        toast({
          title: "Loja criada!",
          description: "Sua loja digital foi configurada com sucesso",
        });
        navigate('/dashboard');
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível criar sua loja. Tente novamente.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 kivo-gradient">
      <Card className="w-full max-w-md card-radius shadow-sm bg-white">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Bem-vindo ao Kivo!</CardTitle>
          <CardDescription>
            Vamos criar sua loja digital em menos de 1 minuto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-accent" />
              <span className="text-sm">Venda produtos digitais sem complicação</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-accent" />
              <span className="text-sm">Receba pagamentos via PIX e cartão</span>
            </div>
            <div className="flex items-center space-x-3">
              <Check className="h-5 w-5 text-accent" />
              <span className="text-sm">Acompanhe suas vendas em tempo real</span>
            </div>
          </div>

          <form onSubmit={handleCreateWorkspace} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspaceName">Nome da sua loja</Label>
              <Input
                id="workspaceName"
                type="text"
                placeholder="Ex: Loja da Maria, Cursos do João..."
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="input-radius"
                required
              />
              <p className="text-xs text-muted-foreground">
                Você poderá alterar isso depois nas configurações
              </p>
            </div>

            <Button
              type="submit"
              className="w-full pill-radius"
              disabled={isLoading}
            >
              {isLoading ? "Criando sua loja..." : "Criar minha loja grátis"}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Ao continuar, você concorda com nossos{" "}
              <a href="/terms" className="text-primary hover:underline">
                Termos de Uso
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}