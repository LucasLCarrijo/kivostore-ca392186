import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, DollarSign } from "lucide-react";

export function SettingsPayments() {
  const [gdprConsent, setGdprConsent] = useState(false);
  const [termsEnabled, setTermsEnabled] = useState(false);
  const [termsText, setTermsText] = useState("");
  const [checkoutLang, setCheckoutLang] = useState("pt-BR");

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Métodos de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Pagar.me</p>
                <p className="text-xs text-muted-foreground">Gateway de pagamento brasileiro — PIX, cartão, boleto</p>
              </div>
            </div>
            <Badge variant="secondary">Não conectado</Badge>
          </div>

          <div className="flex items-center justify-between p-4 border border-border/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Stripe</p>
                <p className="text-xs text-muted-foreground">Pagamentos internacionais via cartão</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Registrar</Button>
          </div>

          <button className="text-sm text-primary hover:underline">+ Adicionar PayPal</button>
        </CardContent>
      </Card>

      {/* Checkout Settings */}
      <Card className="bg-card border border-border/50 shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Configurações do Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Marketing Consent (GDPR)</p>
              <p className="text-xs text-muted-foreground">Solicitar consentimento de marketing no checkout</p>
            </div>
            <Switch checked={gdprConsent} onCheckedChange={setGdprConsent} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Termos & Condições</p>
                <p className="text-xs text-muted-foreground">Exigir aceite de termos no checkout</p>
              </div>
              <Switch checked={termsEnabled} onCheckedChange={setTermsEnabled} />
            </div>
            {termsEnabled && (
              <Textarea
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                placeholder="Cole seus termos e condições aqui..."
                className="min-h-[120px]"
              />
            )}
          </div>

          <div className="space-y-2">
            <Label>Idioma do Checkout</Label>
            <Select value={checkoutLang} onValueChange={setCheckoutLang}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}