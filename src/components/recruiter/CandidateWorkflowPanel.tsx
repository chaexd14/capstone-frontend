"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Copy,
  Clock3,
  ExternalLink,
  History,
  ListTodo,
  MessageSquareText,
  NotebookPen,
  Trash2,
} from "lucide-react";
import { fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import {
  Application,
  ApplicationActivity,
  CandidateNote,
  CommunicationTemplate,
  RecruiterTask,
} from "@/types/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";

interface CandidateWorkflowPanelProps {
  application: Application | null;
  anonymize: boolean;
  onClose: () => void;
  onApplicationUpdated?: (application: Application) => void;
}

async function fetchTemplates(): Promise<CommunicationTemplate[]> {
  try {
    return await fetchApi<CommunicationTemplate[]>("/communication-templates/");
  } catch {
    return await fetchApi<CommunicationTemplate[]>("/applications/communication-templates/");
  }
}

function fetchWorkspace(applicationId: number) {
  return Promise.all([
    fetchApi<CandidateNote[]>(`/applications/${applicationId}/notes/`),
    fetchApi<RecruiterTask[]>(`/applications/${applicationId}/tasks/`),
    fetchApi<ApplicationActivity[]>(`/applications/${applicationId}/activity/`),
    fetchTemplates(),
  ]);
}

function formatWhen(value?: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function CandidateWorkflowPanel({
  application,
  anonymize,
  onClose,
}: CandidateWorkflowPanelProps) {
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [tasks, setTasks] = useState<RecruiterTask[]>([]);
  const [activity, setActivity] = useState<ApplicationActivity[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteBody, setNoteBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const candidateName = application
    ? getCandidateDisplayName(application, anonymize)
    : "Candidate";

  const hydrateTemplate = useMemo(
    () => (value: string) =>
      value
        .replaceAll("{{candidate_name}}", candidateName)
        .replaceAll("{{job_title}}", application?.job_title || "the role")
        .replaceAll("{{company_name}}", "our company")
        .replaceAll("{{recruiter_name}}", "TalentMatch Recruiting Team"),
    [application?.job_title, candidateName]
  );

  useEffect(() => {
    if (templates.length > 0 && application && !selectedTemplate) {
      const match = templates.find((t) => t.stage === application.status);
      if (match) {
        setSelectedTemplate(String(match.id));
        setMessageSubject(hydrateTemplate(match.subject));
        setMessageBody(hydrateTemplate(match.body));
      }
    }
  }, [templates, application, selectedTemplate, hydrateTemplate]);

  const loadWorkspace = async (applicationId: number) => {
    setLoading(true);
    try {
      const [notesData, tasksData, activityData, templateData] = await fetchWorkspace(applicationId);
      setNotes(notesData);
      setTasks(tasksData);
      setActivity(activityData);
      setTemplates(templateData);
    } catch (error) {
      toast.error("Workspace unavailable", {
        description: error instanceof Error ? error.message : "Could not load recruiter workflow records.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!application) return;
    let active = true;
    void fetchWorkspace(application.id)
      .then(([notesData, tasksData, activityData, templateData]) => {
        if (!active) return;
        setNotes(notesData);
        setTasks(tasksData);
        setActivity(activityData);
        setTemplates(templateData);
      })
      .catch((error: unknown) => {
        if (!active) return;
        toast.error("Workspace unavailable", {
          description: error instanceof Error ? error.message : "Could not load recruiter workflow records.",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [application]);

  const addNote = async () => {
    if (!application || !noteBody.trim()) return;
    setSaving(true);
    try {
      const note = await fetchApi<CandidateNote>(`/applications/${application.id}/notes/`, {
        method: "POST",
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setNotes((current) => [note, ...current]);
      setNoteBody("");
      await loadWorkspace(application.id);
      toast.success("Private note added");
    } catch (error) {
      toast.error("Note not saved", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!application) return;
    try {
      await fetchApi(`/applications/${application.id}/notes/${noteId}/`, { method: "DELETE" });
      setNotes((current) => current.filter((note) => note.id !== noteId));
      toast.success("Note removed");
    } catch (error) {
      toast.error("Note not removed", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const addTask = async () => {
    if (!application || !taskTitle.trim()) return;
    setSaving(true);
    try {
      const task = await fetchApi<RecruiterTask>(`/applications/${application.id}/tasks/`, {
        method: "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          priority: taskPriority,
          due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null,
        }),
      });
      setTasks((current) => [task, ...current]);
      setTaskTitle("");
      setTaskDueAt("");
      toast.success("Follow-up task created");
    } catch (error) {
      toast.error("Task not created", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: RecruiterTask) => {
    if (!application) return;
    try {
      const updated = await fetchApi<RecruiterTask>(
        `/applications/${application.id}/tasks/${task.id}/`,
        { method: "PATCH", body: JSON.stringify({ is_complete: !task.is_complete }) }
      );
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      toast.error("Task not updated", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((item) => String(item.id) === String(templateId));
    if (!template) return;
    setMessageSubject(hydrateTemplate(template.subject));
    setMessageBody(hydrateTemplate(template.body));
  };

  const recordDraftAction = async (draftAction: "OPENED_GMAIL" | "COPIED") => {
    if (!application || !messageSubject.trim() || !messageBody.trim()) return;
    try {
      const entry = await fetchApi<ApplicationActivity>(`/applications/${application.id}/communications/`, {
        method: "POST",
        body: JSON.stringify({
          subject: messageSubject.trim(),
          body: messageBody.trim(),
          draft_action: draftAction,
        }),
      });
      setActivity((current) => [entry, ...current]);
    } catch (error) {
      toast.error("Draft activity was not recorded", {
        description: error instanceof Error ? error.message : "The email draft is still available.",
      });
    }
  };

  const canComposeEmail = Boolean(application?.email && messageSubject.trim() && messageBody.trim());
  const gmailUrl = (() => {
    if (!application?.email || !messageSubject.trim() || !messageBody.trim()) return "";
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: application.email,
      su: messageSubject.trim(),
      body: messageBody.trim(),
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  })();

  const handleGmailClick = () => {
    toast.success("Gmail draft opened", { description: "Review and send it from Gmail when ready." });
    void recordDraftAction("OPENED_GMAIL");
  };

  const copyEmail = async () => {
    if (!application || !messageSubject.trim() || !messageBody.trim()) return;
    const composedEmail = `To: ${application.email}\nSubject: ${messageSubject.trim()}\n\n${messageBody.trim()}`;
    try {
      await navigator.clipboard.writeText(composedEmail);
      toast.success("Email copied", { description: "Paste it into the email service you use." });
      void recordDraftAction("COPIED");
    } catch {
      toast.error("Email could not be copied", { description: "Check clipboard permission and try again." });
    }
  };

  return (
    <Sheet open={application !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-slate-200 px-5 py-5 text-left">
          <SheetTitle className="text-lg text-slate-950">{candidateName}</SheetTitle>
          <SheetDescription>
            {application?.job_title || "Candidate workflow"} · {application?.status.replaceAll("_", " ")}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="tasks" className="px-5 py-4">
          <TabsList className="grid w-full grid-cols-4 bg-slate-100">
            <TabsTrigger value="tasks" className="gap-1.5 text-xs"><ListTodo className="h-3.5 w-3.5" />Tasks</TabsTrigger>
            <TabsTrigger value="notes" className="gap-1.5 text-xs"><NotebookPen className="h-3.5 w-3.5" />Notes</TabsTrigger>
            <TabsTrigger value="message" className="gap-1.5 text-xs"><MessageSquareText className="h-3.5 w-3.5" />Message</TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" />History</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-5 space-y-5">
            <section className="space-y-3" aria-labelledby="new-task-heading">
              <h3 id="new-task-heading" className="font-semibold text-slate-950">Create the next action</h3>
              <div className="space-y-2">
                <Label htmlFor="workflow-task">Task</Label>
                <Input id="workflow-task" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Schedule a screening call" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workflow-priority">Priority</Label>
                  <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as typeof taskPriority)}>
                    <SelectTrigger id="workflow-priority"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workflow-due">Due</Label>
                  <Input id="workflow-due" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
                </div>
              </div>
              <Button onClick={addTask} disabled={saving || !taskTitle.trim()}>Add task</Button>
            </section>

            <section className="space-y-2" aria-label="Candidate tasks">
              {loading ? <p className="text-sm text-slate-500">Loading tasks…</p> : tasks.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No follow-up tasks yet.</p>
              ) : tasks.map((task) => (
                <button key={task.id} type="button" onClick={() => toggleTask(task)} className="flex w-full items-start gap-3 rounded-xl border border-slate-200 p-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                  {task.is_complete ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />}
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium ${task.is_complete ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><Clock3 className="h-3.5 w-3.5" />{formatWhen(task.due_at)} · {task.priority.toLowerCase()} priority</span>
                  </span>
                </button>
              ))}
            </section>
          </TabsContent>

          <TabsContent value="notes" className="mt-5 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="workflow-note">Private recruiter note</Label>
              <Textarea id="workflow-note" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Capture evidence, context, or a follow-up question…" rows={4} />
              <div className="flex justify-end"><Button onClick={addNote} disabled={saving || !noteBody.trim()}>Save note</Button></div>
            </div>
            <div className="space-y-3">
              {notes.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No private notes yet.</p> : notes.map((note) => (
                <article key={note.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div><p className="text-xs font-semibold text-slate-700">{note.author_name}</p><p className="text-xs text-slate-400">{formatWhen(note.created_at)}</p></div>
                    <Button variant="ghost" size="icon" onClick={() => deleteNote(note.id)} aria-label="Delete note"><Trash2 className="h-4 w-4 text-slate-400" /></Button>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{note.body}</p>
                </article>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="message" className="mt-5 space-y-4">
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-900">
              Prepare a draft, then open it in Gmail or copy it. TalentMatch records the draft action, not email delivery.
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="workflow-template">Template</Label>
                <a
                  href="/admin?view=templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#2196F3] hover:underline flex items-center gap-1 font-semibold"
                >
                  Manage templates
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Select value={selectedTemplate} onValueChange={applyTemplate}>
                <SelectTrigger id="workflow-template">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={String(template.id)}>
                      <span className="flex items-center gap-2">
                        {template.stage && template.stage !== "GENERAL" && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {template.stage.toLowerCase()}
                          </span>
                        )}
                        <span>{template.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-recipient">To</Label>
              <Input id="workflow-recipient" value={application?.email || ""} readOnly className="bg-slate-50 text-slate-600" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workflow-subject">Subject</Label>
              <Input id="workflow-subject" maxLength={200} value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="workflow-message">Message</Label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-400">Insert:</span>
                  <button
                    type="button"
                    onClick={() => setMessageBody((prev) => prev + " {{candidate_name}}")}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Insert candidate name"
                  >
                    + candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessageBody((prev) => prev + " {{job_title}}")}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    title="Insert job title"
                  >
                    + role
                  </button>
                </div>
              </div>
              <Textarea
                id="workflow-message"
                maxLength={5000}
                rows={10}
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {canComposeEmail ? (
                <Button asChild className="gap-2">
                  <a href={gmailUrl} target="_blank" rel="noopener noreferrer" onClick={handleGmailClick}>
                    <ExternalLink className="h-4 w-4" />Open in Gmail
                  </a>
                </Button>
              ) : (
                <Button disabled className="gap-2"><ExternalLink className="h-4 w-4" />Open in Gmail</Button>
              )}
              <Button variant="outline" onClick={copyEmail} disabled={!canComposeEmail} className="gap-2">
                <Copy className="h-4 w-4" />Copy email
              </Button>
            </div>
            <p className="text-xs leading-5 text-slate-500">Opening or copying a draft does not confirm that the candidate received it.</p>
          </TabsContent>

          <TabsContent value="history" className="mt-5">
            <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-slate-200">
              {activity.length === 0 ? <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">No workflow activity yet.</p> : activity.map((entry) => (
                <article key={entry.id} className="relative flex gap-3 pl-0">
                  <span className="mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-4 border-white bg-blue-500 ring-1 ring-blue-200" />
                  <div className="min-w-0 pb-2"><p className="text-sm font-medium text-slate-900">{entry.summary}</p><p className="mt-0.5 text-xs text-slate-500">{entry.actor_name} · {formatWhen(entry.created_at)}</p></div>
                </article>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
