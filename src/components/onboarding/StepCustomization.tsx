import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useToast } from "@/hooks/use-toast";

interface StepCustomizationProps {
  data?: {
    template: string;
    primary_color: string;
    background_color: string;
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  profileData: {
    display_name: string;
    bio: string;
    avatar_url?: string;
    username: string;
  };
  productData?: {
    name: string;
    price: number;
    thumbnail_url?: string;
  };
}

const TEMPLATES = [
  { key: 'minimal', label: 'Minimal', bg: 'bg-background', accent: 'bg-primary' },
  { key: 'bold', label: 'Bold', bg: 'bg-foreground', accent: 'bg-yellow-400' },
  { key: 'soft', label: 'Soft', bg: 'bg-rose-50', accent: 'bg-rose-400' },
  { key: 'dark', label: 'Dark', bg: 'bg-zinc-900', accent: 'bg-violet-500' },
  { key: 'earthy', label: 'Earthy', bg: 'bg-amber-50', accent: 'bg-amber-600' },
  { key: 'ocean', label: 'Ocean', bg: 'bg-cyan-50', accent: 'bg-cyan-600' },
];

const PRESET_COLORS = [
  { label: 'Kivo Red', value: '#F9423A' },
  { label: 'Violet', value: '#7C3AED' },
  { label: 'Ocean', value: '#0891B2' },
  { label: 'Forest', value: '#15803D' },
  { label: 'Amber', value: '#D97706' },
  { label: 'Pink', value: '#DB2777' },
];

export function StepCustomization({ data, onUpdate, onNext, profileData, productData }: StepCustomizationProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(data?.template || 'minimal');
  const [primaryColor, setPrimaryColor] = useState(data?.primary_color || '#F9423A');
  const [saving, setSaving] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!currentWorkspace) return;

    setSaving(true);

    try {
      // Get storefront id
      const { data: storefront, error: sfError } = await supabase
        .from('storefronts')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .single();

      if (sfError || !storefront) throw new Error("Storefront não encontrado");

      // Check if theme exists
      const { data: existingTheme } = await supabase
        .from('storefront_themes')
        .select('id')
        .eq('storefront_id', storefront.id)
        .maybeSingle();

      if (existingTheme) {
        await supabase
          .from('storefront_themes')
          .update({
            template_key: selectedTemplate,
            primary_color: primaryColor,
            background_color: '#ffffff',
          })
          .eq('id', existingTheme.id);
      } else {
        await supabase
          .from('storefront_themes')
          .insert({
            storefront_id: storefront.id,
            template_key: selectedTemplate,
            primary_color: primaryColor,
            background_color: '#ffffff',
          });
      }

      onUpdate({
        template: selectedTemplate,
        primary_color: primaryColor,
        background_color: '#ffffff',
      });

      onNext();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar a personalização",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const MobilePreview = () => (
    <div className="w-full max-w-[200px] mx-auto">
      <div 
        className="rounded-3xl overflow-hidden shadow-xl border-4 border-gray-800"
        style={{ aspectRatio: '9/19' }}
      >
        <div className="h-full flex flex-col" style={{ backgroundColor: primaryColor + '10' }}>
          {/* Notch */}
          <div className="flex justify-center pt-2">
            <div className="w-16 h-1 bg-gray-800 rounded-full" />
          </div>
          
          {/* Content */}
          <div className="flex-1 p-3 flex flex-col items-center">
            {/* Avatar */}
            <div 
              className="w-12 h-12 rounded-full mt-4 mb-2 flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {profileData.display_name.charAt(0) || 'K'}
            </div>
            
            <p className="font-semibold text-xs">{profileData.display_name || 'Seu Nome'}</p>
            <p className="text-[10px] text-center text-gray-500 mt-1 leading-tight">
              {profileData.bio || 'Sua bio aparece aqui'}
            </p>
            
            {/* Product */}
            {productData && (
              <div className="mt-3 w-full rounded-lg overflow-hidden border border-gray-200">
                {productData.thumbnail_url ? (
                  <img 
                    src={productData.thumbnail_url} 
                    alt={productData.name}
                    className="w-full h-12 object-cover"
                  />
                ) : (
                  <div 
                    className="w-full h-12"
                    style={{ backgroundColor: primaryColor + '30' }}
                  />
                )}
                <div className="p-1.5">
                  <p className="text-[9px] font-medium leading-tight">{productData.name}</p>
                  <p className="text-[9px]" style={{ color: primaryColor }}>
                    {productData.price > 0 
                      ? `R$ ${productData.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                      : 'Grátis'}
                  </p>
                </div>
              </div>
            )}

            {/* CTA */}
            <button 
              className="mt-3 w-full text-[9px] text-white font-medium py-1.5 rounded-full"
              style={{ backgroundColor: primaryColor }}
            >
              Ver minha loja
            </button>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center mt-2">Preview</p>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Personalize sua loja</h2>
        <p className="text-muted-foreground">
          Escolha o visual que combina com você
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        {/* Options */}
        <div className="space-y-8">
          {/* Templates */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Templates</Label>
            <div className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((template) => (
                <Card
                  key={template.key}
                  className={`cursor-pointer transition-all hover:shadow-md overflow-hidden ${
                    selectedTemplate === template.key ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedTemplate(template.key)}
                >
                  <div className={`${template.bg} h-16 p-2 relative`}>
                    <div className={`${template.accent} h-3 rounded-full w-3/4 mb-1`} />
                    <div className="bg-gray-300 h-2 rounded w-1/2 mb-1 opacity-50" />
                    <div className={`${template.accent} h-4 rounded-full w-2/3 mt-1 opacity-80`} />
                    {selectedTemplate === template.key && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs font-medium text-center">{template.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Color Picker */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Cor primária</Label>
            <div className="flex flex-wrap gap-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setPrimaryColor(color.value)}
                  className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                  style={{
                    backgroundColor: color.value,
                    borderColor: primaryColor === color.value ? color.value : 'transparent',
                    boxShadow: primaryColor === color.value ? `0 0 0 3px ${color.value}50` : 'none',
                  }}
                  title={color.label}
                />
              ))}
              <div className="relative">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-8 h-8 rounded-full cursor-pointer border-2 border-dashed border-muted-foreground"
                  title="Cor personalizada"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
            size="lg"
          >
            {saving ? "Salvando..." : "Salvar e continuar"}
          </Button>
        </div>

        {/* Mobile Preview */}
        <div className="flex justify-center lg:sticky lg:top-8">
          <MobilePreview />
        </div>
      </div>
    </div>
  );
}