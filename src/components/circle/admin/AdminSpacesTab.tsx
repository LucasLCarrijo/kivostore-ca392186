import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, Pencil, Shield } from "lucide-react";
import { toast } from "sonner";
import SpaceFormModal from "@/components/circle/SpaceFormModal";

interface Props {
  community: any;
}

export default function AdminSpacesTab({ community }: Props) {
  const queryClient = useQueryClient();
  const [editingSpace, setEditingSpace] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: spaces } = useQuery({
    queryKey: ["circle-admin-spaces", community.id],
    queryFn: async () => {
      const { data } = await supabase.from("community_spaces").select("*")
        .eq("community_id", community.id).order("position");
      return data || [];
    },
  });

  const reorderSpaces = useMutation({
    mutationFn: async (reordered: any[]) => {
      const updates = reordered.map((s, i) => 
        supabase.from("community_spaces").update({ position: i }).eq("id", s.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["circle-admin-spaces"] });
      queryClient.invalidateQueries({ queryKey: ["circle-spaces"] });
      toast.success("Ordem salva!");
    },
  });

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDragOver = (e: React.DragEvent) => e.preventDefault();
  const handleDrop = (targetId: string) => {
    if (!draggedId || !spaces || draggedId === targetId) return;
    const reordered = [...spaces];
    const fromIdx = reordered.findIndex((s) => s.id === draggedId);
    const toIdx = reordered.findIndex((s) => s.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderSpaces.mutate(reordered);
    setDraggedId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">Espaços ({spaces?.length || 0})</h3>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1.5" />Novo espaço
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">Arraste para reordenar os espaços.</p>

      <div className="space-y-2">
        {spaces?.map((s: any) => (
          <Card
            key={s.id}
            className="p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing"
            draggable
            onDragStart={() => handleDragStart(s.id)}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(s.id)}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
            <span className="text-xl flex-shrink-0">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.post_count} posts · /{s.slug}</p>
            </div>
            {s.is_default && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
            {s.only_admins_can_post && (
              <Badge variant="outline" className="text-[10px]">
                <Shield className="h-3 w-3 mr-0.5" />Admin
              </Badge>
            )}
            {!s.is_visible && <Badge variant="outline" className="text-[10px] text-muted-foreground">Oculto</Badge>}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingSpace(s)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </Card>
        ))}
      </div>

      {/* Modals */}
      {showCreate && (
        <SpaceFormModal communityId={community.id} spacesCount={spaces?.length || 0} onClose={() => setShowCreate(false)} />
      )}
      {editingSpace && (
        <SpaceFormModal communityId={community.id} spacesCount={spaces?.length || 0} space={editingSpace} onClose={() => setEditingSpace(null)} />
      )}
    </div>
  );
}
