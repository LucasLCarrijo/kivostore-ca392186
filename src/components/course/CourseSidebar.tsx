import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  FolderOpen,
  GripVertical,
  MoreHorizontal,
  Video,
  FileText,
  FileType,
  Headphones,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type MemberContent = Database["public"]["Tables"]["member_content"]["Row"];

interface CourseSidebarProps {
  productId: string;
  modules: MemberContent[];
  lessons: MemberContent[];
  selectedLesson: MemberContent | null;
  onSelectLesson: (lesson: MemberContent | null) => void;
  onContentUpdate: () => void;
}

interface SortableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        className,
        isDragging && "opacity-50 z-50"
      )}
      {...attributes}
    >
      <div className="flex items-center">
        <div {...listeners} className="cursor-grab hover:cursor-grabbing p-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function CourseSidebar({
  productId,
  modules,
  lessons,
  selectedLesson,
  onSelectLesson,
  onContentUpdate,
}: CourseSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const createModule = async () => {
    try {
      const maxPosition = Math.max(...modules.map((m) => m.position), -1);
      
      const { error } = await supabase
        .from("member_content")
        .insert({
          product_id: productId,
          type: "MODULE",
          title: "Novo Módulo",
          position: maxPosition + 1,
        });

      if (error) throw error;
      onContentUpdate();
      toast.success("Módulo criado!");
    } catch (error) {
      console.error("Error creating module:", error);
      toast.error("Erro ao criar módulo");
    }
  };

  const createLesson = async (parentId: string) => {
    try {
      const moduleLessons = lessons.filter((l) => l.parent_id === parentId);
      const maxPosition = Math.max(...moduleLessons.map((l) => l.position), -1);

      const { data, error } = await supabase
        .from("member_content")
        .insert({
          product_id: productId,
          parent_id: parentId,
          type: "LESSON",
          title: "Nova Aula",
          media_type: "TEXT",
          position: maxPosition + 1,
        })
        .select()
        .single();

      if (error) throw error;
      onContentUpdate();
      onSelectLesson(data);
      toast.success("Aula criada!");
    } catch (error) {
      console.error("Error creating lesson:", error);
      toast.error("Erro ao criar aula");
    }
  };

  const startEditing = (item: MemberContent) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const saveTitle = async (id: string) => {
    try {
      await supabase
        .from("member_content")
        .update({ title: editingTitle.trim() || "Sem título" })
        .eq("id", id);

      setEditingId(null);
      onContentUpdate();
      toast.success("Título atualizado!");
    } catch (error) {
      console.error("Error updating title:", error);
      toast.error("Erro ao atualizar título");
    }
  };

  const deleteModule = async (moduleId: string) => {
    try {
      // Delete all lessons in the module first
      const moduleLessons = lessons.filter((l) => l.parent_id === moduleId);
      
      for (const lesson of moduleLessons) {
        await supabase
          .from("member_content")
          .delete()
          .eq("id", lesson.id);
      }

      // Delete the module
      await supabase
        .from("member_content")
        .delete()
        .eq("id", moduleId);

      if (selectedLesson && moduleLessons.some(l => l.id === selectedLesson.id)) {
        onSelectLesson(null);
      }

      onContentUpdate();
      toast.success("Módulo excluído!");
    } catch (error) {
      console.error("Error deleting module:", error);
      toast.error("Erro ao excluir módulo");
    }
  };

  const deleteLesson = async (lessonId: string) => {
    try {
      await supabase
        .from("member_content")
        .delete()
        .eq("id", lessonId);

      if (selectedLesson?.id === lessonId) {
        onSelectLesson(null);
      }

      onContentUpdate();
      toast.success("Aula excluída!");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      toast.error("Erro ao excluir aula");
    }
  };

  const getMediaIcon = (mediaType: string | null) => {
    switch (mediaType) {
      case "VIDEO":
        return <Video className="h-4 w-4" />;
      case "TEXT":
        return <FileText className="h-4 w-4" />;
      case "PDF":
        return <FileType className="h-4 w-4" />;
      case "AUDIO":
        return <Headphones className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <Button
          onClick={createModule}
          className="w-full"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Módulo
        </Button>
      </div>

      {/* Content tree */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {modules.map((module) => {
          const moduleLessons = lessons
            .filter((lesson) => lesson.parent_id === module.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div key={module.id} className="space-y-1">
              <SortableItem id={module.id}>
                <div className="flex-1 flex items-center justify-between group min-w-0">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
                    {editingId === module.id ? (
                      <Input
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => saveTitle(module.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveTitle(module.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-6 text-sm"
                        autoFocus
                      />
                    ) : (
                      <span
                        className="text-sm font-medium truncate cursor-pointer hover:text-primary"
                        onClick={() => startEditing(module)}
                      >
                        {module.title}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => createLesson(module.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditing(module)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir módulo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Todas as aulas dentro deste módulo também serão excluídas.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteModule(module.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </SortableItem>

              {/* Lessons */}
              <div className="ml-6 space-y-1">
                {moduleLessons.map((lesson) => (
                  <SortableItem
                    key={lesson.id}
                    id={lesson.id}
                    className={cn(
                      "rounded-md hover:bg-muted/50 transition-colors",
                      selectedLesson?.id === lesson.id && "bg-muted"
                    )}
                  >
                    <div
                      className="flex-1 flex items-center justify-between group min-w-0 p-2 cursor-pointer"
                      onClick={() => onSelectLesson(lesson)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getMediaIcon(lesson.media_type)}
                        {editingId === lesson.id ? (
                          <Input
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onBlur={() => saveTitle(lesson.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveTitle(lesson.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="h-6 text-sm"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="text-sm truncate">
                              {lesson.title}
                            </span>
                            {lesson.is_free && (
                              <Badge variant="secondary" className="text-xs">
                                Grátis
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(lesson);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Renomear
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteLesson(lesson.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </SortableItem>
                ))}
              </div>
            </div>
          );
        })}

        {modules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-3">Nenhum módulo criado ainda</p>
            <Button onClick={createModule} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Módulo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}