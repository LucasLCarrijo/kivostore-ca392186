import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ProductFormData } from "@/pages/CreateProduct";

interface Props {
  form: ProductFormData;
  updateForm: (updates: Partial<ProductFormData>) => void;
}

export function ProductDeliveryStep({ form, updateForm }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const path = `deliveries/${Date.now()}-${file.name}`;
          const { error } = await supabase.storage.from("private-files").upload(path, file);
          if (error) throw error;
          return { name: file.name, url: path, size: file.size };
        })
      );
      updateForm({ deliveryFiles: [...form.deliveryFiles, ...uploaded] });
      toast.success(`${uploaded.length} arquivo(s) enviado(s)`);
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    updateForm({ deliveryFiles: form.deliveryFiles.filter((_, i) => i !== index) });
  };

  // Render based on product type
  if (form.type === "LINK") {
    return (
      <div className="space-y-4">
        <Label>URL externa</Label>
        <p className="text-sm text-muted-foreground">Cole o link que será entregue ao comprador</p>
        <Input
          placeholder="https://..."
          value={form.deliveryUrl}
          onChange={(e) => updateForm({ deliveryUrl: e.target.value })}
        />
      </div>
    );
  }

  if (form.type === "COACHING_CALL") {
    return (
      <div className="space-y-4">
        <Label>URL de agendamento</Label>
        <p className="text-sm text-muted-foreground">
          Cole o link do Calendly, Cal.com ou outro sistema de agendamento
        </p>
        <Input
          placeholder="https://calendly.com/..."
          value={form.deliveryUrl}
          onChange={(e) => updateForm({ deliveryUrl: e.target.value })}
        />
      </div>
    );
  }

  if (form.type === "ECOURSE") {
    return (
      <div className="space-y-4 text-center py-10">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <ExternalLink className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Course Builder</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Após criar o produto, você poderá montar os módulos e aulas no Course Builder.
        </p>
      </div>
    );
  }

  // DIGITAL_PRODUCT, LEAD_MAGNET, MEMBERSHIP — file upload
  return (
    <div className="space-y-4">
      <Label>
        {form.type === "LEAD_MAGNET" ? "Arquivo de recompensa" : "Arquivos do produto"}
      </Label>
      <p className="text-sm text-muted-foreground">
        Faça upload dos arquivos que serão entregues ao comprador
      </p>

      {/* Uploaded files */}
      {form.deliveryFiles.length > 0 && (
        <div className="space-y-2">
          {form.deliveryFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(i)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload area */}
      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
        <span className="text-sm text-muted-foreground">
          {uploading ? "Enviando..." : "Arraste ou clique para enviar arquivos"}
        </span>
        <span className="text-xs text-muted-foreground mt-1">Até 2GB por arquivo</span>
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
          disabled={uploading}
        />
      </label>
    </div>
  );
}
