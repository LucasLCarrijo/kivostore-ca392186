import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function CirclesDiscover() {
  const [q, setQ] = useState("");
  const [access, setAccess] = useState<"ALL" | "FREE" | "PAID">("ALL");
  const [sort, setSort] = useState<"TRENDING" | "NEWEST" | "MEMBERS">("TRENDING");

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["circles-discover"],
    queryFn: async () => {
      const { data } = await supabase
        .from("communities")
        .select("id,name,slug,description,icon_url,member_count,post_count,access_type,require_approval,is_active,created_at")
        .eq("is_active", true);
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    const list = communities.filter((c: any) => {
      const text = `${c.name} ${c.description || ""}`.toLowerCase();
      const matchesText = text.includes(q.toLowerCase());
      const matchesAccess =
        access === "ALL" ||
        (access === "FREE" && c.access_type === "OPEN") ||
        (access === "PAID" && c.access_type !== "OPEN");
      return matchesText && matchesAccess;
    });

    list.sort((a: any, b: any) => {
      if (sort === "NEWEST") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "MEMBERS") return (b.member_count || 0) - (a.member_count || 0);
      const aScore = (a.member_count || 0) * 0.7 + (a.post_count || 0) * 0.3;
      const bScore = (b.member_count || 0) * 0.7 + (b.post_count || 0) * 0.3;
      return bScore - aScore;
    });

    return list;
  }, [communities, q, access, sort]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Descobrir Comunidades</h1>
      <div className="flex gap-2 flex-wrap">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar comunidades..." className="max-w-sm" />
        <button className={`px-3 py-2 rounded-md text-sm border ${access === "ALL" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAccess("ALL")}>Todas</button>
        <button className={`px-3 py-2 rounded-md text-sm border ${access === "FREE" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAccess("FREE")}>Grátis</button>
        <button className={`px-3 py-2 rounded-md text-sm border ${access === "PAID" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAccess("PAID")}>Pagas</button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className={`px-3 py-1.5 rounded-md text-xs border ${sort === "TRENDING" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setSort("TRENDING")}>Em alta</button>
        <button className={`px-3 py-1.5 rounded-md text-xs border ${sort === "NEWEST" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setSort("NEWEST")}>Recentes</button>
        <button className={`px-3 py-1.5 rounded-md text-xs border ${sort === "MEMBERS" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setSort("MEMBERS")}>Mais membros</button>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Carregando...</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((c: any) => (
          <Card key={c.id} className="p-4 flex items-start gap-3">
            {c.icon_url ? (
              <img src={c.icon_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-xl bg-muted" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold truncate">{c.name}</h3>
                <Badge variant="secondary">{c.access_type === "OPEN" ? "Grátis" : "Pago"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description || "Sem descrição"}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-[10px]">{c.require_approval ? "Entrada com aprovação" : "Entrada livre"}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Users className="h-4 w-4" />{c.member_count}</span>
                <Link to={`/c/${c.slug}`} className="text-primary hover:underline">Abrir</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
