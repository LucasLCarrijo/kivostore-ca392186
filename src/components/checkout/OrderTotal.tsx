import { formatCurrency } from "@/lib/utils";

interface OrderTotalProps {
  subtotal: number;
  discount: number;
  pixDiscount: number | null;
  bumpAmount: number;
  total: number;
  showPix: boolean;
}

export function OrderTotal({ subtotal, discount, pixDiscount, bumpAmount, total, showPix }: OrderTotalProps) {
  return (
    <div className="p-4 bg-card rounded-xl border space-y-2">
      <h2 className="text-base font-semibold text-foreground mb-2">Resumo</h2>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Desconto (cupom)</span>
          <span>-{formatCurrency(discount)}</span>
        </div>
      )}
      {showPix && pixDiscount && pixDiscount > 0 && (
        <div className="flex justify-between text-sm text-green-600">
          <span>Desconto PIX</span>
          <span>-{formatCurrency(pixDiscount)}</span>
        </div>
      )}
      {bumpAmount > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Order Bump</span>
          <span>+{formatCurrency(bumpAmount)}</span>
        </div>
      )}
      <div className="border-t pt-2 flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
