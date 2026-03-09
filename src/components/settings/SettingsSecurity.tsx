import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Shield, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";

const SESSIONS = [
  { location: "São Paulo, BR", device: "Chrome / macOS", ip: "189.69.xx.xx", time: "Agora" },
];

export function SettingsSecurity() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleDeleteAccount = () => {
    if (deleteConfirmText !== "EXCLUIR") return;
    toast({ title: "Solicitação enviada", description: "Sua conta será excluída em 30 dias." });
    setShowDeleteModal(false);
    setDeleteConfirmText("");
  };

  return (
    <div className="space-y-6">
      {/* 2FA */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verificação em Duas Etapas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Two-Factor Authentication (TOTP)</p>
              <p className="text-xs text-muted-foreground">Use um app autenticador como Google Authenticator</p>
            </div>
            <Switch checked={twoFaEnabled} onCheckedChange={setTwoFaEnabled} />
          </div>
          {twoFaEnabled && (
            <div className="mt-4 p-4 border border-border/50 rounded-lg bg-muted/30 text-center space-y-3">
              <div className="w-40 h-40 mx-auto bg-muted rounded-lg flex items-center justify-center text-sm text-muted-foreground">
                QR Code TOTP
              </div>
              <p className="text-xs text-muted-foreground">
                Escaneie o QR code com seu app autenticador para ativar a verificação em duas etapas.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sessions */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Sessões de Login</CardTitle>
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Todas as sessões foram encerradas" })}>
            <LogOut className="h-4 w-4 mr-2" />
            Encerrar todas
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Local</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Quando</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SESSIONS.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{s.location}</TableCell>
                  <TableCell className="text-sm">{s.device}</TableCell>
                  <TableCell className="text-sm font-mono">{s.ip}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{s.time}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Card className="bg-card border border-destructive/30 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Excluir Conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Essa ação é permanente. Todos os seus dados, produtos, clientes e receita serão excluídos irreversivelmente.
          </p>
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setShowDeleteModal(true)}
          >
            Delete My Account
          </Button>
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Digite <strong>EXCLUIR</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder='Digite "EXCLUIR"'
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancelar</Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== "EXCLUIR"}
              onClick={handleDeleteAccount}
            >
              Excluir Minha Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}