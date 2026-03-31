import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CircleJoin() {
  const { slug } = useParams();
  const [search] = useSearchParams();
  const invite = search.get("invite");
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { data: community, isLoading } = useQuery({
    queryKey: ["join-community", slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data } = await supabase.from("communities").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: joinQuestions = [] } = useQuery({
    queryKey: ["community-join-questions", community?.id],
    queryFn: async () => {
      if (!community?.id) return [];
      const { data, error } = await supabase
        .from("community_join_questions" as any)
        .select("id, question, required, position")
        .eq("community_id", community.id)
        .order("position", { ascending: true });
      if (error) return [];
      return (data || []) as any[];
    },
    enabled: !!community?.id,
  });

  const requiredMissing = useMemo(
    () => joinQuestions.some((q: any) => q.required && !String(answers[q.id] || "").trim()),
    [joinQuestions, answers]
  );

  const join = useMutation({
    mutationFn: async () => {
      if (!community || !user) throw new Error("Missing");

      if (community.access_type !== "OPEN") {
        return "REDIRECT_PLANS" as const;
      }

      const status = community.require_approval ? "PENDING" : "ACTIVE";
      const { data: inserted, error } = await supabase.from("community_members").insert({
        community_id: community.id,
        user_id: user.id,
        role: "MEMBER",
        status,
        display_name: user.email?.split("@")[0] || "Membro",
      }).select("id").single();
      if (error) throw error;

      if (status === "PENDING" && inserted?.id) {
        const payload = joinQuestions.map((q: any) => ({
          question_id: q.id,
          question: q.question,
          answer: answers[q.id] || "",
        }));

        await supabase.from("community_join_applications" as any).insert({
          community_id: community.id,
          member_id: inserted.id,
          user_id: user.id,
          answers: payload,
          invite_code: invite,
          status: "PENDING",
        } as any);
      }

      return status;
    },
    onSuccess: (status) => {
      if (status === "REDIRECT_PLANS") {
        navigate(`/c/${slug}/plans`);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ["community"] });
      queryClient.invalidateQueries({ queryKey: ["circle-member"] });
      if (status === "PENDING") {
        toast.success("Solicitação enviada! Aguarde aprovação.");
      } else {
        toast.success("Bem-vindo à comunidade!");
      }
      navigate(`/c/${slug}/feed`);
    },
    onError: (e: any) => {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
        navigate(`/c/${slug}/feed`);
        return;
      }
      toast.error("Não foi possível entrar na comunidade");
    },
  });

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando convite...</div>;

  if (!community) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card className="p-6 text-center space-y-2">
          <h1 className="text-xl font-semibold">Comunidade não encontrada</h1>
          <p className="text-sm text-muted-foreground">O link pode estar inválido ou a comunidade foi desativada.</p>
          <Button onClick={() => navigate("/circles")}>Ver comunidades</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <Card className="p-6 space-y-4">
        <h1 className="text-xl font-semibold">Entrar em {community.name}</h1>
        <p className="text-sm text-muted-foreground">{community.description || "Você foi convidado para essa comunidade."}</p>
        {invite ? <p className="text-xs text-muted-foreground">Convite: {invite}</p> : null}

        {joinQuestions.length > 0 && community.access_type === "OPEN" ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">Responda para entrar</p>
            {joinQuestions.map((q: any) => (
              <div key={q.id} className="space-y-1">
                <label className="text-sm">
                  {q.question} {q.required ? <span className="text-destructive">*</span> : null}
                </label>
                <textarea
                  className="w-full min-h-20 rounded-md border bg-background p-2 text-sm"
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="Sua resposta"
                />
              </div>
            ))}
          </div>
        ) : null}

        {!user ? (
          <Button className="w-full" onClick={() => navigate(`/member/login?redirect=${encodeURIComponent(`/join/${slug}${invite ? `?invite=${invite}` : ""}`)}`)}>
            Fazer login para entrar
          </Button>
        ) : (
          <Button className="w-full" onClick={() => join.mutate()} disabled={join.isPending || (community.access_type === "OPEN" && requiredMissing)}>
            {join.isPending ? "Processando..." : community.access_type === "OPEN" ? "Entrar na comunidade" : "Ver planos"}
          </Button>
        )}
      </Card>
    </div>
  );
}
