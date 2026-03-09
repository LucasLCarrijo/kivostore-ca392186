import { Megaphone, Package, Calendar, GraduationCap, RefreshCw, Link } from "lucide-react";
import type { ProductFormData } from "@/pages/CreateProduct";
import type { Database } from "@/integrations/supabase/types";

type ProductType = Database["public"]["Enums"]["product_type"];

interface Props {
  form: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
}

const PRODUCT_TYPES: {
  type: ProductType;
  icon: typeof Package;
  title: string;
  subtitle: string;
}[] = [
  {
    type: "LEAD_MAGNET",
    icon: Megaphone,
    title: "Coletar Emails/Aplicações",
    subtitle: "Capture leads com um lead magnet",
  },
  {
    type: "DIGITAL_PRODUCT",
    icon: Package,
    title: "Produto Digital",
    subtitle: "PDFs, Guias, Templates, eBooks",
  },
  {
    type: "COACHING_CALL",
    icon: Calendar,
    title: "Coaching Call",
    subtitle: "Consultorias e calls pagas",
  },
  {
    type: "ECOURSE",
    icon: GraduationCap,
    title: "eCourse",
    subtitle: "Crie e venda seu curso",
  },
  {
    type: "MEMBERSHIP",
    icon: RefreshCw,
    title: "Membership",
    subtitle: "Cobranças recorrentes",
  },
  {
    type: "LINK",
    icon: Link,
    title: "URL/Media",
    subtitle: "Link para site, YouTube, Spotify",
  },
];

export function ProductTypeStep({ form, updateForm }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">
        Que tipo de produto você quer criar?
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PRODUCT_TYPES.map(({ type, icon: Icon, title, subtitle }) => (
          <button
            key={type}
            onClick={() => updateForm({ type })}
            className={`flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-primary/60 hover:shadow-sm ${
              form.type === type
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card"
            }`}
          >
            <div
              className={`h-11 w-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
                form.type === type ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
