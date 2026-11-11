"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Mail,
  Plus,
  RotateCcw,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  Eye,
  Code2,
  AlertCircle,
  FileText,
  Loader2,
  Sparkles,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { fetchApi } from "@/lib/api";
import { CommunicationTemplate, TemplateStage } from "@/types/application";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STAGE_CONFIG: Record<
  TemplateStage,
  { label: string; badgeClass: string; dotClass: string }
> = {
  SHORTLISTED: {
    label: "Shortlisted",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200/80",
    dotClass: "bg-blue-500",
  },
  INTERVIEW: {
    label: "Interview",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    dotClass: "bg-indigo-500",
  },
  HIRED: {
    label: "Hired / Offer",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
    dotClass: "bg-emerald-500",
  },
  REJECTED: {
    label: "Rejection",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
    dotClass: "bg-rose-500",
  },
  SCREENING: {
    label: "Screening",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200/80",
    dotClass: "bg-sky-500",
  },
  GENERAL: {
    label: "General",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
};

const PLACEHOLDERS = [
  { token: "{{candidate_name}}", label: "Candidate Name", example: "Maria Santos" },
  { token: "{{job_title}}", label: "Job Title", example: "Senior Software Engineer" },
  { token: "{{company_name}}", label: "Company Name", example: "Acme Innovations" },
  { token: "{{recruiter_name}}", label: "Recruiter Name", example: "King Amato" },
];

export function MessageTemplatesView() {
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");

  // Modal State for Create / Edit
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CommunicationTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formStage, setFormStage] = useState<TemplateStage>("GENERAL");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);

  // Modal State for Delete Confirmation
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CommunicationTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Modal State for Reset Confirmation
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const subjectInputRef = useRef<HTMLInputElement>(null);
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await fetchApi<CommunicationTemplate[]>("/communication-templates/");
      setTemplates(data);
    } catch {
      // Fallback to legacy path if needed
      try {
        const fallbackData = await fetchApi<CommunicationTemplate[]>("/applications/communication-templates/");
        setTemplates(fallbackData);
      } catch (err) {
        toast.error("Failed to load message templates", {
          description: err instanceof Error ? err.message : "Please check your network connection.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const openCreateModal = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormStage(stageFilter !== "ALL" ? (stageFilter as TemplateStage) : "GENERAL");
    setFormSubject("");
    setFormBody("");
    setActiveTab("edit");
    setIsEditorOpen(true);
  };

  const openEditModal = (template: CommunicationTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormStage(template.stage || "GENERAL");
    setFormSubject(template.subject);
    setFormBody(template.body);
    setActiveTab("edit");
    setIsEditorOpen(true);
  };

  const openDuplicateModal = (template: CommunicationTemplate) => {
    setEditingTemplate(null);
    setFormName(`${template.name} (Copy)`);
    setFormStage(template.stage || "GENERAL");
    setFormSubject(template.subject);
    setFormBody(template.body);
    setActiveTab("edit");
    setIsEditorOpen(true);
  };

  const insertPlaceholder = (token: string) => {
    if (lastFocusedField === "subject") {
      const input = subjectInputRef.current;
      if (input) {
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const next = formSubject.substring(0, start) + token + formSubject.substring(end);
        setFormSubject(next);
        setTimeout(() => {
          input.focus();
          input.setSelectionRange(start + token.length, start + token.length);
        }, 0);
      } else {
        setFormSubject((prev) => prev + token);
      }
    } else {
      const textarea = bodyInputRef.current;
      if (textarea) {
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const next = formBody.substring(0, start) + token + formBody.substring(end);
        setFormBody(next);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + token.length, start + token.length);
        }, 0);
      } else {
        setFormBody((prev) => prev + token);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Template name is required");
      return;
    }
    if (!formSubject.trim()) {
      toast.error("Subject line is required");
      return;
    }
    if (!formBody.trim()) {
      toast.error("Message body is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        stage: formStage,
        subject: formSubject.trim(),
        body: formBody.trim(),
      };

      if (editingTemplate) {
        const updated = await fetchApi<CommunicationTemplate>(
          `/communication-templates/${editingTemplate.id}/`,
          {
            method: "PATCH",
            body: JSON.stringify(payload),
          }
        );
        setTemplates((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item))
        );
        toast.success("Template updated", {
          description: `"${updated.name}" is now ready to use in candidate outreach.`,
        });
      } else {
        const created = await fetchApi<CommunicationTemplate>("/communication-templates/", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setTemplates((prev) => [created, ...prev]);
        toast.success("Template created", {
          description: `"${created.name}" is now available to your recruitment team.`,
        });
      }
      setIsEditorOpen(false);
    } catch (err) {
      toast.error("Failed to save template", {
        description: err instanceof Error ? err.message : "Please check your inputs and try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!templateToDelete) return;
    setDeleting(true);
    try {
      await fetchApi(`/communication-templates/${templateToDelete.id}/`, {
        method: "DELETE",
      });
      setTemplates((prev) => prev.filter((item) => item.id !== templateToDelete.id));
      toast.success("Template deleted", {
        description: `"${templateToDelete.name}" was removed.`,
      });
      setIsDeleteOpen(false);
    } catch (err) {
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

  // Hydrate preview text with dummy data
  const previewSubject = useMemo(() => {
    let text = formSubject;
    for (const p of PLACEHOLDERS) {
      text = text.replaceAll(p.token, p.example);
    }
    return text || "Subject line preview";
  }, [formSubject]);

  const previewBody = useMemo(() => {
    let text = formBody;
    for (const p of PLACEHOLDERS) {
      text = text.replaceAll(p.token, p.example);
    }
    return text || "Message body preview will appear here...";
  }, [formBody]);

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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/90 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Candidate Email Templates
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#2196F3] border border-blue-200/60">
              {templates.length} {templates.length === 1 ? "template" : "templates"}
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Standardize and customize candidate communication across your company’s recruitment pipeline.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsResetOpen(true)}
            className="text-xs h-9 gap-1.5 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <Button
            type="button"
            onClick={openCreateModal}
            className="text-xs h-9 gap-1.5 bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold shadow-2xs hover:shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Template</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Stage Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setStageFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
              stageFilter === "ALL"
                ? "bg-slate-900 text-white shadow-2xs"
                : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All ({templates.length})
          </button>
          {(
            [
              "SHORTLISTED",
              "INTERVIEW",
              "HIRED",
              "REJECTED",
              "SCREENING",
              "GENERAL",
            ] as TemplateStage[]
          ).map((stg) => {
            const count = templates.filter((t) => (t.stage || "GENERAL") === stg).length;
            const isSelected = stageFilter === stg;
            return (
              <button
                key={stg}
                type="button"
                onClick={() => setStageFilter(stg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#2196F3] text-white shadow-2xs"
                    : "bg-white border border-slate-200/90 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{STAGE_CONFIG[stg].label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates or subjects…"
            className="pl-9 h-9 text-xs bg-white border-slate-200/90"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#2196F3]" />
          <span className="text-xs text-slate-500 font-mono">Loading outreach templates…</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100/60 text-[#2196F3] flex items-center justify-center mx-auto mb-3">
            <Mail className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {searchQuery || stageFilter !== "ALL"
              ? "No matching email templates"
              : "No message templates configured"}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || stageFilter !== "ALL"
              ? "Try clearing your search filter or selecting a different pipeline stage."
              : "Create a customized message template or restore the standard system defaults to get started."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {searchQuery || stageFilter !== "ALL" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStageFilter("ALL");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            ) : (
              <Button size="sm" onClick={openCreateModal} className="text-xs gap-1.5 bg-[#2196F3]">
                <Plus className="w-3.5 h-3.5" />
                <span>Create Template</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => {
            const stageMeta = STAGE_CONFIG[template.stage || "GENERAL"];
            return (
              <div
                key={template.id}
                className="group rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:shadow-xs hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header: Stage badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${stageMeta.badgeClass}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${stageMeta.dotClass}`} />
                        {stageMeta.label}
                      </span>
                      {template.is_default && (
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          System Default
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => openDuplicateModal(template)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Duplicate template"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(template)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit template"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setIsDeleteOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Template Title */}
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#2196F3] transition-colors line-clamp-1">
                    {template.name}
                  </h3>

                  {/* Subject Preview */}
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{template.subject}</span>
                  </div>

                  {/* Body Preview */}
                  <p className="mt-2.5 text-xs text-slate-500 leading-relaxed line-clamp-3 whitespace-pre-line font-mono">
                    {template.body}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Author: {template.created_by || "Recruiter"}</span>
                  <button
                    type="button"
                    onClick={() => openEditModal(template)}
                    className="font-semibold text-[#2196F3] hover:underline"
                  >
                    Edit template →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Editor Modal (Create or Edit) */}
      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
            <DialogHeader className="px-6 py-5 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-lg text-slate-900">
                    {editingTemplate ? "Edit Outreach Template" : "New Outreach Template"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Configure the message template and available placeholder variables.
                  </DialogDescription>
                </div>
                {/* Editor / Preview Switcher */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab("edit")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      activeTab === "edit"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Code2 className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("preview")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      activeTab === "preview"
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Candidate Preview</span>
                  </button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {activeTab === "edit" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1.5">
                      <Label htmlFor="template-name" className="text-xs font-semibold text-slate-700">
                        Template Name <span className="text-rose-500">*</span>
                      </Label>
                      <Input
                        id="template-name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Technical Round Invitation, Offer Letter Follow-up"
                        className="text-xs h-9"
                        maxLength={150}
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="template-stage" className="text-xs font-semibold text-slate-700">
                        Associated Stage
                      </Label>
                      <Select
                        value={formStage}
                        onValueChange={(val) => setFormStage(val as TemplateStage)}
                      >
                        <SelectTrigger id="template-stage" className="text-xs h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(
                            [
                              "SHORTLISTED",
                              "INTERVIEW",
                              "HIRED",
                              "REJECTED",
                              "SCREENING",
                              "GENERAL",
                            ] as TemplateStage[]
                          ).map((stg) => (
                            <SelectItem key={stg} value={stg} className="text-xs">
                              {STAGE_CONFIG[stg].label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="template-subject" className="text-xs font-semibold text-slate-700">
                        Subject Line <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[10px] text-slate-400">
                        {formSubject.length} / 200
                      </span>
                    </div>
                    <Input
                      id="template-subject"
                      ref={subjectInputRef}
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      onFocus={() => setLastFocusedField("subject")}
                      placeholder="e.g. Next Steps regarding your application for {{job_title}}"
                      className="text-xs h-9"
                      maxLength={200}
                      required
                    />
                  </div>

                  {/* Placeholder Insert Pills */}
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1976D2]">
                        <Sparkles className="w-3.5 h-3.5 text-[#2196F3]" />
                        <span>Insert Dynamic Variables</span>
                      </div>
                      <span className="text-[10px] text-blue-600/80">
                        Inserting into: <span className="font-bold underline">{lastFocusedField}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {PLACEHOLDERS.map((p) => (
                        <button
                          key={p.token}
                          type="button"
                          onClick={() => insertPlaceholder(p.token)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-white border border-blue-200 text-blue-900 hover:bg-blue-100/70 hover:border-blue-300 transition-colors shadow-2xs"
                        >
                          + {p.token}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="template-body" className="text-xs font-semibold text-slate-700">
                        Message Body <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[10px] text-slate-400">
                        {formBody.length} / 5000
                      </span>
                    </div>
                    <Textarea
                      id="template-body"
                      ref={bodyInputRef}
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      onFocus={() => setLastFocusedField("body")}
                      placeholder="Write your email template message here..."
                      className="text-xs leading-relaxed font-sans"
                      rows={10}
                      maxLength={5000}
                      required
                    />
                  </div>
                </>
              ) : (
                /* Live Preview as Candidate */
                <div className="space-y-4">
                  <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-slate-500 pb-2 border-b border-slate-200">
                      <Info className="w-4 h-4 text-blue-500 shrink-0" />
                      <span>
                        Simulating candidate receipt with sample data (<b>Maria Santos</b> applying for{" "}
                        <b>Senior Software Engineer</b> at <b>Acme Innovations</b>).
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                        To
                      </span>
                      <p className="text-xs font-semibold text-slate-800">
                        Maria Santos &lt;maria.santos@example.com&gt;
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                        Subject
                      </span>
                      <p className="text-xs font-semibold text-slate-900 bg-white p-2.5 rounded-lg border border-slate-200">
                        {previewSubject}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">
                        Message Content
                      </span>
                      <div className="text-xs leading-relaxed text-slate-800 bg-white p-4 rounded-lg border border-slate-200 whitespace-pre-wrap font-sans min-h-[160px]">
                        {previewBody}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditorOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !formName.trim() || !formSubject.trim() || !formBody.trim()}
                className="text-xs bg-[#2196F3] hover:bg-[#1976D2] text-white font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    Saving…
                  </>
                ) : editingTemplate ? (
                  "Update Template"
                ) : (
                  "Create Template"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-500" />
              Delete Outreach Template?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete{" "}
              <b className="text-slate-900">"{templateToDelete?.name}"</b>? Recruiters in your company
              will no longer be able to select this template in the candidate drawer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs"
            >
              Keep Template
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={handleDelete}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting ? "Deleting…" : "Delete Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Defaults Confirmation Modal */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-500" />
              Reset Standard Templates?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 mt-2">
              This will re-populate any missing standard templates (Shortlisted, Interview, Hired,
              and Rejection) for your company. Your existing custom templates will not be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={resetting}
              onClick={handleResetDefaults}
              className="text-xs bg-[#2196F3] hover:bg-[#1976D2] text-white"
            >
              {resetting ? "Resetting…" : "Restore Defaults"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

