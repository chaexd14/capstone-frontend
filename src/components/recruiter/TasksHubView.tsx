"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Circle, Clock3, RefreshCw } from "lucide-react";
import { useRecruiter } from "@/context/RecruiterContext";
import { fetchApi, type PaginatedTasksResponse } from "@/lib/api";
import { Application, GlobalRecruiterTask } from "@/types/application";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { IconButton } from "@/components/ui/icon-button";
import { MetricSummary } from "@/components/ui/metric-summary";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { CollectionToolbar } from "@/components/ui/toolbar";
import { ServerPagination } from "@/components/ui/server-pagination";

interface TasksHubViewProps {
  onSelectApplication: (app: Application) => void;
}

type TaskStatusFilter = "open" | "overdue" | "completed" | "all";

function classifyTaskDue(dueAt?: string | null): { isOverdue: boolean; isDueToday: boolean } {
  if (!dueAt) return { isOverdue: false, isDueToday: false };
  const nowDate = new Date();
  const nowMs = nowDate.getTime();
  const dueMs = new Date(dueAt).getTime();
  const todayEnd = new Date(nowDate);
  todayEnd.setHours(23, 59, 59, 999);
  return {
    isOverdue: dueMs < nowMs,
    isDueToday: dueMs >= nowMs && dueMs <= todayEnd.getTime(),
  };
}

