import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const { currentWorkspace, workspaceMembership } = useWorkspace();

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo ao Kivo!</h1>
        <p className="text-muted-foreground">
          Gerencie sua loja digital e acompanhe suas vendas
        </p>
      </div>

      {/* Workspace Info */}
      {currentWorkspace && (
        <Card className="card-radius shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {currentWorkspace.name}
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {workspaceMembership?.role}
              </span>
            </CardTitle>
            <CardDescription>
              /{currentWorkspace.slug} • {currentWorkspace.currency} • {currentWorkspace.timezone}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sua loja digital está pronta! Configure seus produtos e comece a vender.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-radius shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
            <span className="text-2xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 0,00</div>
            <p className="text-xs text-muted-foreground">
              Suas primeiras vendas aparecerão aqui
            </p>
          </CardContent>
        </Card>

        <Card className="card-radius shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Adicione seus primeiros produtos
            </p>
          </CardContent>
        </Card>

        <Card className="card-radius shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Visitantes</CardTitle>
            <span className="text-2xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Compartilhe sua loja para começar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Getting Started */}
      <Card className="card-radius shadow-sm">
        <CardHeader>
          <CardTitle>Primeiros Passos</CardTitle>
          <CardDescription>
            Configure sua loja em poucos minutos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              1
            </div>
            <div className="flex-1">
              <p className="font-medium">Configure seu perfil</p>
              <p className="text-sm text-muted-foreground">
                Adicione foto, bio e informações de contato
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
              2
            </div>
            <div className="flex-1">
              <p className="font-medium">Adicione seus produtos</p>
              <p className="text-sm text-muted-foreground">
                Cursos, ebooks, consultoria ou qualquer produto digital
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
              3
            </div>
            <div className="flex-1">
              <p className="font-medium">Compartilhe sua loja</p>
              <p className="text-sm text-muted-foreground">
                Divulgue nas redes sociais e comece a vender
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}