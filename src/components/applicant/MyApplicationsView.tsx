"use client";

import React from "react";
import {
  ArrowRight,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Search,
} from "lucide-react";
import { Application } from "@/types/application";
import { Job } from "@/types/job";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { MetricSummary } from "@/components/ui/metric-summary";
import {
  PageHeader,
  PageHeaderActions,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { Progress } from "@/components/ui/progress";
import { Section } from "@/components/ui/section";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

interface ApplicationStatusMeta {
  label: string;
  sublabel: string;
  badgeStatus: NonNullable<StatusBadgeProps["status"]>;
  stepIndex: number;
  progressValue: number;
  indicatorClassName: string;
}

function getApplicationStatusMeta(status?: string): ApplicationStatusMeta {
  const norm = (status || "").toUpperCase();
  if (norm === "SHORTLISTED") {
    return {
      label: "Shortlisted",
      sublabel:
        "Congratulations! You have been shortlisted for this position based on transparent merit scoring.",
      badgeStatus: "success",
      stepIndex: 2,
      progressValue: 100,
      indicatorClassName: "bg-success",
    };
  }
  if (norm === "INTERVIEW") {
    return {
      label: "Interview Scheduled",
      sublabel: "The hiring team will reach out to coordinate your interview schedule.",
      badgeStatus: "info",
      stepIndex: 2,
      progressValue: 100,
      indicatorClassName: "bg-primary",
    };
  }
  if (norm === "HIRED") {
    return {
      label: "Offer Extended",
      sublabel: "An offer has been extended for this role.",
      badgeStatus: "success",
      stepIndex: 2,
      progressValue: 100,
      indicatorClassName: "bg-success",
    };
  }
  if (norm === "REJECTED") {
    return {
      label: "Not Selected",
      sublabel:
        "Evaluation completed. Specific required skill or credential thresholds were not met for this requisition.",
      badgeStatus: "neutral",
      stepIndex: 2,
      progressValue: 100,
      indicatorClassName: "bg-muted-foreground",
    };
  }
  if (norm === "UNDER_REVIEW" || norm === "PROCESSING") {
    return {
      label: "Under Review",
      sublabel: "The hiring team is actively evaluating your qualifications and experience.",
      badgeStatus: "processing",
      stepIndex: 1,
      progressValue: 66,
      indicatorClassName: "bg-primary",
    };
  }
  return {
    label: "Application Received",
    sublabel: "Your application has been received and queued for merit-based review.",
    badgeStatus: "neutral",
    stepIndex: 0,
    progressValue: 33,
    indicatorClassName: "bg-primary",
  };
}

interface MyApplicationsViewProps {
  applications: Application[];
  jobs: Job[];
  pendingCount: number;
  shortlistedCount: number;
  hasMoreApplications?: boolean;
  loadingMore?: boolean;
  onLoadMoreApplications?: () => void;
  onExplore: () => void;
  onOpenJobDetails: (job: Job) => void;
}

export function MyApplicationsView({
  applications,
  jobs,
  pendingCount,
  shortlistedCount,
  hasMoreApplications = false,
  loadingMore = false,
  onLoadMoreApplications,
  onExplore,
  onOpenJobDetails,
}: MyApplicationsViewProps) {
  return (
    <div className="space-y-6">
      {/* Header + Shared MetricSummary Strip */}
      <Section className="rounded-3xl shadow-xs space-y-6">
        <PageHeader>
          <div>
            <PageHeaderTitle>My Applications</PageHeaderTitle>
            <PageHeaderDescription>
              Track the progress, review stage, and explainable decision updates for your submitted applications.
            </PageHeaderDescription>
          </div>
          <PageHeaderActions>
            <Button type="button" onClick={onExplore}>
              <Search aria-hidden="true" />
              <span>Explore Open Roles</span>
            </Button>
          </PageHeaderActions>
        </PageHeader>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 border-t border-border pt-5">
          <MetricSummary
            label="Total Applications"
            value={applications.length}
            description="Submitted positions"
          />
          <MetricSummary
            label="In Review"
            value={pendingCount}
            description="Active merit evaluation in progress"
            tone="brand"
          />
          <MetricSummary
            label="Shortlisted / Next Steps"
            value={shortlistedCount}
            description="Advancing in candidate pipeline"
            tone="success"
          />
        </div>
      </Section>

      {/* Applications List or Canonical EmptyState */}
      {applications.length === 0 ? (
        <Card className="rounded-3xl">
          <EmptyState
            title="No applications submitted yet"
            description="Browse open positions to find roles matching your experience and skills."
            actionLabel="Explore Open Roles"
            onAction={onExplore}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const statusMeta = getApplicationStatusMeta(app.status);
            const targetJob = jobs.find((j) => {
              if (typeof app.job === "number") return j.id === app.job;
              if (
                app.job &&
                typeof app.job === "object" &&
                "id" in (app.job as Record<string, unknown>)
              ) {
                return j.id === Number((app.job as { id: number | string }).id);
              }
              return false;
            });

            const formattedDate = new Date(app.applied_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const isRejected = app.status === "REJECTED";
            const finalStepLabel =
              app.status === "SHORTLISTED"
                ? "Shortlisted"
                : app.status === "REJECTED"
                  ? "Decision Made"
                  : "Decision";

            return (
              <Card
                key={app.id}
                className="rounded-3xl shadow-xs hover:shadow-md transition-[box-shadow]"
              >
                <CardHeader className="p-5 sm:p-6 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                          {app.job_title}
                        </CardTitle>
                        {app.job_department && (
                          <Badge variant="secondary">{app.job_department}</Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="size-4 shrink-0" aria-hidden="true" />
                          <span>Applied {formattedDate}</span>
                        </span>
                        {app.resume && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1.5 truncate max-w-[240px]">
                              <FileText className="size-4 shrink-0" aria-hidden="true" />
                              <span className="truncate" title={app.resume.original_filename}>
                                {app.resume.original_filename}
                              </span>
                            </span>
                          </>
                        )}
                        {targetJob?.location && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="size-4 shrink-0" aria-hidden="true" />
                              <span>{targetJob.location}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <StatusBadge status={statusMeta.badgeStatus} dot>
                      {statusMeta.label}
                    </StatusBadge>
                  </div>
                </CardHeader>

                <CardContent className="px-5 sm:px-6 pt-0 pb-4 space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold">
                    <span
                      className={cn(
                        statusMeta.stepIndex >= 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      1. Submitted
                    </span>
                    <span
                      className={cn(
                        statusMeta.stepIndex >= 1 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      2. Under Review
                    </span>
                    <span
                      className={cn(
                        statusMeta.stepIndex >= 2
                          ? app.status === "SHORTLISTED"
                            ? "text-success"
                            : "text-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      3. {finalStepLabel}
                    </span>
                  </div>

                  <Progress
                    value={statusMeta.progressValue}
                    indicatorClassName={statusMeta.indicatorClassName}
                    aria-label={`Application progress for ${app.job_title}`}
                  />
                </CardContent>

                <div className="px-5 sm:px-6">
                  <Separator />
                </div>

                <CardFooter className="px-5 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground max-w-[70ch]">
                    {statusMeta.sublabel}
                  </p>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                    {isRejected && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onExplore}
                      >
                        Browse Similar Roles
                      </Button>
                    )}

                    {targetJob && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenJobDetails(targetJob)}
                      >
                        <span>View Role Specs</span>
                        <ArrowRight aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                </CardFooter>
              </Card>
            );
          })}

          {hasMoreApplications && onLoadMoreApplications ? (
            <div className="flex justify-center pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onLoadMoreApplications}
                disabled={loadingMore}
              >
                {loadingMore ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                <span>{loadingMore ? "Loading applications…" : "Load more applications"}</span>
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
