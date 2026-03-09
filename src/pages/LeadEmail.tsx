import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Send,
  Mail,
  Users,
  MousePointer,
  Eye,
  Clock,
  Bold,
  Italic,
  List,
  ListOrdered,
} from "lucide-react";

export default function LeadEmail() {
  const { currentWorkspace } = useWorkspace();
  const [searchParams] = useSearchParams();
  const preselectedSegmentId = searchParams.get("segment");
  
  const [selectedSegment, setSelectedSegment] = useState<string>(
    preselectedSegmentId || "all"
  );
  const [subject, setSubject] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Rich text editor
  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Escreva sua mensagem aqui...</p>",
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none min-h-[200px] p-4 focus:outline-none",
      },
    },
  });

  // Fetch segments
  const { data: segments = [] } = useQuery({
    queryKey: ["email_segments", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("email_segments")
        .select("*")
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch leads count
  const { data: leads = [] } = useQuery({
    queryKey: ["leads", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .is("unsubscribed_at", null);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Fetch email events (history)
  const { data: emailEvents = [] } = useQuery({
    queryKey: ["email_events", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("email_events")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentWorkspace?.id,
  });

  // Calculate recipient count based on segment
  const recipientCount = useMemo(() => {
    if (selectedSegment === "all") return leads.length;
    
    const segment = segments.find((s) => s.id === selectedSegment);
    if (!segment) return 0;

    const rules = (segment.filter_rules as any[]) || [];
    return leads.filter((lead) => {
      return rules.every((rule: any) => {
        switch (rule.field) {
          case "tags":
            return lead.tags && lead.tags.includes(rule.value);
          case "status":
            return lead.status === rule.value;
          case "created_after":
            return new Date(lead.created_at) > new Date(rule.value);
          default:
            return true;
        }
      });
    }).length;
  }, [selectedSegment, segments, leads]);

  // Group email events by campaign
  const campaigns = useMemo(() => {
    const campaignMap = new Map<string, {
      id: string;
      subject: string;
      sent_at: string;
      sent_count: number;
      opened_count: number;
      clicked_count: number;
    }>();

    emailEvents.forEach((event) => {
      if (!event.campaign_id) return;

      const existing = campaignMap.get(event.campaign_id);
      if (!existing) {
        campaignMap.set(event.campaign_id, {
          id: event.campaign_id,
          subject: (event.metadata as any)?.subject || "Sem assunto",
          sent_at: event.created_at || "",
          sent_count: event.event_type === "SENT" ? 1 : 0,
          opened_count: event.event_type === "OPENED" ? 1 : 0,
          clicked_count: event.event_type === "CLICKED" ? 1 : 0,
        });
      } else {
        if (event.event_type === "SENT") existing.sent_count++;
        if (event.event_type === "OPENED") existing.opened_count++;
        if (event.event_type === "CLICKED") existing.clicked_count++;
      }
    });

    return Array.from(campaignMap.values()).slice(0, 20);
  }, [emailEvents]);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast.error("Assunto é obrigatório");
      return;
    }

    if (!editor?.getHTML() || editor.getHTML() === "<p></p>") {
      toast.error("Corpo do email é obrigatório");
      return;
    }

    if (recipientCount === 0) {
      toast.error("Nenhum destinatário encontrado");
      return;
    }

    setIsSending(true);

    try {
      // For now, we'll simulate sending and log the event
      // In production, this would call an edge function to send via Resend
      const campaignId = `campaign-${Date.now()}`;
      
      // Get recipient emails
      const recipients = selectedSegment === "all" 
        ? leads 
        : leads.filter((lead) => {
            const segment = segments.find((s) => s.id === selectedSegment);
            if (!segment) return false;
            const rules = (segment.filter_rules as any[]) || [];
            return rules.every((rule: any) => {
              switch (rule.field) {
                case "tags":
                  return lead.tags && lead.tags.includes(rule.value);
                case "status":
                  return lead.status === rule.value;
                case "created_after":
                  return new Date(lead.created_at) > new Date(rule.value);
                default:
                  return true;
              }
            });
          });

      // Log email events
      const events = recipients.map((lead) => ({
        workspace_id: currentWorkspace?.id,
        lead_id: lead.id,
        email: lead.email,
        event_type: "SENT",
        campaign_id: campaignId,
        metadata: { subject, body: editor.getHTML() },
      }));

      const { error } = await supabase.from("email_events").insert(events);
      
      if (error) throw error;

      toast.success(`Email enviado para ${recipientCount} leads!`);
      setSubject("");
      editor?.commands.setContent("<p>Escreva sua mensagem aqui...</p>");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao enviar emails");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Email Marketing</h1>
        <p className="text-muted-foreground">
          Envie campanhas de email para seus leads
        </p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">
            <Send className="h-4 w-4 mr-2" />
            Compor
          </TabsTrigger>
          <TabsTrigger value="history">
            <Clock className="h-4 w-4 mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Composer */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Nova Campanha</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Para</Label>
                      <Select
                        value={selectedSegment}
                        onValueChange={setSelectedSegment}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            Todos os leads ({leads.length})
                          </SelectItem>
                          {segments.map((segment) => (
                            <SelectItem key={segment.id} value={segment.id}>
                              {segment.name} ({segment.member_count || 0})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>De</Label>
                      <Input
                        value={currentWorkspace?.name || "Sua Loja"}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject">Assunto</Label>
                    <Input
                      id="subject"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Ex: Novidades especiais para você!"
                    />
                  </div>

                  <div>
                    <Label>Mensagem</Label>
                    <div className="border rounded-lg">
                      {/* Toolbar */}
                      <div className="flex gap-1 p-2 border-b bg-muted/50">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            editor?.chain().focus().toggleBold().run()
                          }
                          className={
                            editor?.isActive("bold") ? "bg-muted" : ""
                          }
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            editor?.chain().focus().toggleItalic().run()
                          }
                          className={
                            editor?.isActive("italic") ? "bg-muted" : ""
                          }
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            editor?.chain().focus().toggleBulletList().run()
                          }
                          className={
                            editor?.isActive("bulletList") ? "bg-muted" : ""
                          }
                        >
                          <List className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            editor?.chain().focus().toggleOrderedList().run()
                          }
                          className={
                            editor?.isActive("orderedList") ? "bg-muted" : ""
                          }
                        >
                          <ListOrdered className="h-4 w-4" />
                        </Button>
                      </div>
                      <EditorContent editor={editor} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview & Actions */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Resumo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{recipientCount}</p>
                      <p className="text-sm text-muted-foreground">
                        destinatários
                      </p>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleSend}
                    disabled={isSending || recipientCount === 0}
                  >
                    {isSending ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar agora
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <p className="text-sm text-muted-foreground">
                    Os emails serão enviados usando o serviço de email
                    configurado. Leads que cancelaram inscrição não receberão.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {campaigns.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhuma campanha enviada
                </h3>
                <p className="text-muted-foreground">
                  Envie sua primeira campanha de email para seus leads
                </p>
              </div>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Abertos</TableHead>
                    <TableHead>Clicados</TableHead>
                    <TableHead>Taxa de Abertura</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const openRate =
                      campaign.sent_count > 0
                        ? (
                            (campaign.opened_count / campaign.sent_count) *
                            100
                          ).toFixed(1)
                        : "0";
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          {campaign.subject}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {campaign.sent_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                            {campaign.opened_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MousePointer className="h-4 w-4 text-muted-foreground" />
                            {campaign.clicked_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{openRate}%</Badge>
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(campaign.sent_at),
                            "dd/MM/yy HH:mm",
                            { locale: ptBR }
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
