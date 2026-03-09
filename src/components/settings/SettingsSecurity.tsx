import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, Shield, LogOut, Loader2, CheckCircle, Copy, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const SESSIONS = [
  { location: "São Paulo, BR", device: "Chrome / macOS", ip: "189.69.xx.xx", time: "Agora" },
];

type MfaSetupStep = "idle" | "enrolling" | "verifying" | "enabled";

export function SettingsSecurity() {
  const { signOut } = useAuth();
  const { toast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // MFA state
  const [mfaStep, setMfaStep] = useState<MfaSetupStep>("idle");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [qrCode, setQrCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);

  // Check current MFA status
  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedTotp = data.totp?.find(f => f.status === "verified");
      if (verifiedTotp) {
        setMfaEnabled(true);
        setFactorId(verifiedTotp.id);
        setMfaStep("enabled");
      } else {
        setMfaEnabled(false);
        setMfaStep("idle");
      }
    } catch (err) {
      console.error("Error checking MFA status:", err);
    } finally {
      setMfaLoading(false);
    }
  };

  const handleEnrollMfa = async () => {
    setMfaStep("enrolling");
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Kivo Authenticator",
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setFactorId(data.id);
      setMfaStep("verifying");
    } catch (err: any) {
      toast({
        title: "Erro ao configurar 2FA",
        description: err.message || "Não foi possível iniciar a configuração.",
        variant: "destructive",
      });
      setMfaStep("idle");
    }
  };

  const handleVerifyMfa = async () => {
    if (verifyCode.length !== 6) return;
    setVerifying(true);

    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      setMfaEnabled(true);
      setMfaStep("enabled");
      setVerifyCode("");
      toast({
        title: "2FA ativado!",
        description: "A verificação em duas etapas foi habilitada com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Código inválido",
        description: err.message || "O código informado está incorreto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfa = async () => {
    setDisabling(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (error) throw error;

      setMfaEnabled(false);
      setMfaStep("idle");
      setShowDisableModal(false);
      setDisableCode("");
      setQrCode("");
      setTotpSecret("");
      toast({
        title: "2FA desativado",
        description: "A verificação em duas etapas foi removida.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao desativar 2FA",
        description: err.message || "Não foi possível desativar.",
        variant: "destructive",
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleCancelEnroll = async () => {
    // Unenroll the pending factor
    if (factorId && !mfaEnabled) {
      await supabase.auth.mfa.unenroll({ factorId }).catch(() => {});
    }
    setMfaStep("idle");
    setQrCode("");
    setTotpSecret("");
    setVerifyCode("");
  };

  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

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
        <CardContent className="space-y-4">
          {mfaLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando status do 2FA...
            </div>
          ) : mfaStep === "idle" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication (TOTP)</p>
                  <p className="text-xs text-muted-foreground">Use um app autenticador como Google Authenticator</p>
                </div>
                <Button onClick={handleEnrollMfa} size="sm" className="gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Ativar 2FA
                </Button>
              </div>
            </>
          ) : mfaStep === "verifying" ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Configurar Google Authenticator
              </div>

              {/* Step 1: QR Code */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">1.</strong> Escaneie o QR code abaixo com seu app autenticador:
                </p>
                <div className="flex justify-center">
                  <div className="p-4 bg-background border border-border rounded-lg">
                    <img
                      src={qrCode}
                      alt="QR Code TOTP"
                      className="w-48 h-48"
                    />
                  </div>
                </div>
              </div>

              {/* Manual entry */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">2.</strong> Ou insira o código manualmente:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2.5 bg-muted rounded-md text-xs font-mono text-foreground break-all select-all">
                    {totpSecret}
                  </code>
                  <Button variant="outline" size="sm" onClick={copySecret} className="shrink-0 gap-1.5">
                    {secretCopied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {secretCopied ? "Copiado" : "Copiar"}
                  </Button>
                </div>
              </div>

              {/* Step 3: Verify code */}
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">3.</strong> Digite o código de 6 dígitos do app:
                </p>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={verifyCode}
                    onChange={setVerifyCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancelEnroll} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleVerifyMfa}
                  disabled={verifyCode.length !== 6 || verifying}
                  className="flex-1 gap-2"
                >
                  {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                  {verifying ? "Verificando..." : "Ativar 2FA"}
                </Button>
              </div>
            </div>
          ) : mfaStep === "enabled" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">2FA está ativo</p>
                    <p className="text-xs text-muted-foreground">Sua conta está protegida com verificação em duas etapas</p>
                  </div>
                </div>
                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
                  Ativo
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
                onClick={() => setShowDisableModal(true)}
              >
                <ShieldOff className="h-4 w-4" />
                Desativar 2FA
              </Button>
            </div>
          ) : null}
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

      {/* Disable 2FA Modal */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldOff className="h-5 w-5 text-destructive" />
              Desativar 2FA
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar a verificação em duas etapas? Sua conta ficará menos segura.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDisableModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableMfa}
              disabled={disabling}
              className="gap-2"
            >
              {disabling && <Loader2 className="h-4 w-4 animate-spin" />}
              {disabling ? "Desativando..." : "Desativar 2FA"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
