import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import confetti from 'canvas-confetti';
import { Copy, CheckCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { useToast } from "@/hooks/use-toast";
import type { OnboardingData } from "./OnboardingWizard";

interface StepPublishProps {
  data: OnboardingData;
  workspaceId: string;
  onComplete: () => void;
}

export function StepPublish({ data, workspaceId, onComplete }: StepPublishProps) {
  const [isPublished, setIsPublished] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();

  const storeUrl = `https://kivo.app/${data.profile.username}`;

  const launchConfetti = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const fire = () => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#F9423A', '#ff6b6b', '#ffffff', '#ffd93d'],
      });

      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#F9423A', '#ff6b6b', '#ffffff', '#ffd93d'],
      });

      if (Date.now() < end) {
        requestAnimationFrame(fire);
      }
    };

    fire();
  }, []);

  const handlePublish = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);

    try {
      // Update storefront
      const { error: sfError } = await supabase
        .from('storefronts')
        .update({
          title: data.profile.display_name,
          bio: data.profile.bio,
          avatar_url: data.profile.avatar_url || null,
          is_published: true,
          slug: data.profile.username,
        })
        .eq('workspace_id', currentWorkspace.id);

      if (sfError) throw sfError;

      setIsPublished(true);
      launchConfetti();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível publicar sua loja",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`🚀 Acabei de criar minha loja digital no Kivo! Confira: ${storeUrl}`)}`,
      '_blank'
    );
  };

  const shareOnTwitter = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🚀 Acabei de criar minha loja digital no Kivo! Confira:`)}%20${encodeURIComponent(storeUrl)}`,
      '_blank'
    );
  };

  return (
    <div className="max-w-2xl mx-auto text-center">
      {!isPublished ? (
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Tudo pronto!</h2>
            <p className="text-muted-foreground">
              Sua loja está configurada. Publique agora e comece a vender.
            </p>
          </div>

          {/* Preview Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                {data.profile.avatar_url ? (
                  <img
                    src={data.profile.avatar_url}
                    alt={data.profile.display_name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    {data.profile.display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <h3 className="font-bold text-lg">{data.profile.display_name}</h3>
                  <p className="text-sm text-muted-foreground">@{data.profile.username}</p>
                  {data.profile.bio && (
                    <p className="text-sm text-muted-foreground mt-1">{data.profile.bio}</p>
                  )}
                </div>
              </div>

              {data.product && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-2">1 produto criado</p>
                  <div className="flex items-center space-x-3">
                    {data.product.thumbnail_url ? (
                      <img
                        src={data.product.thumbnail_url}
                        alt={data.product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xs">
                        📦
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium">{data.product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.product.price > 0
                          ? `R$ ${data.product.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                          : 'Grátis'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Plano: <span className="font-medium capitalize">{data.plan}</span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={handlePublish}
            disabled={isLoading}
            size="lg"
            className="w-full text-lg h-14 relative overflow-hidden"
          >
            {isLoading ? "Publicando..." : "🎉 Publicar Minha Loja"}
          </Button>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold">Sua loja está no ar!</h2>
            <p className="text-muted-foreground text-lg">
              Compartilhe com o mundo e comece a vender agora mesmo.
            </p>
          </div>

          {/* Link da loja */}
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-3">Link da sua loja</p>
              <div className="flex items-center space-x-2">
                <div className="flex-1 p-3 rounded-lg bg-muted text-sm font-mono truncate">
                  {storeUrl}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <CheckCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(storeUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Share Buttons */}
          <div>
            <p className="text-sm text-muted-foreground mb-4">Compartilhar</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={shareOnWhatsApp}
                className="flex items-center justify-center space-x-2"
              >
                <span className="text-green-600">📱</span>
                <span>WhatsApp</span>
              </Button>
              <Button
                variant="outline"
                onClick={shareOnTwitter}
                className="flex items-center justify-center space-x-2"
              >
                <span>🐦</span>
                <span>Twitter</span>
              </Button>
            </div>
          </div>

          <Button
            onClick={onComplete}
            size="lg"
            className="w-full"
          >
            Ir para o Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}