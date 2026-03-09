import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCPF, formatPhone } from "@/lib/cpf";

interface CustomerData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

interface CustomerFormProps {
  data: CustomerData;
  onChange: (data: CustomerData) => void;
  onEmailBlur: () => void;
  errors: Record<string, string>;
}

export function CustomerForm({ data, onChange, onEmailBlur, errors }: CustomerFormProps) {
  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border">
      <h2 className="text-base font-semibold text-foreground">Seus dados</h2>
      
      <div className="space-y-1">
        <Label htmlFor="name" className="text-sm">Nome completo *</Label>
        <Input
          id="name"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder="Seu nome completo"
          className="h-12"
        />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="email" className="text-sm">Email *</Label>
        <Input
          id="email"
          type="email"
          value={data.email}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          onBlur={onEmailBlur}
          placeholder="seu@email.com"
          className="h-12"
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="cpf" className="text-sm">CPF *</Label>
        <Input
          id="cpf"
          value={data.cpf}
          onChange={(e) => onChange({ ...data, cpf: formatCPF(e.target.value) })}
          placeholder="000.000.000-00"
          className="h-12"
          inputMode="numeric"
        />
        {errors.cpf && <p className="text-xs text-destructive">{errors.cpf}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone" className="text-sm">WhatsApp (opcional)</Label>
        <Input
          id="phone"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: formatPhone(e.target.value) })}
          placeholder="(11) 99999-9999"
          className="h-12"
          inputMode="tel"
        />
      </div>
    </div>
  );
}
