"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Pencil,
  Plus,
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { EmptyState } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { FormField } from "@/components/ui/form-field";
import { NavTabs } from "@/components/ui/nav-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";

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

function formatDateTimeInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const localOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - localOffset).toISOString().slice(0, 16);
}

function getCandidateInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "C";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
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
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [workflowTab, setWorkflowTab] = useState("tasks");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecruiterTask | null>(null);
  const [editingNote, setEditingNote] = useState<CandidateNote | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<RecruiterTask | null>(null);

  const candidateName = application
    ? getCandidateDisplayName(application, anonymize)
    : "Candidate";
  const applicantNumber = application
    ? application.candidate_code || `#${application.id}`
    : "";
  const candidateInitials = getCandidateInitials(candidateName);
  const openTaskCount = tasks.filter((task) => !task.is_complete).length;
  const matchScore =
    typeof application?.match_result?.match_score === "number"
      ? Math.round(application.match_result.match_score)
      : null;
  const statusTone = application?.status === "SHORTLISTED" || application?.status === "HIRED" ? "success" : application?.status === "REJECTED" ? "danger" : application?.status === "INTERVIEW" ? "warning" : application?.status === "UNDER_REVIEW" || application?.status === "PROCESSING" ? "processing" : "neutral";

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
        const timer = window.setTimeout(() => {
          setSelectedTemplate(String(match.id));
          setMessageSubject(hydrateTemplate(match.subject));
          setMessageBody(hydrateTemplate(match.body));
        }, 0);
        return () => window.clearTimeout(timer);
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
      const note = await fetchApi<CandidateNote>(editingNote ? `/applications/${application.id}/notes/${editingNote.id}/` : `/applications/${application.id}/notes/`, {
        method: editingNote ? "PATCH" : "POST",
        body: JSON.stringify({ body: noteBody.trim() }),
      });
      setNotes((current) => editingNote ? current.map((item) => item.id === note.id ? note : item) : [note, ...current]);
      setNoteBody("");
      setEditingNote(null);
      setNoteDialogOpen(false);
      await loadWorkspace(application.id);
      toast.success(editingNote ? "Private note updated" : "Private note added");
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
      const task = await fetchApi<RecruiterTask>(editingTask ? `/applications/${application.id}/tasks/${editingTask.id}/` : `/applications/${application.id}/tasks/`, {
        method: editingTask ? "PATCH" : "POST",
        body: JSON.stringify({
          title: taskTitle.trim(),
          priority: taskPriority,
          due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null,
        }),
      });
      setTasks((current) => editingTask ? current.map((item) => item.id === task.id ? task : item) : [task, ...current]);
      setTaskTitle("");
      setTaskDueAt("");
      setTaskPriority("MEDIUM");
      setEditingTask(null);
      setTaskDialogOpen(false);
      toast.success(editingTask ? "Follow-up task updated" : "Follow-up task created");
    } catch (error) {
      toast.error("Task not created", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (task: RecruiterTask) => {
    if (!application) return;
    try {
      await fetchApi(`/applications/${application.id}/tasks/${task.id}/`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== task.id));
      toast.success("Task removed");
    } catch (error) {
      toast.error("Task not removed", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskTitle("");
    setTaskPriority("MEDIUM");
    setTaskDueAt("");
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: RecruiterTask) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskPriority(task.priority);
    setTaskDueAt(formatDateTimeInput(task.due_at));
    setTaskDialogOpen(true);
  };

  const openNewNote = () => {
    setEditingNote(null);
    setNoteBody("");
    setNoteDialogOpen(true);
  };

  const openEditNote = (note: CandidateNote) => {
    setEditingNote(note);
    setNoteBody(note.body);
    setNoteDialogOpen(true);
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
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden bg-card p-0 sm:max-w-2xl lg:max-w-[min(52vw,56rem)]">
        <Tabs value={workflowTab} onValueChange={setWorkflowTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0 bg-card">
            <SheetHeader className="px-5 pb-3 pt-5 text-left sm:px-7 sm:pt-6 sm:pb-6">
              <div className="flex min-w-0 items-start gap-3.5 pr-12">
                <div
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-secondary text-sm font-semibold text-secondary-foreground"
                >
                  {candidateInitials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <SheetTitle className="truncate text-xl text-foreground">{candidateName}</SheetTitle>
                    {application ? (
                      <StatusBadge status={statusTone} dot className="shrink-0">
                        {application.status.replaceAll("_", " ")}
                      </StatusBadge>
                    ) : null}
                  </div>
                  <SheetDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-medium text-foreground">{application?.job_title || "Candidate workflow"}</span>
                    {application ? <span aria-hidden="true">·</span> : null}
                    {application ? <span className="tabular-nums">Applicant No: <span className="font-medium text-foreground">{applicantNumber}</span></span> : null}
                    {matchScore !== null ? <span aria-hidden="true">·</span> : null}
                    {matchScore !== null ? <span className="tabular-nums">Match Score: <span className="font-medium text-foreground tabular-nums">{matchScore}%</span></span> : null}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <NavTabs
              label="Candidate workflow"
              value={workflowTab}
              onValueChange={setWorkflowTab}
              className="px-5 sm:px-7"
              tabs={[
                { id: "tasks", label: "Tasks", count: loading ? undefined : openTaskCount, icon: <ListTodo /> },
                { id: "notes", label: "Notes", count: loading ? undefined : notes.length, icon: <NotebookPen /> },
                { id: "message", label: "Message", icon: <MessageSquareText /> },
                { id: "history", label: "History", icon: <History /> },
              ]}
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-5 py-5 sm:px-7 sm:py-6">
            <TabsContent value="tasks" className="mt-0 space-y-5">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border p-5 sm:p-6">
                  <div>
                    <CardTitle>Follow-up tasks</CardTitle>
                    <CardDescription className="mt-1">Keep the candidate&apos;s next actions visible and accountable.</CardDescription>
                  </div>
                  <Button onClick={openNewTask} className="shrink-0 gap-2"><Plus className="size-4" />New task</Button>
                </CardHeader>
                <CardContent className="p-3 sm:p-4" aria-label="Candidate tasks">
                  {loading ? <ContextualLoading label="Loading candidate tasks" className="min-h-32" /> : tasks.length === 0 ? (
                    <EmptyState title="No follow-up tasks" description="Create the next action to keep this candidate moving." className="min-h-32 py-6" />
                  ) : tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2 rounded-xl p-2 transition-colors hover:bg-muted/50">
                      <IconButton label={task.is_complete ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} variant="ghost" size="icon-sm" onClick={() => toggleTask(task)} className="mt-1 shrink-0">
                        {task.is_complete ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                      </IconButton>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm font-medium ${task.is_complete ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />{formatWhen(task.due_at)} · {task.priority.toLowerCase()} priority</span>
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <IconButton label={`Edit ${task.title}`} variant="ghost" size="icon-sm" onClick={() => openEditTask(task)}><Pencil className="size-4" /></IconButton>
                        <IconButton label={`Delete ${task.title}`} variant="ghost" size="icon-sm" onClick={() => setTaskToDelete(task)}><Trash2 className="size-4" /></IconButton>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-0 space-y-5">
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border p-5 sm:p-6">
                  <div>
                    <CardTitle>Private notes</CardTitle>
                    <CardDescription className="mt-1">Capture recruiter-only evidence, context, and follow-up questions.</CardDescription>
                  </div>
                  <Button onClick={openNewNote} className="shrink-0 gap-2"><Plus className="size-4" />New note</Button>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  <div className="divide-y divide-border">
                    {notes.length === 0 ? <EmptyState title="No private notes" description="Recruiter-only context will appear here." className="min-h-32 py-6" /> : notes.map((note) => (
                      <article key={note.id} className="py-4 first:pt-5 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div><p className="text-sm font-semibold text-foreground">{note.author_name}</p><p className="text-sm text-muted-foreground">{formatWhen(note.created_at)}</p></div>
                          <div className="flex shrink-0 items-center gap-1">
                            <IconButton label="Edit note" variant="ghost" size="icon-sm" onClick={() => openEditNote(note)}><Pencil className="size-4" /></IconButton>
                            <IconButton label="Delete note" variant="ghost" size="icon-sm" onClick={() => setNoteToDelete(note.id)}><Trash2 className="size-4" /></IconButton>
                          </div>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{note.body}</p>
                      </article>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="message" className="mt-0 space-y-4">
              <Card><CardContent className="space-y-4 p-5 sm:p-6">
                <div className="rounded-xl border border-primary/15 bg-secondary/70 px-4 py-3 text-sm leading-6 text-foreground">
                  Prepare a draft, then open it in Gmail or copy it. TalentMatch records the draft action, not email delivery.
                </div>
                <FormField
                  label="Template"
                  htmlFor="workflow-template"
                  action={
                    <a
                      href="/admin?view=templates"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      Manage templates
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  }
                >
                  <Select value={selectedTemplate} onValueChange={applyTemplate}>
                    <SelectTrigger id="workflow-template">
                      <SelectValue placeholder="Choose a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          <span className="flex items-center gap-2">
                            {template.stage && template.stage !== "GENERAL" && (
                              <span className="rounded bg-muted px-1.5 py-0.5 text-sm font-bold uppercase text-muted-foreground">
                                {template.stage.toLowerCase()}
                              </span>
                            )}
                            <span>{template.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="To" htmlFor="workflow-recipient">
                  <Input id="workflow-recipient" value={application?.email || ""} readOnly className="bg-muted text-muted-foreground" />
                </FormField>
                <FormField label="Subject" htmlFor="workflow-subject">
                  <Input id="workflow-subject" maxLength={200} value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} />
                </FormField>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="workflow-message">Message</Label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-muted-foreground">Insert:</span>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => setMessageBody((prev) => prev + " {{candidate_name}}")}
                        className="h-7 px-2 text-sm"
                        title="Insert candidate name"
                      >
                        + candidate
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => setMessageBody((prev) => prev + " {{job_title}}")}
                        className="h-7 px-2 text-sm"
                        title="Insert job title"
                      >
                        + role
                      </Button>
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
                <p className="text-sm leading-5 text-muted-foreground">Opening or copying a draft does not confirm that the candidate received it.</p>
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <Card><CardHeader className="p-5 pb-0 sm:p-6 sm:pb-0"><CardTitle>Workflow history</CardTitle><CardDescription>Status changes, notes, tasks, and draft actions in one timeline.</CardDescription></CardHeader><CardContent className="p-5 sm:p-6">
                <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
                  {activity.length === 0 ? <EmptyState title="No workflow activity" description="Status, notes, tasks, and draft actions will be recorded here." className="min-h-32 py-6" /> : activity.map((entry) => (
                    <article key={entry.id} className="relative flex gap-3 pl-0">
                      <span className="mt-1.5 size-[15px] shrink-0 rounded-full border-4 border-card bg-primary ring-1 ring-primary/20" />
                      <div className="min-w-0 pb-2"><p className="text-sm font-medium text-foreground">{entry.summary}</p><p className="mt-0.5 text-sm text-muted-foreground">{entry.actor_name} · {formatWhen(entry.created_at)}</p></div>
                    </article>
                  ))}
                </div>
              </CardContent></Card>
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setEditingTask(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit follow-up task" : "Create follow-up task"}</DialogTitle>
            <DialogDescription>{editingTask ? "Update the task details while preserving its completion state." : `Assign the next action, priority, and optional due date for ${candidateName}.`}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Task" htmlFor="workflow-task" required>
              <Input id="workflow-task" autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Schedule a screening call" />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Priority" htmlFor="workflow-priority">
                <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as typeof taskPriority)}>
                  <SelectTrigger id="workflow-priority"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="LOW">Low</SelectItem><SelectItem value="MEDIUM">Medium</SelectItem><SelectItem value="HIGH">High</SelectItem></SelectContent>
                </Select>
              </FormField>
              <FormField label="Due" htmlFor="workflow-due">
                <Input id="workflow-due" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
              </FormField>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={addTask} disabled={saving || !taskTitle.trim()}>{saving ? "Saving…" : editingTask ? "Save changes" : "Create task"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={noteDialogOpen} onOpenChange={(open) => { setNoteDialogOpen(open); if (!open) setEditingNote(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit private note" : "Add a private note"}</DialogTitle>
            <DialogDescription>{editingNote ? "Update this recruiter-only context. Candidates cannot see it." : "Capture evidence or context for your recruiting team. Candidates cannot see this note."}</DialogDescription>
          </DialogHeader>
          <FormField label="Note" htmlFor="workflow-note">
            <Textarea id="workflow-note" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Add evidence, context, or a follow-up question…" rows={6} autoFocus />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={saving || !noteBody.trim()}>{saving ? "Saving…" : editingNote ? "Save changes" : "Save note"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={noteToDelete !== null} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this private note?</AlertDialogTitle><AlertDialogDescription>This permanently removes the note from the candidate workflow history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep note</AlertDialogCancel><AlertDialogAction onClick={() => { const noteId = noteToDelete; setNoteToDelete(null); if (noteId !== null) void deleteNote(noteId); }}>Delete note</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this task?</AlertDialogTitle><AlertDialogDescription>This permanently removes “{taskToDelete?.title}” from the candidate workflow.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Keep task</AlertDialogCancel><AlertDialogAction onClick={() => { const task = taskToDelete; setTaskToDelete(null); if (task) void deleteTask(task); }}>Delete task</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
