import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import { useWorkspace } from "@/contexts/WorkspaceProvider";

export default function Onboarding() {
  const { currentWorkspace, loading } = useWorkspace();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && currentWorkspace) {
      navigate("/dashboard", { replace: true });
    }
  }, [loading, currentWorkspace, navigate]);

  if (!loading && currentWorkspace) return null;

  return <OnboardingWizard />;
}