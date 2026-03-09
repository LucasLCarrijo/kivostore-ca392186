import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StepProfileProps {
  data: {
    avatar_url?: string;
    display_name: string;
    bio: string;
    username: string;
  };
  onUpdate: (data: any) => void;
  onNext: () => void;
  user: any;
}

export function StepProfile({ data, onUpdate, onNext, user }: StepProfileProps) {
  const [formData, setFormData] = useState(data);
  const [uploading, setUploading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'checking' | 'available' | 'taken' | null>(null);
  const [isValid, setIsValid] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Pre-fill with user data
    if (user && !formData.display_name) {
      setFormData(prev => ({
        ...prev,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || "",
      }));
    }
  }, [user]);

  useEffect(() => {
    // Validate form
    const isFormValid = 
      formData.display_name.trim() && 
      formData.username.trim() && 
      usernameStatus === 'available';
    
    setIsValid(isFormValid);
  }, [formData, usernameStatus]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatars/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      onUpdate({ ...formData, avatar_url: publicUrl });
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

  const checkUsernameAvailability = async (username: string) => {
    if (!username.trim()) {
      setUsernameStatus(null);
      return;
    }

    // Validate username format
    if (!/^[a-z0-9_]+$/.test(username)) {
      setUsernameStatus('taken');
      return;
    }

    setUsernameStatus('checking');

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .select('slug')
        .eq('slug', username)
        .maybeSingle();

      if (error) throw error;

      setUsernameStatus(data ? 'taken' : 'available');
    } catch (error) {
      setUsernameStatus('taken');
    }
  };

  useEffect(() => {
    if (formData.username) {
      const timeout = setTimeout(() => {
        checkUsernameAvailability(formData.username);
      }, 500);

      return () => clearTimeout(timeout);
    }
  }, [formData.username]);

  const handleSubmit = async () => {
    if (!isValid) return;

    try {
      // Update workspace
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: formData.display_name,
          slug: formData.username,
        })
        .eq('id', user?.app_metadata?.workspace_id);

      if (error) throw error;

      // Update storefront
      await supabase
        .from('storefronts')
        .update({
          title: formData.display_name,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
        })
        .eq('slug', formData.username);

      onUpdate(formData);
      onNext();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar o perfil",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Crie seu perfil</CardTitle>
        <p className="text-muted-foreground text-center">
          Vamos personalizar sua presença digital
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center space-y-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={formData.avatar_url} />
            <AvatarFallback className="text-lg">
              {formData.display_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div>
            <input
              type="file"
              id="avatar"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('avatar')?.click()}
              disabled={uploading}
              className="flex items-center space-x-2"
            >
              <Upload className="h-4 w-4" />
              <span>{uploading ? "Enviando..." : "Adicionar foto"}</span>
            </Button>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome de exibição *</Label>
          <Input
            id="displayName"
            value={formData.display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
            placeholder="Como você quer ser conhecido"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Conte um pouco sobre você..."
            maxLength={160}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">
            {formData.bio.length}/160 caracteres
          </p>
        </div>

        {/* Username */}
        <div className="space-y-2">
          <Label htmlFor="username">Username *</Label>
          <div className="relative">
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground">
                @
              </span>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setFormData(prev => ({ ...prev, username: value }));
                }}
                placeholder="meuusername"
                className="rounded-l-none"
              />
            </div>
            
            {usernameStatus && formData.username && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                )}
                {usernameStatus === 'available' && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {usernameStatus === 'taken' && (
                  <X className="h-4 w-4 text-red-500" />
                )}
              </div>
            )}
          </div>
          
          {formData.username && usernameStatus && (
            <p className={`text-xs ${
              usernameStatus === 'available' 
                ? 'text-green-600' 
                : usernameStatus === 'taken' 
                ? 'text-red-600' 
                : 'text-muted-foreground'
            }`}>
              {usernameStatus === 'available' && "✅ Username disponível"}
              {usernameStatus === 'taken' && "❌ Username já está em uso"}
              {usernameStatus === 'checking' && "Verificando disponibilidade..."}
            </p>
          )}
          
          <p className="text-xs text-muted-foreground">
            Apenas letras minúsculas, números e underscore
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full"
          size="lg"
        >
          Continuar
        </Button>
      </CardContent>
    </Card>
  );
}