import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import type { StorefrontTheme } from "@/pages/StorefrontEditor";

const TEMPLATES = [
  { key: 'minimal', name: 'Minimal', colors: ['#ffffff', '#1a1a1a'] },
  { key: 'dark', name: 'Dark', colors: ['#1a1a1a', '#ffffff'] },
  { key: 'coral', name: 'Coral', colors: ['#FFF5F5', '#F9423A'] },
  { key: 'ocean', name: 'Ocean', colors: ['#E0F2FE', '#0284C7'] },
  { key: 'forest', name: 'Forest', colors: ['#ECFDF5', '#059669'] },
  { key: 'sunset', name: 'Sunset', colors: ['#FEF3C7', '#D97706'] },
  { key: 'lavender', name: 'Lavender', colors: ['#F3E8FF', '#9333EA'] },
  { key: 'slate', name: 'Slate', colors: ['#F1F5F9', '#475569'] },
];

const FONTS = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Space Grotesk', label: 'Space Grotesk' },
  { value: 'DM Sans', label: 'DM Sans' },
];

const BUTTON_STYLES = [
  { value: 'rounded', label: 'Arredondado' },
  { value: 'pill', label: 'Pílula' },
  { value: 'square', label: 'Quadrado' },
];

interface ThemeSectionProps {
  theme: StorefrontTheme | null | undefined;
  storefrontId: string;
  onUpdate: (data: Partial<StorefrontTheme>) => void;
}

export function ThemeSection({ theme, storefrontId, onUpdate }: ThemeSectionProps) {
  const [currentTheme, setCurrentTheme] = useState<Partial<StorefrontTheme>>({
    template_key: theme?.template_key || 'minimal',
    primary_color: theme?.primary_color || '#F9423A',
    secondary_color: theme?.secondary_color || '#1a1a1a',
    background_color: theme?.background_color || '#ffffff',
    text_color: theme?.text_color || '#1a1a1a',
    font_heading: theme?.font_heading || 'Inter',
    font_body: theme?.font_body || 'Inter',
    button_style: theme?.button_style || 'rounded',
  });

  useEffect(() => {
    if (theme) {
      setCurrentTheme({
        template_key: theme.template_key || 'minimal',
        primary_color: theme.primary_color || '#F9423A',
        secondary_color: theme.secondary_color || '#1a1a1a',
        background_color: theme.background_color || '#ffffff',
        text_color: theme.text_color || '#1a1a1a',
        font_heading: theme.font_heading || 'Inter',
        font_body: theme.font_body || 'Inter',
        button_style: theme.button_style || 'rounded',
      });
    }
  }, [theme]);

  const handleChange = (field: keyof StorefrontTheme, value: string) => {
    const updated = { ...currentTheme, [field]: value };
    setCurrentTheme(updated);
    onUpdate(updated);
  };

  const handleTemplateSelect = (templateKey: string) => {
    const template = TEMPLATES.find(t => t.key === templateKey);
    if (template) {
      const updated = {
        ...currentTheme,
        template_key: templateKey,
        background_color: template.colors[0],
        primary_color: template.colors[1],
        text_color: template.key === 'dark' ? '#ffffff' : '#1a1a1a',
      };
      setCurrentTheme(updated);
      onUpdate(updated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div className="space-y-3">
        <Label>Templates</Label>
        <div className="grid grid-cols-4 gap-2">
          {TEMPLATES.map((template) => (
            <button
              key={template.key}
              onClick={() => handleTemplateSelect(template.key)}
              className={cn(
                "aspect-square rounded-lg border-2 p-1 transition-all",
                currentTheme.template_key === template.key
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              )}
            >
              <div 
                className="w-full h-full rounded flex flex-col items-center justify-center gap-1"
                style={{ backgroundColor: template.colors[0] }}
              >
                <div 
                  className="w-6 h-1 rounded-full"
                  style={{ backgroundColor: template.colors[1] }}
                />
                <div 
                  className="w-8 h-1 rounded-full opacity-50"
                  style={{ backgroundColor: template.colors[1] }}
                />
                <div 
                  className="w-4 h-1 rounded-full opacity-30"
                  style={{ backgroundColor: template.colors[1] }}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div className="space-y-3">
        <Label>Cores</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primária</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTheme.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={currentTheme.primary_color}
                onChange={(e) => handleChange('primary_color', e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fundo</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTheme.background_color}
                onChange={(e) => handleChange('background_color', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={currentTheme.background_color}
                onChange={(e) => handleChange('background_color', e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Texto</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTheme.text_color}
                onChange={(e) => handleChange('text_color', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={currentTheme.text_color}
                onChange={(e) => handleChange('text_color', e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Secundária</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={currentTheme.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer"
              />
              <Input
                value={currentTheme.secondary_color}
                onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="flex-1 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div className="space-y-3">
        <Label>Tipografia</Label>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Fonte</Label>
            <Select
              value={currentTheme.font_body}
              onValueChange={(value) => {
                handleChange('font_body', value);
                handleChange('font_heading', value);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((font) => (
                  <SelectItem 
                    key={font.value} 
                    value={font.value}
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Button Style */}
      <div className="space-y-3">
        <Label>Estilo dos Botões</Label>
        <RadioGroup
          value={currentTheme.button_style}
          onValueChange={(value) => handleChange('button_style', value)}
          className="flex gap-4"
        >
          {BUTTON_STYLES.map((style) => (
            <div key={style.value} className="flex items-center space-x-2">
              <RadioGroupItem value={style.value} id={style.value} />
              <Label 
                htmlFor={style.value} 
                className="cursor-pointer font-normal"
              >
                {style.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Button Preview */}
        <div className="flex gap-2 pt-2">
          <button
            className={cn(
              "px-4 py-2 text-sm font-medium text-white",
              currentTheme.button_style === 'rounded' && "rounded-lg",
              currentTheme.button_style === 'pill' && "rounded-full",
              currentTheme.button_style === 'square' && "rounded-none"
            )}
            style={{ backgroundColor: currentTheme.primary_color }}
          >
            Exemplo
          </button>
        </div>
      </div>
    </div>
  );
}
