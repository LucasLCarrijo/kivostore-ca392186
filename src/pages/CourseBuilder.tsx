import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ArrowLeft, BookOpen, Clock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CourseSidebar } from "@/components/course/CourseSidebar";
import { LessonEditor } from "@/components/course/LessonEditor";
import type { Database } from "@/integrations/supabase/types";

type MemberContent = Database["public"]["Tables"]["member_content"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export default function CourseBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [selectedLesson, setSelectedLesson] = useState<MemberContent | null>(null);

  // Fetch product
  const { data: product } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  // Fetch course content
  const { data: content = [], refetch: refetchContent } = useQuery({
    queryKey: ["course-content", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("member_content")
        .select("*")
        .eq("product_id", id)
        .order("position", { ascending: true });
      if (error) throw error;
      return data as MemberContent[];
    },
    enabled: !!id,
  });

  const modules = content.filter((item) => item.type === "MODULE");
  const lessons = content.filter((item) => item.type === "LESSON");

  // Calculate course stats
  const totalLessons = lessons.length;
  const totalDuration = lessons.reduce((sum, lesson) => sum + (lesson.duration || 0), 0);
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeItem = content.find((item) => item.id === active.id);
    const overItem = content.find((item) => item.id === over.id);
    if (!activeItem || !overItem) return;

    // Update positions in database
    try {
      const updates = content.map((item, index) => ({
        id: item.id,
        position: index,
      }));

      // Find new position for the moved item
      const activeIndex = content.findIndex((item) => item.id === active.id);
      const overIndex = content.findIndex((item) => item.id === over.id);
      
      const newPosition = overIndex;
      
      await supabase
        .from("member_content")
        .update({ position: newPosition })
        .eq("id", String(active.id));

      // Update other items' positions
      const itemsToUpdate = content.filter((item) => {
        if (activeIndex < overIndex) {
          return item.position > activeIndex && item.position <= overIndex && item.id !== active.id;
        } else {
          return item.position >= overIndex && item.position < activeIndex && item.id !== active.id;
        }
      });

      for (const item of itemsToUpdate) {
        const adjustment = activeIndex < overIndex ? -1 : 1;
        await supabase
          .from("member_content")
          .update({ position: item.position + adjustment })
          .eq("id", item.id);
      }

      refetchContent();
      toast.success("Ordem atualizada!");
    } catch (error) {
      console.error("Error reordering:", error);
      toast.error("Erro ao reordenar");
    }
  };

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Carregando curso...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/products`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {product.name}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                {modules.length} módulos
              </span>
              <span className="flex items-center gap-1">
                <Play className="h-4 w-4" />
                {totalLessons} aulas
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(totalDuration)} de conteúdo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={content.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {/* Sidebar */}
            <div className="w-80 border-r border-border bg-muted/20">
              <CourseSidebar
                productId={id!}
                modules={modules}
                lessons={lessons}
                selectedLesson={selectedLesson}
                onSelectLesson={setSelectedLesson}
                onContentUpdate={refetchContent}
              />
            </div>

            {/* Main editor area */}
            <div className="flex-1 overflow-hidden">
              <LessonEditor
                productId={id!}
                lesson={selectedLesson}
                onLessonUpdate={refetchContent}
                onLessonChange={setSelectedLesson}
              />
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}