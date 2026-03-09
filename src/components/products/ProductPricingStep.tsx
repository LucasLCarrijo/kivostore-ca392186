import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProductFormData } from "@/pages/CreateProduct";

interface Props {
  form: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
}

export function ProductPricingStep({ form, updateForm }: Props) {
  const handlePriceChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "");
    updateForm({ price: Number(cleaned) / 100 });
  };

  const handleCompareChange = (value: string) => {
    const cleaned = value.replace(/[^\d]/g, "");
    const num = Number(cleaned) / 100;
    updateForm({ compareAtPrice: num > 0 ? num : null });
  };

  const formatInputPrice = (val: number) => {
    if (!val) return "";
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      {/* Free toggle */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
        <div>
          <p className="font-medium text-foreground">Este é um produto gratuito</p>
          <p className="text-sm text-muted-foreground">Ideal para lead magnets</p>
        </div>
        <Switch
          checked={form.isFree}
          onCheckedChange={(checked) => updateForm({ isFree: checked })}
        />
      </div>

      {!form.isFree && (
        <>
          {/* Price */}
          <div className="space-y-2">
            <Label>Preço (R$) *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                className="pl-10"
                placeholder="0,00"
                value={formatInputPrice(form.price)}
                onChange={(e) => handlePriceChange(e.target.value)}
              />
            </div>
          </div>

          {/* Compare at price */}
          <div className="space-y-2">
            <Label>Preço comparativo (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Mostra o preço original riscado: "De R$197 por R$97"
            </p>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                R$
              </span>
              <Input
                className="pl-10"
                placeholder="0,00"
                value={formatInputPrice(form.compareAtPrice || 0)}
                onChange={(e) => handleCompareChange(e.target.value)}
              />
            </div>
          </div>

          {/* PIX discount */}
          <div className="space-y-2">
            <Label>Desconto PIX % (opcional)</Label>
            <p className="text-xs text-muted-foreground">
              Ofereça um desconto para pagamento via PIX
            </p>
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="Ex: 10"
                value={form.pixDiscount ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  updateForm({ pixDiscount: v });
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                %
              </span>
            </div>
          </div>

          {/* Max installments */}
          <div className="space-y-2">
            <Label>Parcelamento máximo</Label>
            <Select
              value={String(form.maxInstallments)}
              onValueChange={(v) => updateForm({ maxInstallments: Number(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}x {n === 1 ? "(à vista)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}