function formatDue(value?: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function TasksHubView({ onSelectApplication }: TasksHubViewProps) {
  const { applications, jobs, anonymize, adjustTaskCounts, mergeApplicationPatch } = useRecruiter();
  const [tasks, setTasks] = useState<GlobalRecruiterTask[]>([]);
  const [summary, setSummary] = useState({ open: 0, overdue: 0, due_today: 0 });
  const [fetchedAtMs, setFetchedAtMs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusTab, setStatusTab] = useState<TaskStatusFilter>("open");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<PaginatedTasksResponse<GlobalRecruiterTask> | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ status: statusTab, assigned_to: assigneeFilter });
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (jobFilter !== "all") params.set("job_id", jobFilter);
      if (debouncedQuery) params.set("q", debouncedQuery);
      params.set("page", String(page));
      params.set("page_size", "20");
      const data = await fetchApi<PaginatedTasksResponse<GlobalRecruiterTask>>(`/applications/tasks/?${params.toString()}`);
      setTasks(data.results || []);
      setPageData(data);
      setSummary(data.summary || { open: 0, overdue: 0, due_today: 0 });
      setFetchedAtMs(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load follow-up tasks.");
    } finally {
      setLoading(false);
    }
  }, [assigneeFilter, debouncedQuery, jobFilter, page, priorityFilter, statusTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchTasks();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchTasks]);

  const toggleTask = async (task: GlobalRecruiterTask) => {
    const nextComplete = !task.is_complete;
    const prevTasks = tasks;
    const prevSummary = summary;
    const { isOverdue, isDueToday } = classifyTaskDue(task.due_at);

    const openDelta = nextComplete ? -1 : 1;
    const overdueDelta = isOverdue ? openDelta : 0;
    const dueTodayDelta = isDueToday ? openDelta : 0;

    // Optimistic update for task row, summary counters, and sidebar badge
    setTasks((prev) => {
      const updatedList = prev.map((item) =>
        item.id === task.id
          ? { ...item, is_complete: nextComplete, completed_at: nextComplete ? new Date().toISOString() : null }
          : item
      );
      if (statusTab === "open" || statusTab === "overdue") {
        return updatedList.filter((item) => !item.is_complete);
      }
      if (statusTab === "completed") {
        return updatedList.filter((item) => item.is_complete);
      }
      return updatedList;
    });
    setSummary((prev) => ({
      open: Math.max(0, prev.open + openDelta),
      overdue: Math.max(0, prev.overdue + overdueDelta),
      due_today: Math.max(0, prev.due_today + dueTodayDelta),
    }));
    adjustTaskCounts(openDelta, overdueDelta);
    const linkedApp = applications.find((a) => a.id === task.application);
    if (linkedApp) {
      mergeApplicationPatch(linkedApp.id, {
        open_task_count: Math.max(0, (linkedApp.open_task_count || 0) + openDelta),
      });
    }
    toast.success(nextComplete ? "Task completed" : "Task reopened");

    try {
      await fetchApi<GlobalRecruiterTask>(
        `/applications/${task.application}/tasks/${task.id}/`,
        { method: "PATCH", body: JSON.stringify({ is_complete: nextComplete }) }
      );
    } catch (err) {
      setTasks(prevTasks);
      setSummary(prevSummary);
      adjustTaskCounts(-openDelta, -overdueDelta);
      if (linkedApp) {
        mergeApplicationPatch(linkedApp.id, {
          open_task_count: linkedApp.open_task_count || 0,
        });
      }
      toast.error("Task not updated", {
        description: err instanceof Error ? err.message : "Try again.",
      });
    }
  };

  const filteredTasks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return tasks;
    return tasks.filter((task) =>
      [
        task.title,
        task.candidate_code,
        task.job_title,
        task.assigned_to_name,
        ...(anonymize ? [] : [task.applicant_name]),
      ].some((val) => val?.toLowerCase().includes(needle))
    );
  }, [anonymize, query, tasks]);

  const hasFilters = Boolean(query.trim() || priorityFilter !== "ALL" || assigneeFilter !== "all" || jobFilter !== "all");
  const clearFilters = () => {
    setQuery("");
    setPriorityFilter("ALL");
    setAssigneeFilter("all");
    setJobFilter("all");
    setPage(1);
  };

  const nowMs = fetchedAtMs;

  return (
    <div className="space-y-6">
      <PageHeader className="border-b border-border pb-6">
        <div>
          <PageHeaderTitle>Follow-up tasks</PageHeaderTitle>
          <PageHeaderDescription>
            Track every candidate follow-up across active requisitions so strong applicants never slip through the cracks.
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <Button type="button" variant="outline" onClick={() => void fetchTasks()} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <section aria-label="Task summary" className="grid grid-cols-3 gap-x-6 gap-y-4 border-b border-border pb-6">
        <MetricSummary label="Open tasks" value={summary.open} description="Active follow-ups" tone="brand" />
        <MetricSummary label="Overdue" value={summary.overdue} description="Past due date" />
        <MetricSummary label="Due today" value={summary.due_today} description="Needs action today" tone="success" />
      </section>

      <CollectionToolbar
        label="Task inbox controls"
        tabs={
          <FilterTabs
            label="Task status"
            value={statusTab}
            onValueChange={(value) => { setStatusTab(value as TaskStatusFilter); setPage(1); }}
            tabs={[
              { id: "open", label: "Open", count: summary.open },
              { id: "overdue", label: "Overdue", count: summary.overdue },
              { id: "completed", label: "Completed" },
              { id: "all", label: "All" },
            ]}
          />
        }
        search={
          <SearchInput
            aria-label="Search tasks"
            placeholder="Search task, candidate code, or job…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            containerClassName="w-full sm:w-64"
          />
        }
        filterFields={[
          {
            id: "assignee",
            label: "Task owner",
            value: assigneeFilter,
            defaultValue: "all",
            options: [
              { value: "all", label: "All owners" },
              { value: "me", label: "Assigned to me" },
            ],
          },
          {
            id: "priority",
            label: "Priority",
            value: priorityFilter,
            defaultValue: "ALL",
            options: [
              { value: "ALL", label: "All priorities" },
              { value: "HIGH", label: "High priority" },
              { value: "MEDIUM", label: "Medium" },
              { value: "LOW", label: "Low" },
            ],
          },
          {
            id: "job",
            label: "Job requisition",
            value: jobFilter,
            defaultValue: "all",
            triggerClassName: "w-48",
            options: [
              { value: "all", label: "All requisitions" },
              ...jobs.map((job) => ({ value: String(job.id), label: job.title })),
            ],
          },
        ]}
        onFilterValuesChange={(values) => {
          setAssigneeFilter(values.assignee);
          setPriorityFilter(values.priority);
          setJobFilter(values.job);
          setPage(1);
        }}
        hasActiveFilters={hasFilters}
        onClearFilters={clearFilters}
      />

      {loading ? (
        <ContextualLoading label="Loading recruiter tasks" />
      ) : error ? (
        <ErrorState title="Could not load tasks" description={error} onAction={() => void fetchTasks()} />
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          title={hasFilters ? "No tasks match these filters" : "No tasks in this queue"}
          description={
            hasFilters
              ? "Clear filters to view your full follow-up backlog."
              : "Tasks created inside any candidate review modal or pipeline card will appear here."
          }
          actionLabel={hasFilters ? "Clear filters" : undefined}
          onAction={hasFilters ? clearFilters : undefined}
          className="rounded-2xl border border-dashed border-border bg-muted/30"
        />
      ) : (
        <section aria-label="Task list" className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          {filteredTasks.map((task) => {
            const isOverdue = !task.is_complete && Boolean(task.due_at && new Date(task.due_at).getTime() < nowMs);
            const linkedApp = applications.find((a) => a.id === task.application);
            const candidateLabel = anonymize
              ? task.candidate_code
              : `${task.applicant_name} (${task.candidate_code})`;

            return (
              <div
                key={task.id}
                className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <IconButton
                    label={task.is_complete ? `Reopen ${task.title}` : `Complete ${task.title}`}
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void toggleTask(task)}
                    className="mt-0.5 shrink-0"
                  >
                    {task.is_complete ? (
                      <CheckCircle2 className="size-5 text-success" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground" />
                    )}
                  </IconButton>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-semibold ${task.is_complete ? "text-muted-foreground line-through" : "text-foreground"
                          }`}
                      >
                        {task.title}
                      </span>
                      <StatusBadge
                        status={
                          task.priority === "HIGH" ? "danger" : task.priority === "MEDIUM" ? "warning" : "neutral"
                        }
                      >
                        {task.priority.toLowerCase()}
                      </StatusBadge>
                      {isOverdue ? <StatusBadge status="danger" dot>Overdue</StatusBadge> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{candidateLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{task.job_title}</span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Clock3 className="size-3.5" aria-hidden="true" />
                        {formatDue(task.due_at)}
                      </span>
                      {task.assigned_to_name ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <Badge variant="outline">{task.assigned_to_name}</Badge>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {linkedApp ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onSelectApplication(linkedApp)}
                    className="shrink-0 self-start sm:self-center"
                  >
                    <span>Open candidate</span>
                    <ArrowRight aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </section>
      )}
      {pageData ? (
        <ServerPagination
          page={pageData.page}
          pageSize={pageData.page_size}
          count={pageData.count}
          totalPages={pageData.total_pages}
          loading={loading}
          onPageChange={setPage}
        />
      ) : null}
    </div>
  );
}
