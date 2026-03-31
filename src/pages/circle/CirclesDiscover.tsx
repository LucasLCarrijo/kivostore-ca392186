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

  const { data: communities = [], isLoading } = useQuery({
    queryKey: ["circles-discover"],
    queryFn: async () => {
      const { data } = await supabase
        .from("communities")
        .select("id,name,slug,description,icon_url,member_count,access_type,is_active")
        .eq("is_active", true)
        .order("member_count", { ascending: false });
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return communities.filter((c: any) => {
      const text = `${c.name} ${c.description || ""}`.toLowerCase();
      const matchesText = text.includes(q.toLowerCase());
      const matchesAccess =
        access === "ALL" ||
        (access === "FREE" && c.access_type === "OPEN") ||
        (access === "PAID" && c.access_type !== "OPEN");
      return matchesText && matchesAccess;
    });
  }, [communities, q, access]);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Discover Communities</h1>
      <div className="flex gap-2 flex-wrap">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search communities..." className="max-w-sm" />
        <button className={`px-3 py-2 rounded-md text-sm border ${access === "ALL" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAccess("ALL")}>All</button>
        <button className={`px-3 py-2 rounded-md text-sm border ${access === "FREE" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAccess("FREE")}>Free</button>
        <button className={`px-3 py-2 rounded-md text-sm border ${access === "PAID" ? "bg-primary text-primary-foreground" : ""}`} onClick={() => setAccess("PAID")}>Paid</button>
      </div>

      {isLoading ? <div className="text-sm text-muted-foreground">Loading...</div> : null}

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
                <Badge variant="secondary">{c.access_type === "OPEN" ? "Free" : "Paid"}</Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{c.description || "Sem descrição"}</p>
              <div className="flex items-center justify-between mt-3 text-sm">
                <span className="text-muted-foreground inline-flex items-center gap-1"><Users className="h-4 w-4" />{c.member_count}</span>
                <Link to={`/c/${c.slug}`} className="text-primary hover:underline">View</Link>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
