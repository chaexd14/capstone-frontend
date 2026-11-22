"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Circle,
  ClipboardList,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  History,
  ListTodo,
  MessageSquareText,
  NotebookPen,
  Pencil,
  Plus,
  Star,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { downloadApiFile, fetchApi } from "@/lib/api";
import { getCandidateDisplayName } from "@/lib/candidate-identity";
import {
  Application,
  ApplicationActivity,
  CandidateNote,
  CommunicationTemplate,
  CompetencyRating,
  InterviewSchedule,
  InterviewScorecard,
  RecruiterTask,
  ScorecardRecommendation,
} from "@/types/application";
import { Job } from "@/types/job";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/feedback";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NavTabs } from "@/components/ui/nav-tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

const PRESET_TAGS = ["Urgent", "Silver Medalist", "Strong Technical", "Culture Add", "Relocation"];

const RECOMMENDATION_LABELS: Record<ScorecardRecommendation, { label: string; tone: "success" | "info" | "neutral" | "warning" | "danger" }> = {
  STRONG_YES: { label: "Strong Yes", tone: "success" },
  YES: { label: "Yes", tone: "info" },
  NEUTRAL: { label: "Neutral", tone: "neutral" },
  NO: { label: "No", tone: "warning" },
  STRONG_NO: { label: "Strong No", tone: "danger" },
};

