import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { supabase } from "@/integrations/supabase/client";

export default function Onboarding() {
  const { currentWorkspace, loading } = useWorkspace();
  const navigate = useNavigate();
  const [checkingStorefront, setCheckingStorefront] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!currentWorkspace) {
      // No workspace yet — show wizard so user can create one
      setCheckingStorefront(false);
      return;
    }

    // Workspace exists — check if storefront is already published
    const checkIfOnboardingComplete = async () => {
      try {
        const { data: storefront } = await supabase
          .from("storefronts")
          .select("is_published")
          .eq("workspace_id", currentWorkspace.id)
          .maybeSingle();

        if (storefront?.is_published) {
          // Onboarding already completed — go to dashboard
          navigate("/dashboard", { replace: true });
        } else {
          // Workspace exists but onboarding not finished — show wizard
          setCheckingStorefront(false);
        }
      } catch {
        setCheckingStorefront(false);
      }
    };

    checkIfOnboardingComplete();
  }, [loading, currentWorkspace, navigate]);

  if (loading || checkingStorefront) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
