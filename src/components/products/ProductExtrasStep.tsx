import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { ProductFormData } from "@/pages/CreateProduct";

interface Props {
  form: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
}

export function ProductExtrasStep({ form, updateForm }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Configure opções extras para maximizar suas vendas.
      </p>

      {/* Order Bump */}
      <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Order Bump</p>
            <p className="text-sm text-muted-foreground">
              Ofereça um produto adicional no checkout
            </p>
          </div>
          <Switch
            checked={form.orderBumpEnabled}
            onCheckedChange={(c) => updateForm({ orderBumpEnabled: c })}
          />
        </div>
        {form.orderBumpEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">Headline do bump</Label>
              <Input
                placeholder="Adicione também..."
                value={form.orderBumpHeadline}
                onChange={(e) => updateForm({ orderBumpHeadline: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Upsell */}
      <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Upsell pós-compra</p>
            <p className="text-sm text-muted-foreground">
              Ofereça um upgrade após a compra
            </p>
          </div>
          <Switch
            checked={form.upsellEnabled}
            onCheckedChange={(c) => updateForm({ upsellEnabled: c })}
          />
        </div>
        {form.upsellEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">Preço especial do upsell (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={form.upsellPrice || ""}
                onChange={(e) => updateForm({ upsellPrice: Number(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Affiliates */}
      <div className="space-y-4 p-4 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Programa de Afiliados</p>
            <p className="text-sm text-muted-foreground">
              Permita que outros promovam seu produto
            </p>
          </div>
          <Switch
            checked={form.affiliateEnabled}
            onCheckedChange={(c) => updateForm({ affiliateEnabled: c })}
          />
        </div>
        {form.affiliateEnabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs">Comissão (%)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={form.affiliateCommission}
                onChange={(e) => updateForm({ affiliateCommission: Number(e.target.value) })}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