interface CandidateWorkflowContentProps {
  application: Application;
  job?: Job | null;
  anonymize: boolean;
  onApplicationUpdated?: (application: Application) => void;
  initialTab?: string;
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
    fetchApi<InterviewSchedule[]>(`/applications/${applicationId}/interviews/`).catch(() => []),
    fetchApi<InterviewScorecard[]>(`/applications/${applicationId}/scorecards/`).catch(() => []),
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

export function CandidateWorkflowContent({
  application,
  job,
  anonymize,
  onApplicationUpdated,
  initialTab = "tasks",
}: CandidateWorkflowContentProps) {
  const { currentUser, teamMembers } = useRecruiter();

  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [tasks, setTasks] = useState<RecruiterTask[]>([]);
  const [activity, setActivity] = useState<ApplicationActivity[]>([]);
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [interviews, setInterviews] = useState<InterviewSchedule[]>([]);
  const [scorecards, setScorecards] = useState<InterviewScorecard[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [workflowTab, setWorkflowTab] = useState(initialTab);

  // Tasks & Notes dialog state
  const [noteBody, setNoteBody] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<RecruiterTask | null>(null);
  const [editingNote, setEditingNote] = useState<CandidateNote | null>(null);
  const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<RecruiterTask | null>(null);

  // Interviews & Scorecards dialog state
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewTitle, setInterviewTitle] = useState("Initial Screening Interview");
  const [interviewScheduledAt, setInterviewScheduledAt] = useState("");
  const [interviewDuration, setInterviewDuration] = useState("45");
  const [interviewMode, setInterviewMode] = useState<"VIDEO" | "PHONE" | "ONSITE">("VIDEO");
  const [interviewLink, setInterviewLink] = useState("");
  const [interviewNotes, setInterviewNotes] = useState("");

  const [scorecardDialogOpen, setScorecardDialogOpen] = useState(false);
  const [scOverallRating, setScOverallRating] = useState("4");
  const [scRecommendation, setScRecommendation] = useState<ScorecardRecommendation>("YES");
  const [scStrengths, setScStrengths] = useState("");
  const [scConcerns, setScConcerns] = useState("");
  const [scCompetencies, setScCompetencies] = useState<CompetencyRating[]>([]);

  // Tags state
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  // Outreach message state
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const candidateName = getCandidateDisplayName(application, anonymize);
  const openTaskCount = tasks.filter((task) => !task.is_complete).length;
  const companyName = job?.company_name || currentUser?.company || "our team";
  const recruiterName = currentUser?.name || "Recruiting Team";

  const nextInterview = useMemo(
    () => interviews.find((item) => item.status === "SCHEDULED") || interviews[0] || null,
    [interviews]
  );

  const hydrateTemplate = useMemo(
    () => (value: string) =>
      value
        .replaceAll("{{candidate_name}}", candidateName)
        .replaceAll("{{job_title}}", application.job_title || "the role")
        .replaceAll("{{company_name}}", companyName)
        .replaceAll("{{recruiter_name}}", recruiterName)
        .replaceAll(
          "{{interview_date}}",
          nextInterview ? formatWhen(nextInterview.scheduled_at) : "[Insert interview date & time]"
        )
        .replaceAll(
          "{{interview_link}}",
          nextInterview?.meeting_link || "[Insert meeting link]"
        ),
    [application.job_title, candidateName, companyName, nextInterview, recruiterName]
  );

  useEffect(() => {
    let active = true;
    void fetchWorkspace(application.id)
      .then(([notesData, tasksData, activityData, templateData, interviewsData, scorecardsData]) => {
        if (!active) return;
        setNotes(notesData);
        setTasks(tasksData);
        setActivity(activityData);
        setTemplates(templateData);
        setInterviews(interviewsData);
        setScorecards(scorecardsData);
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
  }, [application.id]);

  useEffect(() => {
    if (templates.length > 0 && !selectedTemplate) {
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
  }, [templates, application.status, selectedTemplate, hydrateTemplate]);

  const reloadWorkspace = async () => {
    try {
      const [notesData, tasksData, activityData, templateData, interviewsData, scorecardsData] =
        await fetchWorkspace(application.id);
      setNotes(notesData);
      setTasks(tasksData);
      setActivity(activityData);
      setTemplates(templateData);
      setInterviews(interviewsData);
      setScorecards(scorecardsData);
      const nextOpenCount = tasksData.filter((t) => !t.is_complete).length;
      const avgRating =
        scorecardsData.length > 0
          ? Number(
              (
                scorecardsData.reduce((sum, item) => sum + item.overall_rating, 0) /
                scorecardsData.length
              ).toFixed(2)
            )
          : null;
      onApplicationUpdated?.({
        ...application,
        open_task_count: nextOpenCount,
        interview_count: interviewsData.filter((i) => i.status !== "CANCELLED").length,
        scorecard_count: scorecardsData.length,
        scorecard_avg_rating: avgRating,
      });
    } catch {
      // Non-fatal background sync
    }
  };

  const addNote = async () => {
    if (!noteBody.trim()) return;
    setSaving(true);
    try {
      const note = await fetchApi<CandidateNote>(
        editingNote ? `/applications/${application.id}/notes/${editingNote.id}/` : `/applications/${application.id}/notes/`,
        {
          method: editingNote ? "PATCH" : "POST",
          body: JSON.stringify({ body: noteBody.trim() }),
        }
      );
      setNotes((current) =>
        editingNote ? current.map((item) => (item.id === note.id ? note : item)) : [note, ...current]
      );
      setNoteBody("");
      setEditingNote(null);
      setNoteDialogOpen(false);
      void reloadWorkspace();
      toast.success(editingNote ? "Private note updated" : "Private note added");
    } catch (error) {
      toast.error("Note not saved", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: number) => {
    try {
      await fetchApi(`/applications/${application.id}/notes/${noteId}/`, { method: "DELETE" });
      setNotes((current) => current.filter((note) => note.id !== noteId));
      toast.success("Note removed");
    } catch (error) {
      toast.error("Note not removed", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const addTask = async () => {
    if (!taskTitle.trim()) return;
    setSaving(true);
    const chosenMember = teamMembers.find((m) => m.id === taskAssigneeId);
    try {
      const task = await fetchApi<RecruiterTask>(
        editingTask ? `/applications/${application.id}/tasks/${editingTask.id}/` : `/applications/${application.id}/tasks/`,
        {
          method: editingTask ? "PATCH" : "POST",
          body: JSON.stringify({
            title: taskTitle.trim(),
            priority: taskPriority,
            due_at: taskDueAt ? new Date(taskDueAt).toISOString() : null,
            ...(chosenMember
              ? { assigned_to: chosenMember.id, assigned_to_name: chosenMember.name }
              : {}),
          }),
        }
      );
      setTasks((current) =>
        editingTask ? current.map((item) => (item.id === task.id ? task : item)) : [task, ...current]
      );
      setTaskTitle("");
      setTaskDueAt("");
      setTaskPriority("MEDIUM");
      setTaskAssigneeId("");
      setEditingTask(null);
      setTaskDialogOpen(false);
      void reloadWorkspace();
      toast.success(editingTask ? "Follow-up task updated" : "Follow-up task created");
    } catch (error) {
      toast.error("Task not saved", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task: RecruiterTask) => {
    try {
      const updated = await fetchApi<RecruiterTask>(
        `/applications/${application.id}/tasks/${task.id}/`,
        { method: "PATCH", body: JSON.stringify({ is_complete: !task.is_complete }) }
      );
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      void reloadWorkspace();
    } catch (error) {
      toast.error("Task not updated", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const deleteTask = async (task: RecruiterTask) => {
    try {
      await fetchApi(`/applications/${application.id}/tasks/${task.id}/`, { method: "DELETE" });
      setTasks((current) => current.filter((item) => item.id !== task.id));
      void reloadWorkspace();
      toast.success("Task removed");
    } catch (error) {
      toast.error("Task not removed", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const saveInterview = async () => {
    if (!interviewTitle.trim() || !interviewScheduledAt) return;
    setSaving(true);
    try {
      const created = await fetchApi<InterviewSchedule>(`/applications/${application.id}/interviews/`, {
        method: "POST",
        body: JSON.stringify({
          title: interviewTitle.trim(),
          scheduled_at: new Date(interviewScheduledAt).toISOString(),
          duration_minutes: Number(interviewDuration) || 45,
          mode: interviewMode,
          meeting_link: interviewLink.trim(),
          notes: interviewNotes.trim(),
          interviewer_names: [recruiterName],
        }),
      });
      setInterviews((prev) => [created, ...prev]);
      setInterviewDialogOpen(false);
      setInterviewTitle("Initial Screening Interview");
      setInterviewScheduledAt("");
      setInterviewLink("");
      setInterviewNotes("");
      void reloadWorkspace();
      toast.success("Interview scheduled");
    } catch (error) {
      toast.error("Interview not scheduled", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const updateInterviewStatus = async (interview: InterviewSchedule, status: InterviewSchedule["status"]) => {
    try {
      const updated = await fetchApi<InterviewSchedule>(
        `/applications/${application.id}/interviews/${interview.id}/`,
        { method: "PATCH", body: JSON.stringify({ status }) }
      );
      setInterviews((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      void reloadWorkspace();
      toast.success(`Interview marked ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Could not update interview", { description: error instanceof Error ? error.message : "Try again." });
    }
  };

  const downloadIcs = async (interview: InterviewSchedule) => {
    try {
      await downloadApiFile(
        `/applications/${application.id}/interviews/${interview.id}/ics/`,
        `interview-${application.candidate_code}-${interview.id}.ics`,
        {}
      );
      toast.success("Calendar invite downloaded");
    } catch {
      toast.error("Could not download calendar invite");
    }
  };

  const openScorecardDialog = () => {
    const baseCompetencies: CompetencyRating[] =
      (job?.required_skills?.slice(0, 5) ||
        application.match_result?.matched_skills?.slice(0, 4) ||
        ["Role competence", "Communication", "Problem solving"]
      ).map((skill) => ({ label: skill, rating: 4, note: "" }));
    setScCompetencies(baseCompetencies);
    setScOverallRating("4");
    setScRecommendation("YES");
    setScStrengths("");
    setScConcerns("");
    setScorecardDialogOpen(true);
  };

  const saveScorecard = async () => {
    setSaving(true);
    try {
      const created = await fetchApi<InterviewScorecard>(`/applications/${application.id}/scorecards/`, {
        method: "POST",
        body: JSON.stringify({
          interview: nextInterview?.id ?? null,
          overall_rating: Number(scOverallRating) || 3,
          recommendation: scRecommendation,
          competency_ratings: scCompetencies,
          strengths: scStrengths.trim(),
          concerns: scConcerns.trim(),
        }),
      });
      setScorecards((prev) => [created, ...prev]);
      setScorecardDialogOpen(false);
      void reloadWorkspace();
      toast.success("Interview scorecard saved");
    } catch (error) {
      toast.error("Scorecard not saved", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSaving(false);
    }
  };

  const persistTags = async (nextTags: string[]) => {
    setSavingTags(true);
    try {
      const updated = await fetchApi<Application>(`/applications/${application.id}/tags/`, {
        method: "PATCH",
        body: JSON.stringify({ tags: nextTags }),
      });
      onApplicationUpdated?.(updated);
      void reloadWorkspace();
      toast.success("Candidate tags updated");
    } catch (error) {
      toast.error("Tags not updated", { description: error instanceof Error ? error.message : "Try again." });
    } finally {
      setSavingTags(false);
    }
  };

  const addTag = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    const current = application.tags || [];
    if (current.some((t) => t.toLowerCase() === cleaned.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTagInput("");
    void persistTags([...current, cleaned].slice(0, 10));
  };

  const removeTag = (tagToRemove: string) => {
    const current = application.tags || [];
    void persistTags(current.filter((t) => t !== tagToRemove));
  };

  const applyTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((item) => String(item.id) === String(templateId));
    if (!template) return;
    setMessageSubject(hydrateTemplate(template.subject));
    setMessageBody(hydrateTemplate(template.body));
  };

  const recordDraftAction = async (draftAction: "OPENED_GMAIL" | "COPIED") => {
    if (!messageSubject.trim() || !messageBody.trim()) return;
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

  const canComposeEmail = Boolean(application.email && messageSubject.trim() && messageBody.trim());
  const gmailUrl = (() => {
    if (!application.email || !messageSubject.trim() || !messageBody.trim()) return "";
    const params = new URLSearchParams({
      view: "cm",
      fs: "1",
      to: application.email,
      su: messageSubject.trim(),
      body: messageBody.trim(),
    });
    return `https://mail.google.com/mail/?${params.toString()}`;
  })();

  const copyEmail = async () => {
    if (!canComposeEmail) return;
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
    <Tabs value={workflowTab} onValueChange={setWorkflowTab} className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 bg-card">
        <NavTabs
          label="Candidate workflow"
          value={workflowTab}
          onValueChange={setWorkflowTab}
          className="px-5 sm:px-6"
          tabs={[
            { id: "tasks", label: "Tasks", count: loading ? undefined : openTaskCount, icon: <ListTodo /> },
            { id: "interviews", label: "Interviews", count: loading ? undefined : interviews.length + scorecards.length, icon: <Calendar /> },
            { id: "notes", label: "Notes", count: loading ? undefined : notes.length, icon: <NotebookPen /> },
            { id: "message", label: "Message", icon: <MessageSquareText /> },
            { id: "history", label: "Tags & History", icon: <History /> },
          ]}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-muted/40 px-5 py-5 sm:px-6 sm:py-6">
        <TabsContent value="tasks" className="mt-0 space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border p-5">
              <div>
                <CardTitle>Follow-up tasks</CardTitle>
                <CardDescription className="mt-1">Assign next actions with priority, due date, and teammate ownership.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingTask(null);
                  setTaskTitle("");
                  setTaskPriority("MEDIUM");
                  setTaskDueAt("");
                  setTaskAssigneeId(currentUser?.id || "");
                  setTaskDialogOpen(true);
                }}
                className="shrink-0 gap-2"
              >
                <Plus className="size-4" />New task
              </Button>
            </CardHeader>
            <CardContent className="p-3 sm:p-4" aria-label="Candidate tasks">
              {loading ? (
                <ContextualLoading label="Loading candidate tasks" className="min-h-32" />
              ) : tasks.length === 0 ? (
                <EmptyState title="No follow-up tasks" description="Create the next action to keep this candidate moving." className="min-h-32 py-6" />
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-2 rounded-xl p-2 transition-colors hover:bg-muted/50">
                    <IconButton
                      label={task.is_complete ? `Mark ${task.title} incomplete` : `Complete ${task.title}`}
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => void toggleTask(task)}
                      className="mt-1 shrink-0"
                    >
                      {task.is_complete ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                    </IconButton>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-medium ${task.is_complete ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {task.title}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Clock3 className="size-4" />
                        {formatWhen(task.due_at)} · {task.priority.toLowerCase()} priority
                        {task.assigned_to_name ? ` · ${task.assigned_to_name}` : ""}
                      </span>
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton
                        label={`Edit ${task.title}`}
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingTask(task);
                          setTaskTitle(task.title);
                          setTaskPriority(task.priority);
                          setTaskDueAt(formatDateTimeInput(task.due_at));
                          setTaskAssigneeId(task.assigned_to || "");
                          setTaskDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton label={`Delete ${task.title}`} variant="ghost" size="icon-sm" onClick={() => setTaskToDelete(task)}>
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interviews" className="mt-0 space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border p-5">
              <div>
                <CardTitle>Interview schedule</CardTitle>
                <CardDescription className="mt-1">Coordinate sessions and export calendar invites (.ics).</CardDescription>
              </div>
              <Button onClick={() => setInterviewDialogOpen(true)} className="shrink-0 gap-2">
                <CalendarPlus className="size-4" />Schedule
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {loading ? (
                <ContextualLoading label="Loading interviews" className="min-h-24" />
              ) : interviews.length === 0 ? (
                <EmptyState title="No interviews scheduled" description="Schedule a video, phone, or on-site session to track candidate conversations." className="min-h-24 py-4" />
              ) : (
                <div className="divide-y divide-border">
                  {interviews.map((item) => (
                    <div key={item.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <StatusBadge
                              status={
                                item.status === "COMPLETED" ? "success" : item.status === "CANCELLED" ? "danger" : "info"
                              }
                            >
                              {item.status.toLowerCase()}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatWhen(item.scheduled_at)} · {item.duration_minutes} min · {item.mode.toLowerCase()}
                          </p>
                          {item.meeting_link ? (
                            <p className="mt-0.5 truncate text-sm text-primary">{item.meeting_link}</p>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button type="button" variant="outline" size="sm" onClick={() => void downloadIcs(item)}>
                            <Download className="size-3.5" />.ics
                          </Button>
                          {item.status === "SCHEDULED" ? (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => void updateInterviewStatus(item, "COMPLETED")}
                            >
                              Mark done
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border p-5">
              <div>
                <CardTitle>Structured scorecards</CardTitle>
                <CardDescription className="mt-1">Consistent rubric-aligned interview evaluations from your hiring team.</CardDescription>
              </div>
              <Button variant="secondary" onClick={openScorecardDialog} className="shrink-0 gap-2">
                <ClipboardList className="size-4" />Add scorecard
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {scorecards.length === 0 ? (
                <EmptyState title="No scorecards submitted" description="Capture structured 1–5 competency ratings and a hiring recommendation after interviews." className="min-h-24 py-4" />
              ) : (
                <div className="divide-y divide-border">
                  {scorecards.map((sc) => {
                    const rec = RECOMMENDATION_LABELS[sc.recommendation] || RECOMMENDATION_LABELS.NEUTRAL;
                    return (
                      <article key={sc.id} className="space-y-2.5 py-4 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{sc.evaluator_name}</p>
                            <p className="text-sm text-muted-foreground">{formatWhen(sc.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1 tabular-nums">
                              <Star className="size-3.5 text-amber-500" aria-hidden="true" />
                              {sc.overall_rating}/5
                            </Badge>
                            <StatusBadge status={rec.tone}>{rec.label}</StatusBadge>
                          </div>
                        </div>
                        {sc.competency_ratings?.length ? (
                          <div className="flex flex-wrap gap-1.5">
                            {sc.competency_ratings.map((c, idx) => (
                              <Badge key={idx} variant="secondary" className="tabular-nums">
                                {c.label}: {c.rating}/5
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                        {sc.strengths ? <p className="text-sm text-foreground"><strong>Strengths:</strong> {sc.strengths}</p> : null}
                        {sc.concerns ? <p className="text-sm text-muted-foreground"><strong>Concerns:</strong> {sc.concerns}</p> : null}
                      </article>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="mt-0 space-y-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border p-5">
              <div>
                <CardTitle>Private notes</CardTitle>
                <CardDescription className="mt-1">Capture recruiter-only evidence, context, and follow-up questions.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingNote(null);
                  setNoteBody("");
                  setNoteDialogOpen(true);
                }}
                className="shrink-0 gap-2"
              >
                <Plus className="size-4" />New note
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              <div className="divide-y divide-border">
                {notes.length === 0 ? (
                  <EmptyState title="No private notes" description="Recruiter-only context will appear here." className="min-h-32 py-6" />
                ) : (
                  notes.map((note) => (
                    <article key={note.id} className="py-4 first:pt-2 last:pb-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{note.author_name}</p>
                          <p className="text-sm text-muted-foreground">{formatWhen(note.created_at)}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <IconButton
                            label="Edit note"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              setEditingNote(note);
                              setNoteBody(note.body);
                              setNoteDialogOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </IconButton>
                          <IconButton label="Delete note" variant="ghost" size="icon-sm" onClick={() => setNoteToDelete(note.id)}>
                            <Trash2 className="size-4" />
                          </IconButton>
                        </div>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{note.body}</p>
                    </article>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="message" className="mt-0 space-y-4">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="rounded-xl border border-primary/15 bg-secondary/70 px-4 py-3 text-sm leading-6 text-foreground">
                Prepare a draft, then open it in Gmail or copy it. Variables automatically use <strong>{companyName}</strong> and <strong>{recruiterName}</strong>.
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
                <Input id="workflow-recipient" value={anonymize && !["SHORTLISTED", "INTERVIEW", "HIRED"].includes(application.status) ? "Hidden by blind screening" : application.email || ""} readOnly className="bg-muted text-muted-foreground" />
              </FormField>
              <FormField label="Subject" htmlFor="workflow-subject">
                <Input id="workflow-subject" maxLength={200} value={messageSubject} onChange={(event) => setMessageSubject(event.target.value)} />
              </FormField>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="workflow-message">Message</Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button variant="secondary" size="sm" type="button" onClick={() => setMessageBody((prev) => `${prev} ${candidateName}`)} className="h-7 px-2 text-sm">+ candidate</Button>
                    <Button variant="secondary" size="sm" type="button" onClick={() => setMessageBody((prev) => `${prev} ${application.job_title || ""}`)} className="h-7 px-2 text-sm">+ role</Button>
                    {nextInterview ? (
                      <Button variant="secondary" size="sm" type="button" onClick={() => setMessageBody((prev) => `${prev}\nInterview: ${formatWhen(nextInterview.scheduled_at)}${nextInterview.meeting_link ? ` (${nextInterview.meeting_link})` : ""}`)} className="h-7 px-2 text-sm">+ interview slot</Button>
                    ) : null}
                  </div>
                </div>
                <Textarea id="workflow-message" maxLength={5000} rows={9} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {canComposeEmail ? (
                  <Button asChild className="gap-2">
                    <a
                      href={gmailUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        toast.success("Gmail draft opened", { description: "Review and send it from Gmail when ready." });
                        void recordDraftAction("OPENED_GMAIL");
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />Open in Gmail
                    </a>
                  </Button>
                ) : (
                  <Button disabled className="gap-2"><ExternalLink className="h-4 w-4" />Open in Gmail</Button>
                )}
                <Button variant="outline" onClick={() => void copyEmail()} disabled={!canComposeEmail} className="gap-2">
                  <Copy className="h-4 w-4" />Copy email
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-0 space-y-5">
          <Card>
            <CardHeader className="border-b border-border p-5">
              <CardTitle className="flex items-center gap-2"><Tag className="size-4 text-primary" />Candidate tags</CardTitle>
              <CardDescription>Organize strong profiles, silver medalists, or special logistics for quick search.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap gap-1.5">
                {(application.tags || []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags assigned yet.</p>
                ) : (
                  (application.tags || []).map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1.5 py-1 pl-2.5 pr-1.5">
                      <span>{tag}</span>
                      <IconButton
                        label={`Remove tag ${tag}`}
                        variant="ghost"
                        size="icon-sm"
                        disabled={savingTags}
                        onClick={() => removeTag(tag)}
                        className="size-5"
                      >
                        <X className="size-3.5" />
                      </IconButton>
                    </Badge>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagInput);
                    }
                  }}
                  placeholder="Add a custom tag…"
                  aria-label="Add candidate tag"
                  maxLength={40}
                />
                <Button type="button" variant="outline" disabled={savingTags || !tagInput.trim()} onClick={() => addTag(tagInput)}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.filter((t) => !(application.tags || []).includes(t)).map((preset) => (
                  <Button key={preset} type="button" variant="ghost" size="sm" disabled={savingTags} onClick={() => addTag(preset)}>
                    + {preset}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-5 pb-0">
              <CardTitle>Workflow history</CardTitle>
              <CardDescription>Status changes, notes, tasks, interviews, scorecards, and outreach actions.</CardDescription>
            </CardHeader>
            <CardContent className="p-5">
              <div className="relative space-y-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-border">
                {activity.length === 0 ? (
                  <EmptyState title="No workflow activity" description="Status, notes, tasks, and outreach actions will be recorded here." className="min-h-32 py-6" />
                ) : (
                  activity.map((entry) => (
                    <article key={entry.id} className="relative flex gap-3 pl-0">
                      <span className="mt-1.5 size-[15px] shrink-0 rounded-full border-4 border-card bg-primary ring-1 ring-primary/20" />
                      <div className="min-w-0 pb-2">
                        <p className="text-sm font-medium text-foreground">{entry.summary}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{entry.actor_name} · {formatWhen(entry.created_at)}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </div>

      {/* Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={(open) => { setTaskDialogOpen(open); if (!open) setEditingTask(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTask ? "Edit follow-up task" : "Create follow-up task"}</DialogTitle>
            <DialogDescription>Assign the next action, priority, teammate owner, and optional due date.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Task" htmlFor="workflow-task" required>
              <Input id="workflow-task" autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="Schedule a screening call" />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Priority" htmlFor="workflow-priority">
                <Select value={taskPriority} onValueChange={(value) => setTaskPriority(value as typeof taskPriority)}>
                  <SelectTrigger id="workflow-priority"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Due" htmlFor="workflow-due">
                <Input id="workflow-due" type="datetime-local" value={taskDueAt} onChange={(event) => setTaskDueAt(event.target.value)} />
              </FormField>
            </div>
            {teamMembers.length > 0 ? (
              <FormField label="Assign to" htmlFor="workflow-assignee">
                <Select value={taskAssigneeId || "me"} onValueChange={(val) => setTaskAssigneeId(val === "me" ? "" : val)}>
                  <SelectTrigger id="workflow-assignee"><SelectValue placeholder="Assign to me" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Myself ({recruiterName})</SelectItem>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} ({member.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void addTask()} disabled={saving || !taskTitle.trim()}>
              {saving ? "Saving…" : editingTask ? "Save changes" : "Create task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={noteDialogOpen} onOpenChange={(open) => { setNoteDialogOpen(open); if (!open) setEditingNote(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingNote ? "Edit private note" : "Add a private note"}</DialogTitle>
            <DialogDescription>Capture evidence or context for your recruiting team. Candidates cannot see this note.</DialogDescription>
          </DialogHeader>
          <FormField label="Note" htmlFor="workflow-note">
            <Textarea id="workflow-note" value={noteBody} onChange={(event) => setNoteBody(event.target.value)} placeholder="Add evidence, context, or a follow-up question…" rows={6} autoFocus />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void addNote()} disabled={saving || !noteBody.trim()}>
              {saving ? "Saving…" : editingNote ? "Save changes" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule interview</DialogTitle>
            <DialogDescription>Record an interview slot for {candidateName} and download a calendar invite.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Session title" htmlFor="interview-title" required>
              <Input id="interview-title" value={interviewTitle} onChange={(e) => setInterviewTitle(e.target.value)} placeholder="Technical Screening Call" />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Date & time" htmlFor="interview-when" required>
                <Input id="interview-when" type="datetime-local" value={interviewScheduledAt} onChange={(e) => setInterviewScheduledAt(e.target.value)} />
              </FormField>
              <FormField label="Duration (minutes)" htmlFor="interview-duration">
                <Select value={interviewDuration} onValueChange={setInterviewDuration}>
                  <SelectTrigger id="interview-duration"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="90">90 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Format" htmlFor="interview-mode">
                <Select value={interviewMode} onValueChange={(v) => setInterviewMode(v as typeof interviewMode)}>
                  <SelectTrigger id="interview-mode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIDEO">Video call</SelectItem>
                    <SelectItem value="PHONE">Phone screen</SelectItem>
                    <SelectItem value="ONSITE">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Meeting link or room" htmlFor="interview-link">
                <Input id="interview-link" value={interviewLink} onChange={(e) => setInterviewLink(e.target.value)} placeholder="https://meet.google.com/…" />
              </FormField>
            </div>
            <FormField label="Prep notes" htmlFor="interview-notes">
              <Textarea id="interview-notes" rows={3} value={interviewNotes} onChange={(e) => setInterviewNotes(e.target.value)} placeholder="Focus areas or panel instructions…" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveInterview()} disabled={saving || !interviewTitle.trim() || !interviewScheduledAt}>
              {saving ? "Scheduling…" : "Schedule interview"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Structured Scorecard Dialog */}
      <Dialog open={scorecardDialogOpen} onOpenChange={setScorecardDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit interview scorecard</DialogTitle>
            <DialogDescription>Rate core qualifications objectively for {candidateName}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Overall rating (1–5)" htmlFor="sc-overall">
                <Select value={scOverallRating} onValueChange={setScOverallRating}>
                  <SelectTrigger id="sc-overall"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 — Exceptional</SelectItem>
                    <SelectItem value="4">4 — Strong</SelectItem>
                    <SelectItem value="3">3 — Meets bar</SelectItem>
                    <SelectItem value="2">2 — Below bar</SelectItem>
                    <SelectItem value="1">1 — Not a fit</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Hiring recommendation" htmlFor="sc-rec">
                <Select value={scRecommendation} onValueChange={(v) => setScRecommendation(v as ScorecardRecommendation)}>
                  <SelectTrigger id="sc-rec"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STRONG_YES">Strong Yes</SelectItem>
                    <SelectItem value="YES">Yes</SelectItem>
                    <SelectItem value="NEUTRAL">Neutral</SelectItem>
                    <SelectItem value="NO">No</SelectItem>
                    <SelectItem value="STRONG_NO">Strong No</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>
            </div>
            {scCompetencies.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5">
                <p className="text-sm font-semibold text-foreground">Competency ratings</p>
                {scCompetencies.map((comp, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-foreground">{comp.label}</span>
                    <Select
                      value={String(comp.rating)}
                      onValueChange={(val) =>
                        setScCompetencies((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, rating: Number(val) } : item))
                        )
                      }
                    >
                      <SelectTrigger className="w-28" aria-label={`Rate ${comp.label}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[5, 4, 3, 2, 1].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} / 5</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : null}
            <FormField label="Verified strengths" htmlFor="sc-strengths">
              <Textarea id="sc-strengths" rows={3} value={scStrengths} onChange={(e) => setScStrengths(e.target.value)} placeholder="Specific examples demonstrated during the interview…" />
            </FormField>
            <FormField label="Risks or gaps to clarify" htmlFor="sc-concerns">
              <Textarea id="sc-concerns" rows={3} value={scConcerns} onChange={(e) => setScConcerns(e.target.value)} placeholder="Any missing depth or open questions…" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScorecardDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveScorecard()} disabled={saving}>
              {saving ? "Saving…" : "Submit scorecard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={noteToDelete !== null} onOpenChange={(open) => !open && setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this private note?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the note from the candidate workflow history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep note</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const noteId = noteToDelete; setNoteToDelete(null); if (noteId !== null) void deleteNote(noteId); }}>Delete note</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={taskToDelete !== null} onOpenChange={(open) => !open && setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes “{taskToDelete?.title}” from the candidate workflow.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep task</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const task = taskToDelete; setTaskToDelete(null); if (task) void deleteTask(task); }}>Delete task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}
