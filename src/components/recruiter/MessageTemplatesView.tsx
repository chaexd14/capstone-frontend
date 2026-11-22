"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Mail,
  Plus,
  RotateCcw,
  Edit2,
  Trash2,
  Copy,
  AlertCircle,
} from "lucide-react";
import {
  fetchApi,
  fetchCommunicationTemplatesCached,
  invalidateCommunicationTemplatesCache,
} from "@/lib/api";
import { CommunicationTemplate, TemplateStage } from "@/types/application";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ContextualLoading } from "@/components/ui/contextual-loading";
import { EmptyState } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { IconButton } from "@/components/ui/icon-button";
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
import {
  MessageTemplateModal,
  TEMPLATE_STAGE_CONFIG,
  TEMPLATE_STAGE_ORDER,
  type MessageTemplateDraft,
} from "./MessageTemplateModal";

const EMPTY_TEMPLATE_DRAFT: MessageTemplateDraft = {
  name: "",
  stage: "GENERAL",
  subject: "",
  body: "",
};

export function MessageTemplatesView() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Modal State for Create / Edit
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [editorDraft, setEditorDraft] = useState<MessageTemplateDraft>(EMPTY_TEMPLATE_DRAFT);

  // Modal State for Delete Confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CommunicationTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal State for Reset Confirmation
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchCommunicationTemplatesCached();
      setTemplates(data);
    } catch (err) {
      toast.error("Failed to load message templates", {
        description: err instanceof Error ? err.message : "Please check your network connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadTimer = window.setTimeout(() => void loadTemplates(), 0);
    return () => window.clearTimeout(loadTimer);
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setEditorDraft({
      name: "",
      stage: stageFilter !== "ALL" ? (stageFilter as TemplateStage) : "GENERAL",
      subject: "",
      body: "",
    });
    setIsEditorOpen(true);
  };

  const openEditModal = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setEditorDraft({
      name: template.name,
      stage: template.stage || "GENERAL",
      subject: template.subject,
      body: template.body,
    });
    setIsEditorOpen(true);
  };

  const openDuplicateModal = (template: CommunicationTemplate) => {
    setEditingTemplate(null);
    setEditorDraft({
      name: `${template.name} (Copy)`,
      stage: template.stage || "GENERAL",
      subject: template.subject,
      body: template.body,
    });
    setIsEditorOpen(true);
  };

  const handleTemplateSaved = (saved: CommunicationTemplate, mode: "create" | "edit") => {
    invalidateCommunicationTemplatesCache();
    if (mode === "edit") {
      setTemplates((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
    } else {
      setTemplates((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    const target = templateToDelete;
    const prevTemplates = templates;
    setDeleting(true);
    setIsDeleteOpen(false);
    setTemplates((prev) => prev.filter((item) => item.id !== target.id));
    invalidateCommunicationTemplatesCache();
    try {
      await fetchApi(`/communication-templates/${target.id}/`, {
        method: "DELETE",
      });
      toast.success("Template deleted", {
        description: `"${target.name}" was removed.`,
      });
    } catch (err) {
      setTemplates(prevTemplates);
      toast.error("Failed to delete template", {
        description: err instanceof Error ? err.message : "Please try again later.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleResetDefaults = async () => {
    setResetting(true);
    try {
      const restored = await fetchApi<CommunicationTemplate[]>(
        "/communication-templates/reset-defaults/",
        {
          method: "POST",
        }
      );
      invalidateCommunicationTemplatesCache();
      setTemplates(restored);
      toast.success("Standard templates restored", {
        description: "Default templates have been verified and repopulated.",
      });
      setIsResetOpen(false);
    } catch (err) {
      toast.error("Failed to reset templates", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setResetting(false);
    }
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch =
        searchQuery === "" ||
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.body.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStage =
        stageFilter === "ALL" || (t.stage || "GENERAL") === stageFilter;

      return matchesSearch && matchesStage;
    });
  }, [templates, searchQuery, stageFilter]);

  const stageTabs = useMemo(
    () => [
      { id: "ALL", label: "All", count: templates.length },
      ...TEMPLATE_STAGE_ORDER.map((stage) => ({
        id: stage,
        label: TEMPLATE_STAGE_CONFIG[stage].label,
        count: templates.filter((template) => (template.stage || "GENERAL") === stage).length,
      })),
    ],
    [templates]
  );

  const hasActiveFilters = Boolean(searchQuery.trim()) || stageFilter !== "ALL";
  const clearFilters = () => {
    setSearchQuery("");
    setStageFilter("ALL");
  };

  return (
    <div className="space-y-6">
      <PageHeader className="border-b border-border pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <PageHeaderTitle>Message templates</PageHeaderTitle>
            <StatusBadge status="neutral">{templates.length} total</StatusBadge>
          </div>
          <PageHeaderDescription>
            Build consistent, human candidate communication for every stage of the hiring process.
          </PageHeaderDescription>
        </div>
        <PageHeaderActions>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsResetOpen(true)}
          >
            <RotateCcw aria-hidden="true" />
            Restore defaults
          </Button>
          <Button type="button" onClick={openCreateModal}>
            <Plus aria-hidden="true" />
            New template
          </Button>
        </PageHeaderActions>
      </PageHeader>

      <CollectionToolbar
        label="Message template controls"
        tabs={
          <FilterTabs
            label="Filter templates by hiring stage"
            tabs={stageTabs}
            value={stageFilter}
            onValueChange={setStageFilter}
          />
        }
        search={
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Search templates or subjects…"
            aria-label="Search message templates"
            containerClassName="w-full sm:w-80"
          />
        }
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {/* Main Content Area */}
      {loading ? (
        <ContextualLoading label="Loading message templates" />
      ) : filteredTemplates.length === 0 ? (
        <EmptyState
          title={searchQuery || stageFilter !== "ALL" ? "No matching templates" : "No message templates yet"}
          description={
            searchQuery || stageFilter !== "ALL"
              ? "Clear the current filters to return to the complete template library."
              : "Create your first candidate message or restore TalentMatch’s standard templates."
          }
          actionLabel={searchQuery || stageFilter !== "ALL" ? "Clear filters" : "Create template"}
          onAction={() => {
            if (searchQuery || stageFilter !== "ALL") {
              setSearchQuery("");
              setStageFilter("ALL");
            } else {
              openCreateModal();
            }
          }}
          className="rounded-2xl border border-dashed border-border bg-muted/30"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredTemplates.map((template) => {
            const stageMeta = TEMPLATE_STAGE_CONFIG[template.stage || "GENERAL"];
            return (
              <div
                key={template.id}
                className="group flex min-w-0 flex-col justify-between rounded-2xl border border-border bg-card p-5 shadow-xs transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-sm"
              >
                <div>
                  {/* Card Header: Stage badge & Actions */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={stageMeta.status} dot>{stageMeta.label}</StatusBadge>
                      {template.is_default && (
                        <StatusBadge status="neutral">Default</StatusBadge>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <IconButton
                        label={`Duplicate ${template.name}`}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openDuplicateModal(template)}
                        className="text-muted-foreground"
                      >
                        <Copy aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Edit ${template.name}`}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEditModal(template)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Edit2 aria-hidden="true" />
                      </IconButton>
                      <IconButton
                        label={`Delete ${template.name}`}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setIsDeleteOpen(true);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 aria-hidden="true" />
                      </IconButton>
                    </div>
                  </div>

                  {/* Template Title */}
                  <h3 className="line-clamp-1 text-base font-bold text-foreground">
                    {template.name}
                  </h3>

                  {/* Subject Preview */}
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm font-medium text-foreground">
                    <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{template.subject}</span>
                  </div>

                  {/* Body Preview */}
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                    {template.body}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm text-muted-foreground">
                  <span className="truncate">Created by {template.created_by || "Recruiter"}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(template)}
                    className="shrink-0"
                  >
                    Edit template
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal (Create, Edit, or Duplicate) */}
      <MessageTemplateModal
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        editingTemplate={editingTemplate}
        initialDraft={editorDraft}
        onSaved={handleTemplateSaved}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
              Delete message template?
            </AlertDialogTitle>
            <AlertDialogDescription>
              “{templateToDelete?.name}” will no longer be available to recruiters composing candidate messages.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep template</AlertDialogCancel>
            <AlertDialogAction disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete template"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="size-5 text-primary" aria-hidden="true" />
              Restore standard templates?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Missing Shortlisted, Interview, Hired, and Rejection templates will be restored. Existing custom
              templates and edits will remain unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="default" disabled={resetting} onClick={handleResetDefaults}>
              {resetting ? "Restoring…" : "Restore defaults"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
