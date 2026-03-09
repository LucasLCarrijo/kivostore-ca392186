import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Package, FileText, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StepProductProps {
  data?: {
    type: 'DIGITAL_PRODUCT' | 'LEAD_MAGNET' | 'LINK';
    name: string;
    price: number;
    thumbnail_url?: string;
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  workspaceId: string;
}

const PRODUCT_TYPES = [
  {
    id: 'DIGITAL_PRODUCT' as const,
    label: 'Produto Digital',
    desc: 'eBook, curso, template...',
    icon: Package,
  },
  {
    id: 'LEAD_MAGNET' as const,
    label: 'Lead Magnet',
    desc: 'Conteúdo gratuito para captar leads',
    icon: FileText,
  },
  {
    id: 'LINK' as const,
    label: 'Link',
    desc: 'Redirecionamento para outro recurso',
    icon: Link2,
  },
];

export function StepProduct({ data, onUpdate, onNext, workspaceId }: StepProductProps) {
  const [step, setStep] = useState<'type' | 'details'>('type');
  const [productType, setProductType] = useState<'DIGITAL_PRODUCT' | 'LEAD_MAGNET' | 'LINK'>(
    data?.type || 'DIGITAL_PRODUCT'
  );
  const [name, setName] = useState(data?.name || '');
  const [price, setPrice] = useState(data?.price?.toString() || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(data?.thumbnail_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const formatPrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (!numbers) return '';
    const amount = parseInt(numbers) / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parsePrice = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers ? parseInt(numbers) / 100 : 0;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPrice(e.target.value);
    setPrice(formatted);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `products/${workspaceId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      setThumbnailUrl(publicUrl);
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer upload da imagem",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const generateSlug = (productName: string) => {
    return productName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Insira um nome para o produto",
        variant: "destructive",
      });
      return;
    }

    if (!workspaceId) {
      toast({
        title: "Erro",
        description: "Workspace não encontrado",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const slug = generateSlug(name);
      const priceAmount = productType === 'LEAD_MAGNET' ? 0 : parsePrice(price);

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          workspace_id: workspaceId,
          type: productType,
          name,
          slug,
          status: 'DRAFT',
          thumbnail_url: thumbnailUrl || null,
        })
        .select()
        .single();

      if (productError) throw productError;

      const { error: priceError } = await supabase
        .from('prices')
        .insert({
          product_id: product.id,
          amount: priceAmount,
          currency: 'BRL',
          type: 'ONE_TIME',
          is_default: true,
        });

      if (priceError) throw priceError;

      onUpdate({
        type: productType,
        name,
        price: priceAmount,
        thumbnail_url: thumbnailUrl,
      });

      onNext();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o produto",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Crie seu primeiro produto</h2>
        <p className="text-muted-foreground">
          Vamos configurar o que você vai vender
        </p>
      </div>

      {step === 'type' ? (
        <div className="space-y-4">
          <div className="grid gap-4">
            {PRODUCT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = productType === type.id;
              
              return (
                <Card
                  key={type.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setProductType(type.id)}
                >
                  <CardContent className="flex items-center p-4 space-x-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.desc}</p>
                    </div>
                    {isSelected && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <Button onClick={() => setStep('details')} className="w-full" size="lg">
            Continuar
          </Button>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productName">Nome do produto *</Label>
              <Input
                id="productName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Guia Completo de Marketing Digital"
              />
            </div>

            {productType !== 'LEAD_MAGNET' && (
              <div className="space-y-2">
                <Label htmlFor="price">Preço</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                    R$
                  </span>
                  <Input
                    id="price"
                    value={price}
                    onChange={handlePriceChange}
                    placeholder="0,00"
                    className="rounded-l-none"
                  />
                </div>
              </div>
            )}

            {productType === 'LEAD_MAGNET' && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  Lead Magnets são gratuitos — é a sua isca digital para captar contatos.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Imagem de capa</Label>
              
              {thumbnailUrl ? (
                <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                  <img
                    src={thumbnailUrl}
                    alt="Capa do produto"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="absolute bottom-2 right-2"
                    onClick={() => document.getElementById('thumbnail')?.click()}
                  >
                    Alterar
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => document.getElementById('thumbnail')?.click()}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {uploading ? "Enviando..." : "Clique para adicionar uma imagem"}
                  </p>
                </div>
              )}
              
              <input
                type="file"
                id="thumbnail"
                accept="image/*"
                onChange={handleThumbnailUpload}
                className="hidden"
              />
            </div>

            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setStep('type')}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1"
              >
                {saving ? "Salvando..." : "Criar produto"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}