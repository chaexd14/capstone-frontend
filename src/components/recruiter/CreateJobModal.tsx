"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  FileEdit,
  Globe,
  Info,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Scale,
  ShieldCheck,
  X,
} from "lucide-react";
import { Job, JobStatus, RubricWeights } from "@/types/job";
import { fetchApi, ApiError } from "@/lib/api";
import { formatSalaryInput, parseSalaryInput } from "@/lib/salary";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/feedback";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { FieldError, FormAlertNote } from "@/components/ui/form-error";
import { FormField } from "@/components/ui/form-field";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: Job) => void;
  jobToEdit?: Job | null;
  initialTemplate?: Partial<Job> | null;
  onSuccessRedirect?: (newJob: Job) => void;
}

interface LintFlag {
  category: string;
  matched_terms?: string[];
  message: string;
  severity: "warning" | "error" | "info";
  source?: "job_overview";
}

type FieldErrorMap = {
  title?: string | null;
  department?: string | null;
  employmentType?: string | null;
  location?: string | null;
  description?: string | null;
  jobOverview?: string | null;
  salary?: string | null;
  minExp?: string | null;
  education?: string | null;
  requiredSkills?: string | null;
  rubricWeights?: string | null;
};

const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  required_skills: 40,
  experience: 25,
  education: 15,
  preferred_skills: 10,
  projects: 10,
};

const EMPLOYMENT_TYPE_OPTIONS = [
  "Full-time",
  "Part-time",
  "Contract",
  "Shifting",
  "Internship",
] as const;

const RUBRIC_DIMENSIONS: Array<{
  key: keyof RubricWeights;
  label: string;
  description: string;
}> = [
    {
      key: "required_skills",
      label: "Must-have qualifications",
      description: "Core competencies, hands-on proof, and required state licenses.",
    },
    {
      key: "experience",
      label: "Experience tenure",
      description: "Years of relevant work history with tenure-inflation capping.",
    },
    {
      key: "education",
      label: "Education & credentials",
      description: "Degree level, field alignment, and formal academic background.",
    },
    {
      key: "preferred_skills",
      label: "Preferred qualifications",
      description: "Bonus tools, secondary skills, and optional certifications.",
    },
    {
      key: "projects",
      label: "Projects & operational duties",
      description: "Direct alignment between past accomplishments and daily role duties.",
    },
  ];

const POSTING_STATE_OPTIONS: Array<{
  value: Extract<JobStatus, "PUBLISHED" | "DRAFT">;
  label: string;
  detail: string;
  icon: typeof Globe;
}> = [
    {
      value: "PUBLISHED",
      label: "Publish immediately",
      detail: "Visible to applicants on the careers portal",
      icon: Globe,
    },
    {
      value: "DRAFT",
      label: "Save as draft",
      detail: "Internal only until ready to open",
      icon: FileEdit,
    },
  ];

const REGULATED_KEYWORDS = [
  "nurse",
  "nursing",
  "physician",
  "doctor",
  "medical",
  "healthcare",
  "hospital",
  "pharmacist",
  "pharmacy",
  "accountant",
  "cpa",
  "civil engineer",
  "mechanical engineer",
  "electrical engineer",
  "attorney",
  "lawyer",
  "teacher",
  "lpt",
  "medical technologist",
  "architect",
];

/**
 * Strips leading bullet markers (•, -, *, 1., 2), etc.) from a qualification line
 * while keeping the sentence itself intact.
 */
function cleanQualificationSentence(rawLine: string): string {
  return rawLine
    .replace(/^\s*(?:[•●▪▸\-*]+|\d+[\.\)])\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits multi-line or semicolon-delimited qualification text into clean sentence items.
 * Preserves commas inside natural sentences (e.g. "Experience with Python, Django, and REST APIs").
 */
function parseQualificationItems(rawInput: string): string[] {
  if (!rawInput.trim()) return [];
  return rawInput
    .split(/[\r\n;]+/)
    .map(cleanQualificationSentence)
    .filter((item) => item.length > 0);
}

function isLicenseCriterion(criterionText: string): boolean {
  return /\b(prc|cpa|registered\s+nurse|rn|lpt|license|licensed|board\s+exam|tesda|bosh|cosh|bls|acls)\b/i.test(
    criterionText
  );
}

function areWeightsDefault(weights: RubricWeights): boolean {
  return (
    weights.required_skills === DEFAULT_RUBRIC_WEIGHTS.required_skills &&
    weights.experience === DEFAULT_RUBRIC_WEIGHTS.experience &&
    weights.education === DEFAULT_RUBRIC_WEIGHTS.education &&
    weights.preferred_skills === DEFAULT_RUBRIC_WEIGHTS.preferred_skills &&
    weights.projects === DEFAULT_RUBRIC_WEIGHTS.projects
  );
}

interface QualificationChecklistPanelProps {
  variant: "required" | "preferred";
  inputId: string;
  title: string;
  description: string;
  weightLabel: string;
  items: string[];
  inputValue: string;
  placeholder: string;
  addButtonLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  error?: string | null;
  editingIdx: number | null;
  editingText: string;
  moveDirection: "down" | "up";
  moveTooltip: string;
  onInputChange: (value: string) => void;
  onAdd: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  onStartEdit: (idx: number, current: string) => void;
  onEditTextChange: (value: string) => void;
  onSaveEdit: (idx: number) => void;
  onCancelEdit: () => void;
  onMoveItem: (item: string) => void;
  onRemoveItem: (item: string) => void;
}

function QualificationChecklistPanel({
  variant,
  inputId,
  title,
  description,
  weightLabel,
  items,
  inputValue,
  placeholder,
  addButtonLabel,
  emptyTitle,
  emptyDescription,
  error,
  editingIdx,
  editingText,
  moveDirection,
  moveTooltip,
  onInputChange,
  onAdd,
  onPaste,
  onStartEdit,
  onEditTextChange,
  onSaveEdit,
  onCancelEdit,
  onMoveItem,
  onRemoveItem,
}: QualificationChecklistPanelProps) {
  const isRequired = variant === "required";
  const countLabel = isRequired
    ? `${items.length} ${items.length === 1 ? "criterion" : "criteria"}`
    : `${items.length} ${items.length === 1 ? "item" : "items"}`;

  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-4 transition-colors",
        error ? "border-destructive/60 bg-rose-50/40" : "border-border bg-muted/40"
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
              {title}
              {isRequired ? (
                <span className="ml-1 text-destructive" aria-hidden="true">
                  *
                </span>
              ) : null}
            </label>
            <Badge variant="outline" className="tabular-nums">
              {countLabel}
            </Badge>
          </div>
          <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        </div>

        <Badge variant={isRequired ? "secondary" : "outline"} className="self-start shrink-0 tabular-nums">
          {weightLabel}
        </Badge>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          type="text"
          value={inputValue}
          error={Boolean(error)}
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
          className="flex-1"
        />
        <Button
          type="button"
          variant={isRequired ? "default" : "secondary"}
          onClick={onAdd}
          disabled={!inputValue.trim()}
          className="shrink-0"
        >
          <Plus aria-hidden="true" />
          {addButtonLabel}
        </Button>
      </div>

      <FieldError message={error} />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/80 px-4 py-4 text-center">
          <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((criterion, idx) => {
            const isEditing = editingIdx === idx;
            const isLicense = isRequired && isLicenseCriterion(criterion);

            return (
              <li
                key={`${variant}-${idx}-${criterion}`}
                className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card px-3.5 py-2.5 transition-colors hover:border-primary/40"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 min-w-7 shrink-0 items-center justify-center rounded-md bg-secondary px-1.5 text-sm font-semibold tabular-nums text-secondary-foreground">
                    {isRequired ? String(idx + 1).padStart(2, "0") : `+${idx + 1}`}
                  </span>

                  {isEditing ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        type="text"
                        value={editingText}
                        onChange={(e) => onEditTextChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            onSaveEdit(idx);
                          } else if (e.key === "Escape") {
                            e.stopPropagation();
                            onCancelEdit();
                          }
                        }}
                        aria-label="Edit qualification sentence"
                        className="h-9 flex-1 min-w-[200px]"
                        autoFocus
                      />
                      <ButtonGroup>
                        <IconButton
                          type="button"
                          size="icon-sm"
                          variant="secondary"
                          label="Save qualification edit"
                          onClick={() => onSaveEdit(idx)}
                        >
                          <Check className="text-success" />
                        </IconButton>
                        <IconButton
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          label="Cancel qualification edit"
                          onClick={onCancelEdit}
                        >
                          <X />
                        </IconButton>
                      </ButtonGroup>
                    </div>
                  ) : (
                    <div className="min-w-0 flex-1 space-y-1">
                      {isLicense ? (
                        <StatusBadge status="warning" dot>
                          License / credential
                        </StatusBadge>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => onStartEdit(idx, criterion)}
                        title="Click to edit qualification sentence"
                        className="h-auto w-full justify-start whitespace-normal px-0 py-0 text-left font-normal leading-6 text-foreground hover:bg-transparent hover:text-primary"
                      >
                        <span className="break-words">{criterion}</span>
                      </Button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <ButtonGroup className="shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          label={`Edit "${criterion}"`}
                          onClick={() => onStartEdit(idx, criterion)}
                        >
                          <Pencil />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Edit sentence</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          label={`${moveTooltip}: "${criterion}"`}
                          onClick={() => onMoveItem(criterion)}
                        >
                          {moveDirection === "down" ? <ArrowDown /> : <ArrowUp />}
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>{moveTooltip}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconButton
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          label={`Remove "${criterion}"`}
                          onClick={() => onRemoveItem(criterion)}
                          className="hover:bg-rose-50 hover:text-destructive"
                        >
                          <X />
                        </IconButton>
                      </TooltipTrigger>
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
                  </ButtonGroup>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CreateJobModal({
  isOpen,
  onClose,
  onJobCreated,
  jobToEdit = null,
  initialTemplate = null,
  onSuccessRedirect,
}: CreateJobModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [location, setLocation] = useState("");
  const [salaryMode, setSalaryMode] = useState<"fixed" | "range">("fixed");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [description, setDescription] = useState("");
  const [jobOverview, setJobOverview] = useState("");
  const [minExp, setMinExp] = useState("");
  const [education, setEducation] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus>("PUBLISHED");

  const [reqSkillInput, setReqSkillInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [prefSkillInput, setPrefSkillInput] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);

  const [editingReqIdx, setEditingReqIdx] = useState<number | null>(null);
  const [editingReqText, setEditingReqText] = useState("");
  const [editingPrefIdx, setEditingPrefIdx] = useState<number | null>(null);
  const [editingPrefText, setEditingPrefText] = useState("");

  const [rubricWeights, setRubricWeights] = useState<RubricWeights>(DEFAULT_RUBRIC_WEIGHTS);

  const [lintFlags, setLintFlags] = useState<LintFlag[]>([]);
  const [isLinting, setIsLinting] = useState(false);
  const [cleanReplacementsAvailable, setCleanReplacementsAvailable] = useState(false);
  const [cachedCleanedDescription, setCachedCleanedDescription] = useState<string>("");
  const [cachedCleanedOverview, setCachedCleanedOverview] = useState<string>("");
  const lintAbortControllerRef = useRef<AbortController | null>(null);

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setTitle("");
    setDepartment("");
    setEmploymentType("");
    setLocation("");
    setSalaryMode("fixed");
    setSalaryMin("");
    setSalaryMax("");
    setDescription("");
    setJobOverview("");
    setMinExp("");
    setEducation("");
    setJobStatus("PUBLISHED");
    setReqSkillInput("");
    setRequiredSkills([]);
    setPrefSkillInput("");
    setPreferredSkills([]);
    setEditingReqIdx(null);
    setEditingReqText("");
    setEditingPrefIdx(null);
    setEditingPrefText("");
    setRubricWeights(DEFAULT_RUBRIC_WEIGHTS);
    setLintFlags([]);
    setCleanReplacementsAvailable(false);
    setFieldErrors({});
    setFormError(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      const source = jobToEdit || initialTemplate;
      if (!source) {
        resetForm();
        return;
      }
      setStep(1);
      setTitle(source.title || "");
      setDepartment(source.department || "");
      setEmploymentType(source.employment_type || "");
      setLocation(source.location || "");
      const sourceSalaryMin = source.salary_min ?? null;
      const sourceSalaryMax = source.salary_max ?? null;
      setSalaryMode(
        sourceSalaryMin !== null && sourceSalaryMax !== null && sourceSalaryMin !== sourceSalaryMax
          ? "range"
          : "fixed"
      );
      setSalaryMin(sourceSalaryMin === null ? "" : formatSalaryInput(String(sourceSalaryMin)));
      setSalaryMax(sourceSalaryMax === null ? "" : formatSalaryInput(String(sourceSalaryMax)));
      setDescription(source.description || "");
      setJobOverview(source.job_overview || "");
      setMinExp(source.minimum_experience || "");
      setEducation(source.education_requirement || "");
      setJobStatus(source.status === "DRAFT" ? "DRAFT" : "PUBLISHED");
      setRequiredSkills(source.required_skills || []);
      setPreferredSkills(source.preferred_skills || []);
      setRubricWeights(source.rubric_weights || DEFAULT_RUBRIC_WEIGHTS);
      setFieldErrors({});
      setFormError(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, jobToEdit, initialTemplate, resetForm]);

  const employmentOptions = useMemo(() => {
    const base: string[] = [...EMPLOYMENT_TYPE_OPTIONS];
    if (employmentType && !base.includes(employmentType)) {
      base.push(employmentType);
    }
    return base;
  }, [employmentType]);

  const isRegulated = useMemo(() => {
    const combined = `${title} ${department} ${jobOverview} ${description}`.toLowerCase();
    return REGULATED_KEYWORDS.some((kw) => combined.includes(kw));
  }, [title, department, jobOverview, description]);

  const totalRubricWeight = useMemo(() => {
    return Math.round(
      (Number(rubricWeights.required_skills) || 0) +
      (Number(rubricWeights.experience) || 0) +
      (Number(rubricWeights.education) || 0) +
      (Number(rubricWeights.preferred_skills) || 0) +
      (Number(rubricWeights.projects) || 0)
    );
  }, [rubricWeights]);

  const isWeightValid = totalRubricWeight === 100;

  const handleAutoBalance = useCallback(() => {
    const keys: (keyof RubricWeights)[] = [
      "required_skills",
      "experience",
      "education",
      "preferred_skills",
      "projects",
    ];
    const currentSum = totalRubricWeight;
    if (currentSum === 0) {
      setRubricWeights(DEFAULT_RUBRIC_WEIGHTS);
      setFieldErrors((prev) => ({ ...prev, rubricWeights: null }));
      toast.info("Reset to default weights", {
        description: "Weights set to 40 / 25 / 15 / 10 / 10.",
      });
      return;
    }

    const scaled = keys.map((key) => ({
      key,
      val: Math.round((rubricWeights[key] / currentSum) * 100),
    }));

    const scaledSum = scaled.reduce((sum, item) => sum + item.val, 0);
    scaled[0].val += 100 - scaledSum;

    setRubricWeights({
      required_skills: scaled[0].val,
      experience: scaled[1].val,
      education: scaled[2].val,
      preferred_skills: scaled[3].val,
      projects: scaled[4].val,
    });
    setFieldErrors((prev) => ({ ...prev, rubricWeights: null }));
    toast.success("Weights auto-balanced", {
      description: "Rubric percentages normalized to 100%.",
    });
  }, [rubricWeights, totalRubricWeight]);

  const handleResetDefaultWeights = useCallback(() => {
    setRubricWeights(DEFAULT_RUBRIC_WEIGHTS);
    setFieldErrors((prev) => ({ ...prev, rubricWeights: null }));
    toast.info("Default rubric restored", {
      description: "Weights reset to 40 / 25 / 15 / 10 / 10.",
    });
  }, []);

  const updateWeight = (key: keyof RubricWeights, val: number) => {
    const safeNumber = Number.isFinite(val) ? val : 0;
    const clamped = Math.max(0, Math.min(100, Math.round(safeNumber)));
    setRubricWeights((prev) => ({ ...prev, [key]: clamped }));
  };

  const adjustWeight = (key: keyof RubricWeights, delta: number) => {
    updateWeight(key, (rubricWeights[key] || 0) + delta);
  };

  const runLintCheck = useCallback(
    async (descText: string, overviewText: string, reqSkills: string[], eduText: string, roleTitle: string) => {
      if (!descText.trim() && !overviewText.trim()) {
        setLintFlags([]);
        setCleanReplacementsAvailable(false);
        return;
      }

      if (lintAbortControllerRef.current) {
        lintAbortControllerRef.current.abort();
      }
      const controller = new AbortController();
      lintAbortControllerRef.current = controller;

      try {
        setIsLinting(true);
        const res = await fetchApi<{
          flags: LintFlag[];
          is_clean: boolean;
          is_regulated: boolean;
          cleaned_description: string;
          cleaned_job_overview: string;
          has_replacements: boolean;
        }>("/jobs/lint-jd/", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            title: roleTitle,
            description: descText,
            job_overview: overviewText,
            required_skills: reqSkills,
            education_requirement: eduText,
          }),
        });

        setLintFlags(res.flags || []);
        setCleanReplacementsAvailable(res.has_replacements || false);
        setCachedCleanedDescription(res.cleaned_description || "");
        setCachedCleanedOverview(res.cleaned_job_overview || "");
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") {
          return;
        }
        console.warn("Failed to run JD linter:", e);
      } finally {
        setIsLinting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      runLintCheck(description, jobOverview, requiredSkills, education, title);
    }, 600);
    return () => {
      clearTimeout(timer);
      if (lintAbortControllerRef.current) {
        lintAbortControllerRef.current.abort();
      }
    };
  }, [isOpen, description, jobOverview, requiredSkills, education, title, runLintCheck]);

  const handleAutoCleanBias = async () => {
    // Apply immediately from the latest lint response when already available (0ms, no duplicate network call)
    if (cachedCleanedDescription || cachedCleanedOverview) {
      if (cachedCleanedDescription) setDescription(cachedCleanedDescription);
      if (cachedCleanedOverview) setJobOverview(cachedCleanedOverview);
      setLintFlags((prev) => prev.filter((f) => f.category === "missing_regulatory_license"));
      setCleanReplacementsAvailable(false);
      setCachedCleanedDescription("");
      setCachedCleanedOverview("");
      toast.success("Biased terms cleaned", {
        description: "Replaced gendered or non-operational terms with objective language.",
      });
      return;
    }
    try {
      const res = await fetchApi<{
        cleaned_description: string;
        cleaned_job_overview: string;
      }>("/jobs/lint-jd/", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          job_overview: jobOverview,
          required_skills: requiredSkills,
          education_requirement: education,
        }),
      });

      if (res.cleaned_description) {
        setDescription(res.cleaned_description);
        setJobOverview(res.cleaned_job_overview || jobOverview);
        setLintFlags((prev) => prev.filter((f) => f.category === "missing_regulatory_license"));
        setCleanReplacementsAvailable(false);
        toast.success("Biased terms cleaned", {
          description: "Replaced gendered or non-operational terms with objective language.",
        });
      }
    } catch (e) {
      console.warn("Failed to clean biased terms:", e);
    }
  };

  const handleAddMandatoryLicense = () => {
    let licenseSentence = "Active PRC Professional License in good standing";
    const t = title.toLowerCase();
    if (t.includes("nurse")) {
      licenseSentence = "Active PRC Registered Nurse (RN) License";
    } else if (t.includes("accountant") || t.includes("cpa")) {
      licenseSentence = "Active PRC Certified Public Accountant (CPA) License";
    } else if (t.includes("civil engineer")) {
      licenseSentence = "Active PRC Civil Engineer License";
    } else if (t.includes("mechanical engineer")) {
      licenseSentence = "Active PRC Mechanical Engineer License";
    } else if (t.includes("electrical engineer")) {
      licenseSentence = "Active PRC Electrical Engineer License";
    } else if (t.includes("teacher")) {
      licenseSentence = "Active PRC Licensed Professional Teacher (LPT) Credential";
    } else if (t.includes("pharmacist")) {
      licenseSentence = "Active PRC Registered Pharmacist License";
    } else if (t.includes("physician") || t.includes("doctor")) {
      licenseSentence = "Active PRC Physician License";
    }

    if (!requiredSkills.some((s) => s.toLowerCase() === licenseSentence.toLowerCase())) {
      setRequiredSkills([licenseSentence, ...requiredSkills]);
      setFieldErrors((prev) => ({ ...prev, requiredSkills: null }));
    }
    setLintFlags((prev) => prev.filter((f) => f.category !== "missing_regulatory_license"));
    toast.success("Licensure requirement added", {
      description: `Added "${licenseSentence}" to must-have qualifications.`,
    });
  };

  const addReqSkill = (customInput?: string) => {
    const raw = customInput !== undefined ? customInput : reqSkillInput;
    const parts = parseQualificationItems(raw);
    if (parts.length === 0) return;

    setRequiredSkills((prev) => {
      const existingLower = new Set(prev.map((item) => item.toLowerCase()));
      const deduped = parts.filter((p) => {
        const lower = p.toLowerCase();
        if (existingLower.has(lower)) return false;
        existingLower.add(lower);
        return true;
      });
      return deduped.length > 0 ? [...prev, ...deduped] : prev;
    });
    setFieldErrors((prev) => ({ ...prev, requiredSkills: null }));
    setReqSkillInput("");
  };

  const handleReqPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && /[\r\n•●▪]/.test(pasted)) {
      e.preventDefault();
      addReqSkill(pasted);
      const count = parseQualificationItems(pasted).length;
      if (count > 1) {
        toast.success(`Added ${count} qualification criteria`, {
          description: "Multi-line requirements were split into individual items.",
        });
      }
    }
  };

  const removeReqSkill = (skill: string) => {
    setRequiredSkills((prev) => prev.filter((s) => s !== skill));
    if (editingReqIdx !== null) {
      setEditingReqIdx(null);
      setEditingReqText("");
    }
  };

  const moveReqToPref = (skill: string) => {
    setRequiredSkills((prev) => prev.filter((s) => s !== skill));
    setPreferredSkills((prev) =>
      prev.some((s) => s.toLowerCase() === skill.toLowerCase()) ? prev : [...prev, skill]
    );
    setEditingReqIdx(null);
  };

  const startEditingReq = (idx: number, currentVal: string) => {
    setEditingReqIdx(idx);
    setEditingReqText(currentVal);
  };

  const saveEditingReq = (idx: number) => {
    const cleaned = cleanQualificationSentence(editingReqText);
    if (!cleaned) {
      setEditingReqIdx(null);
      setEditingReqText("");
      return;
    }
    setRequiredSkills((prev) => prev.map((item, i) => (i === idx ? cleaned : item)));
    setEditingReqIdx(null);
    setEditingReqText("");
  };

  const addPrefSkill = (customInput?: string) => {
    const raw = customInput !== undefined ? customInput : prefSkillInput;
    const parts = parseQualificationItems(raw);
    if (parts.length === 0) return;

    setPreferredSkills((prev) => {
      const existingLower = new Set(prev.map((item) => item.toLowerCase()));
      const deduped = parts.filter((p) => {
        const lower = p.toLowerCase();
        if (existingLower.has(lower)) return false;
        existingLower.add(lower);
        return true;
      });
      return deduped.length > 0 ? [...prev, ...deduped] : prev;
    });
    setPrefSkillInput("");
  };

  const handlePrefPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && /[\r\n•●▪]/.test(pasted)) {
      e.preventDefault();
      addPrefSkill(pasted);
      const count = parseQualificationItems(pasted).length;
      if (count > 1) {
        toast.success(`Added ${count} preferred qualifications`, {
          description: "Multi-line items were split into individual bonus criteria.",
        });
      }
    }
  };

  const removePrefSkill = (skill: string) => {
    setPreferredSkills((prev) => prev.filter((s) => s !== skill));
    if (editingPrefIdx !== null) {
      setEditingPrefIdx(null);
      setEditingPrefText("");
    }
  };

  const movePrefToReq = (skill: string) => {
    setPreferredSkills((prev) => prev.filter((s) => s !== skill));
    setRequiredSkills((prev) =>
      prev.some((s) => s.toLowerCase() === skill.toLowerCase()) ? prev : [...prev, skill]
    );
    setFieldErrors((prev) => ({ ...prev, requiredSkills: null }));
    setEditingPrefIdx(null);
  };

  const startEditingPref = (idx: number, currentVal: string) => {
    setEditingPrefIdx(idx);
    setEditingPrefText(currentVal);
  };

  const saveEditingPref = (idx: number) => {
    const cleaned = cleanQualificationSentence(editingPrefText);
    if (!cleaned) {
      setEditingPrefIdx(null);
      setEditingPrefText("");
      return;
    }
    setPreferredSkills((prev) => prev.map((item, i) => (i === idx ? cleaned : item)));
    setEditingPrefIdx(null);
    setEditingPrefText("");
  };

  const validateStep1Fields = () => {
    const nextErrors: FieldErrorMap = {};
    const cleanTitle = title.trim();
    const cleanDept = department.trim();
    const cleanType = employmentType.trim();
    const cleanLoc = location.trim();
    const cleanDesc = description.trim();
    const cleanOverview = jobOverview.trim();
    const minSalaryValue = parseSalaryInput(salaryMin);
    const maxSalaryValue = salaryMode === "fixed" ? minSalaryValue : parseSalaryInput(salaryMax);

    if (!cleanTitle) {
      nextErrors.title = "Job title is required.";
    } else if (cleanTitle.length < 3) {
      nextErrors.title = "Job title must be at least 3 characters.";
    } else if (cleanTitle.length > 255) {
      nextErrors.title = "Job title cannot exceed 255 characters.";
    }

    if (!cleanDept) {
      nextErrors.department = "Department or industry is required.";
    } else if (cleanDept.length < 2) {
      nextErrors.department = "Department must be at least 2 characters.";
    } else if (cleanDept.length > 100) {
      nextErrors.department = "Department cannot exceed 100 characters.";
    }

    if (!cleanType) {
      nextErrors.employmentType = "Select an employment type to continue.";
    }

    if (!cleanLoc) {
      nextErrors.location = "Location and work setup are required.";
    } else if (cleanLoc.length < 2) {
      nextErrors.location = "Location must be at least 2 characters.";
    }

    if (!cleanDesc) {
      nextErrors.description = "Core responsibilities and operational duties are required.";
    } else if (cleanDesc.length < 20) {
      nextErrors.description =
        "Provide at least 20 characters of responsibilities for accurate matching.";
    }

    if (!cleanOverview) {
      nextErrors.jobOverview = "Job overview is required.";
    } else if (cleanOverview.length < 40) {
      nextErrors.jobOverview = "Job overview must be at least 40 characters.";
    } else if (cleanOverview.length > 1000) {
      nextErrors.jobOverview = "Job overview cannot exceed 1,000 characters.";
    }

    if (salaryMode === "fixed") {
      if (minSalaryValue === null) {
        nextErrors.salary = "Monthly salary is required.";
      } else if (minSalaryValue <= 0) {
        nextErrors.salary = "Enter a monthly salary greater than zero.";
      }
    } else if (minSalaryValue === null && maxSalaryValue === null) {
      nextErrors.salary = "Monthly salary range is required.";
    } else if (minSalaryValue === null || minSalaryValue <= 0) {
      nextErrors.salary = "Enter a minimum monthly salary greater than zero.";
    } else if (maxSalaryValue === null || maxSalaryValue <= 0) {
      nextErrors.salary = "Enter a maximum monthly salary greater than zero.";
    } else if (maxSalaryValue < minSalaryValue) {
      nextErrors.salary = "Maximum salary must be greater than or equal to minimum salary.";
    }

    setFieldErrors((prev) => ({
      ...prev,
      title: nextErrors.title || null,
      department: nextErrors.department || null,
      employmentType: nextErrors.employmentType || null,
      location: nextErrors.location || null,
      description: nextErrors.description || null,
      jobOverview: nextErrors.jobOverview || null,
      salary: nextErrors.salary || null,
    }));

    return (
      nextErrors.title ||
      nextErrors.department ||
      nextErrors.employmentType ||
      nextErrors.location ||
      nextErrors.description ||
      nextErrors.jobOverview ||
      nextErrors.salary ||
      null
    );
  };

  const validateStep2Fields = (effectiveReqCount?: number) => {
    const nextErrors: FieldErrorMap = {};
    const count = effectiveReqCount !== undefined ? effectiveReqCount : requiredSkills.length;

    if (!minExp.trim()) {
      nextErrors.minExp = "Minimum experience requirement is required.";
    }
    if (!education.trim()) {
      nextErrors.education = "Education or credential requirement is required.";
    }
    if (count === 0) {
      nextErrors.requiredSkills =
        "Add at least one must-have qualification sentence or license so the rubric can evaluate candidates.";
    }

    setFieldErrors((prev) => ({
      ...prev,
      minExp: nextErrors.minExp || null,
      education: nextErrors.education || null,
      requiredSkills: nextErrors.requiredSkills || null,
    }));

    return nextErrors.minExp || nextErrors.education || nextErrors.requiredSkills || null;
  };

  const handleProceedToStep2 = () => {
    setFormError(null);
    const step1Err = validateStep1Fields();
    if (step1Err) {
      toast.warning("Check highlighted fields", {
        description: step1Err,
      });
      return;
    }
    setStep(2);
  };

  const handleProceedToStep3 = () => {
    setFormError(null);
    const pendingReqItems = parseQualificationItems(reqSkillInput);
    const pendingPrefItems = parseQualificationItems(prefSkillInput);

    if (pendingReqItems.length > 0) {
      addReqSkill(reqSkillInput);
    }
    if (pendingPrefItems.length > 0) {
      addPrefSkill(prefSkillInput);
    }

    const totalReqAfterFlush = requiredSkills.length + pendingReqItems.length;
    const step2Err = validateStep2Fields(totalReqAfterFlush);
    if (step2Err) {
      toast.warning("Check highlighted fields", {
        description: step2Err,
      });
      return;
    }
    setStep(3);
  };

  const handleTabChange = (nextTabId: string) => {
    const target = Number(nextTabId) as 1 | 2 | 3;
    if (target === step) return;
    if (target === 1) {
      setStep(1);
      return;
    }
    if (target === 2) {
      if (step === 3) {
        setStep(2);
      } else {
        handleProceedToStep2();
      }
      return;
    }
    if (target === 3) {
      if (step === 1) {
        const step1Err = validateStep1Fields();
        if (step1Err) {
          toast.warning("Complete Role & duties first", { description: step1Err });
          return;
        }
        const step2Err = validateStep2Fields();
        if (step2Err) {
          setStep(2);
          toast.warning("Complete Qualifications first", { description: step2Err });
          return;
        }
        setStep(3);
      } else {
        handleProceedToStep3();
      }
    }
  };

  const submitJob = async () => {
    setFormError(null);

    const step1Err = validateStep1Fields();
    if (step1Err) {
      toast.warning("Missing required fields", { description: step1Err });
      setStep(1);
      return;
    }

    const salaryMinValue = parseSalaryInput(salaryMin);
    const salaryMaxValue = salaryMode === "fixed" ? salaryMinValue : parseSalaryInput(salaryMax);
    if (jobStatus === "PUBLISHED" && (salaryMinValue === null || salaryMaxValue === null)) {
      const salaryError = "Monthly salary is required before publishing. Add an amount or save as draft.";
      setFieldErrors((prev) => ({ ...prev, salary: salaryError }));
      toast.warning("Add monthly salary", { description: salaryError });
      setStep(1);
      return;
    }
    if (jobStatus === "PUBLISHED" && jobOverview.trim().length < 40) {
      const overviewError = "Add a job overview of at least 40 characters before publishing, or save as draft.";
      setFieldErrors((prev) => ({ ...prev, jobOverview: overviewError }));
      toast.warning("Add job overview", { description: overviewError });
      setStep(1);
      return;
    }

    const step2Err = validateStep2Fields();
    if (step2Err) {
      toast.warning("Missing qualification criteria", { description: step2Err });
      setStep(2);
      return;
    }

    if (!isWeightValid) {
      const weightMsg = `Rubric weights currently total ${totalRubricWeight}%. Adjust them to equal 100% or click Auto-balance.`;
      setFieldErrors((prev) => ({ ...prev, rubricWeights: weightMsg }));
      toast.warning("Rubric total must equal 100%", { description: weightMsg });
      return;
    }

    setFieldErrors((prev) => ({ ...prev, rubricWeights: null }));
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        department: department.trim(),
        employment_type: employmentType.trim(),
        location: location.trim(),
        description: description.trim(),
        job_overview: jobOverview.trim() || null,
        minimum_experience: minExp.trim(),
        education_requirement: education.trim(),
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        salary_min: salaryMinValue,
        salary_max: salaryMaxValue,
        rubric_weights: rubricWeights,
        status: jobStatus,
      };

      if (!jobToEdit && initialTemplate && initialTemplate.id) {
        payload.source_job_id = initialTemplate.id;
      }

      const savedJob = await fetchApi<Job>(jobToEdit ? `/jobs/${jobToEdit.id}/` : "/jobs/", {
        method: jobToEdit ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });

      toast.success(
        jobToEdit
          ? "Draft updated"
          : initialTemplate
            ? "New opening created"
            : "Job requisition created",
        {
          description: jobToEdit
            ? `${savedJob.title} has been saved.`
            : `${savedJob.title} is ready for candidate screening.`,
        }
      );
      resetForm();
      onJobCreated(savedJob);
      if (onSuccessRedirect) {
        onSuccessRedirect(savedJob);
      }
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save job requisition";
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          title: err.fieldErrors.title || prev.title,
          department: err.fieldErrors.department || prev.department,
          employmentType: err.fieldErrors.employment_type || prev.employmentType,
          location: err.fieldErrors.location || prev.location,
          description: err.fieldErrors.description || prev.description,
          jobOverview: err.fieldErrors.job_overview || prev.jobOverview,
          salary:
            err.fieldErrors.salary_min || err.fieldErrors.salary_max || prev.salary,
          requiredSkills: err.fieldErrors.required_skills || prev.requiredSkills,
          rubricWeights: err.fieldErrors.rubric_weights || prev.rubricWeights,
        }));
      }
      setFormError(msg);
      toast.error(jobToEdit ? "Failed to update draft" : "Failed to create job", {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    if (step === 1) {
      handleProceedToStep2();
      return;
    }
    if (step === 2) {
      handleProceedToStep3();
      return;
    }
    await submitJob();
  };

  const modalTitle = jobToEdit
    ? "Edit draft requisition"
    : initialTemplate
      ? "Duplicate as new opening"
      : "Create job requisition";

  const modalDescription = initialTemplate
    ? "Review the copied role details and rubric weights to publish a fresh opening with zero applicants."
    : "Define role responsibilities, qualification sentences, and rubric weights for objective candidate screening.";

  const primaryLabel =
    jobStatus === "PUBLISHED"
      ? jobToEdit
        ? "Save & publish"
        : "Publish job"
      : jobToEdit
        ? "Save draft"
        : "Save as draft";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !loading && !open && onClose()}>
      <DialogContent
        onClose={() => !loading && onClose()}
        className="max-w-4xl overflow-hidden"
      >
        <TooltipProvider delayDuration={250}>
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <DialogTitle>{modalTitle}</DialogTitle>
            </div>
            <DialogDescription>{modalDescription}</DialogDescription>
          </DialogHeader>

          <FilterTabs
            label="Job creation steps"
            value={String(step)}
            onValueChange={handleTabChange}
            fullWidth
            tabs={[
              { id: "1", label: "1. Role & duties" },
              {
                id: "2",
                label: "2. Qualifications",
                count: requiredSkills.length > 0 ? requiredSkills.length : undefined,
              },
              { id: "3", label: "3. Screening & publish" },
            ]}
          />

          <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-auto flex-col gap-5">
            <div className="min-h-0 flex-auto space-y-5 overflow-y-auto -mx-1.5 px-1.5 py-1">
              {formError ? (
                <FormAlertNote
                  variant="error"
                  title="Requisition could not be saved"
                  description={formError}
                  onDismiss={() => setFormError(null)}
                />
              ) : null}

              {initialTemplate && !jobToEdit ? (
                <FormAlertNote
                  variant="info"
                  title={`Duplicating from ${initialTemplate.title || "archived requisition"}`}
                  description="Creates a separate opening with 0 applicants while keeping the archived requisition intact for audit compliance."
                />
              ) : null}

              {/* STEP 1: ROLE & DUTIES */}
              {step === 1 ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Job title"
                      htmlFor="job-title"
                      required
                      error={fieldErrors.title || undefined}
                    >
                      <Input
                        id="job-title"
                        type="text"
                        value={title}
                        error={Boolean(fieldErrors.title)}
                        disabled={loading}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTitle(val);
                          if (fieldErrors.title && val.trim().length >= 3) {
                            setFieldErrors((prev) => ({ ...prev, title: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!title.trim()) {
                            setFieldErrors((prev) => ({ ...prev, title: "Job title is required." }));
                          } else if (title.trim().length < 3) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              title: "Job title must be at least 3 characters.",
                            }));
                          }
                        }}
                        placeholder="e.g. Registered Staff Nurse, Full Stack Developer"
                      />
                    </FormField>

                    <FormField
                      label="Department / industry"
                      htmlFor="job-dept"
                      required
                      error={fieldErrors.department || undefined}
                    >
                      <Input
                        id="job-dept"
                        type="text"
                        value={department}
                        error={Boolean(fieldErrors.department)}
                        disabled={loading}
                        onChange={(e) => {
                          const val = e.target.value;
                          setDepartment(val);
                          if (fieldErrors.department && val.trim().length >= 2) {
                            setFieldErrors((prev) => ({ ...prev, department: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!department.trim()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              department: "Department or industry is required.",
                            }));
                          }
                        }}
                        placeholder="e.g. Healthcare, Information Technology, Finance"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Employment type"
                      htmlFor="job-type"
                      required
                      error={fieldErrors.employmentType || undefined}
                    >
                      <Select
                        value={employmentType}
                        onValueChange={(value) => {
                          setEmploymentType(value);
                          setFieldErrors((prev) => ({ ...prev, employmentType: null }));
                        }}
                        disabled={loading}
                      >
                        <SelectTrigger
                          id="job-type"
                          aria-invalid={fieldErrors.employmentType ? true : undefined}
                        >
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          {employmentOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField
                      label="Location & work setup"
                      htmlFor="job-loc"
                      required
                      error={fieldErrors.location || undefined}
                    >
                      <Input
                        id="job-loc"
                        type="text"
                        value={location}
                        error={Boolean(fieldErrors.location)}
                        disabled={loading}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocation(val);
                          if (fieldErrors.location && val.trim().length >= 2) {
                            setFieldErrors((prev) => ({ ...prev, location: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!location.trim()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              location: "Location and work setup are required.",
                            }));
                          }
                        }}
                        placeholder="e.g. Makati City (Hybrid), Remote"
                      />
                    </FormField>
                  </div>

                  <FormField
                    label="Monthly salary"
                    htmlFor="job-salary-min"
                    required
                    error={fieldErrors.salary || undefined}
                    action={
                      <FilterTabs
                        label="Salary format"
                        value={salaryMode}
                        onValueChange={(value) => {
                          if (loading) return;
                          setSalaryMode(value as "fixed" | "range");
                          setFieldErrors((prev) => ({ ...prev, salary: null }));
                        }}
                        className={cn("shrink-0", loading && "pointer-events-none opacity-60")}
                        tabs={[
                          { id: "fixed", label: "Fixed" },
                          { id: "range", label: "Range" },
                        ]}
                      />
                    }
                  >
                    {salaryMode === "fixed" ? (
                      <div className="relative">
                        <span
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                          aria-hidden="true"
                        >
                          ₱
                        </span>
                        <Input
                          id="job-salary-min"
                          value={salaryMin}
                          inputMode="numeric"
                          autoComplete="off"
                          className="pl-8 tabular-nums"
                          error={Boolean(fieldErrors.salary)}
                          disabled={loading}
                          placeholder="50,000"
                          aria-label="Fixed monthly salary"
                          onChange={(event) => {
                            setSalaryMin(formatSalaryInput(event.target.value));
                            setFieldErrors((prev) => ({ ...prev, salary: null }));
                          }}
                          onBlur={() => {
                            const val = parseSalaryInput(salaryMin);
                            if (val === null) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                salary: "Monthly salary is required.",
                              }));
                            } else if (val <= 0) {
                              setFieldErrors((prev) => ({
                                ...prev,
                                salary: "Enter a monthly salary greater than zero.",
                              }));
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <FormField label="Minimum" htmlFor="job-salary-min">
                          <div className="relative">
                            <span
                              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                              aria-hidden="true"
                            >
                              ₱
                            </span>
                            <Input
                              id="job-salary-min"
                              value={salaryMin}
                              inputMode="numeric"
                              autoComplete="off"
                              className="pl-8 tabular-nums"
                              error={Boolean(fieldErrors.salary)}
                              disabled={loading}
                              placeholder="50,000"
                              aria-label="Minimum monthly salary"
                              onChange={(event) => {
                                setSalaryMin(formatSalaryInput(event.target.value));
                                setFieldErrors((prev) => ({ ...prev, salary: null }));
                              }}
                              onBlur={() => {
                                const minVal = parseSalaryInput(salaryMin);
                                if (minVal === null || minVal <= 0) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    salary: "Enter a minimum monthly salary greater than zero.",
                                  }));
                                }
                              }}
                            />
                          </div>
                        </FormField>

                        <FormField label="Maximum" htmlFor="job-salary-max">
                          <div className="relative">
                            <span
                              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground"
                              aria-hidden="true"
                            >
                              ₱
                            </span>
                            <Input
                              id="job-salary-max"
                              value={salaryMax}
                              inputMode="numeric"
                              autoComplete="off"
                              className="pl-8 tabular-nums"
                              error={Boolean(fieldErrors.salary)}
                              disabled={loading}
                              placeholder="75,000"
                              aria-label="Maximum monthly salary"
                              onChange={(event) => {
                                setSalaryMax(formatSalaryInput(event.target.value));
                                setFieldErrors((prev) => ({ ...prev, salary: null }));
                              }}
                              onBlur={() => {
                                const minVal = parseSalaryInput(salaryMin);
                                const maxVal = parseSalaryInput(salaryMax);
                                if (maxVal === null || maxVal <= 0) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    salary: "Enter a maximum monthly salary greater than zero.",
                                  }));
                                } else if (minVal !== null && maxVal < minVal) {
                                  setFieldErrors((prev) => ({
                                    ...prev,
                                    salary:
                                      "Maximum salary must be greater than or equal to minimum salary.",
                                  }));
                                }
                              }}
                            />
                          </div>
                        </FormField>
                      </div>
                    )}
                  </FormField>

                  <FormField
                    label="Job overview"
                    htmlFor="job-overview"
                    required
                    error={fieldErrors.jobOverview || undefined}
                    action={
                      <div className="flex items-center gap-2">
                        <span className="text-sm tabular-nums text-muted-foreground">
                          {jobOverview.length} / 1,000
                        </span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <IconButton
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              label="Writing tips for job overview"
                            >
                              <Info />
                            </IconButton>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80 space-y-2">
                            <p className="text-sm font-semibold text-foreground">
                              Writing a clear job overview
                            </p>
                            <p className="text-sm leading-5 text-muted-foreground">
                              Summarize why the role exists, who the person collaborates with, and its primary outcome. Save day-to-day tasks for the responsibilities field below.
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                    }
                  >
                    <Textarea
                      id="job-overview"
                      rows={4}
                      value={jobOverview}
                      maxLength={1000}
                      error={Boolean(fieldErrors.jobOverview)}
                      disabled={loading}
                      onChange={(event) => {
                        const value = event.target.value;
                        setJobOverview(value);
                        if (fieldErrors.jobOverview && value.trim().length >= 40) {
                          setFieldErrors((prev) => ({ ...prev, jobOverview: null }));
                        }
                      }}
                      onBlur={() => {
                        const trimmed = jobOverview.trim();
                        if (!trimmed) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            jobOverview: "Job overview is required.",
                          }));
                        } else if (trimmed.length < 40) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            jobOverview: "Job overview must be at least 40 characters.",
                          }));
                        }
                      }}
                      placeholder="Explain how this role contributes to the team, who the person will collaborate with, and the impact they can make."
                    />
                  </FormField>

                  <FormField
                    label="Core responsibilities & duties"
                    htmlFor="job-desc"
                    required
                    error={fieldErrors.description || undefined}
                    action={
                      <div className="flex items-center gap-2">
                        {isLinting ? (
                          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Spinner className="text-primary" label="Checking bias" />
                            <span>Checking bias…</span>
                          </span>
                        ) : lintFlags.length === 0 && description.trim().length > 30 ? (
                          <StatusBadge status="success" dot>
                            Bias-free
                          </StatusBadge>
                        ) : null}

                        <Popover>
                          <PopoverTrigger asChild>
                            <IconButton
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              label="Writing tips for effective screening"
                            >
                              <Info />
                            </IconButton>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80 space-y-2">
                            <p className="text-sm font-semibold text-foreground">
                              Writing effective duties
                            </p>
                            <p className="text-sm leading-5 text-muted-foreground">
                              Describe observable day-to-day actions (e.g., &ldquo;Administer prescribed IV medications&rdquo; or &ldquo;Design REST APIs in Django&rdquo;) instead of generic traits like &ldquo;rockstar&rdquo; or &ldquo;young and energetic.&rdquo;
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                    }
                  >
                    <Textarea
                      id="job-desc"
                      rows={6}
                      value={description}
                      error={Boolean(fieldErrors.description)}
                      disabled={loading}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDescription(val);
                        if (fieldErrors.description && val.trim().length >= 20) {
                          setFieldErrors((prev) => ({ ...prev, description: null }));
                        }
                      }}
                      onBlur={() => {
                        if (!description.trim()) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            description: "Core responsibilities and operational duties are required.",
                          }));
                        } else if (description.trim().length < 20) {
                          setFieldErrors((prev) => ({
                            ...prev,
                            description:
                              "Provide at least 20 characters of responsibilities for accurate matching.",
                          }));
                        }
                      }}
                      placeholder={
                        "• Daily Responsibility 1 (e.g. Administer prescribed medications and monitor patient vital signs)\n• Daily Responsibility 2 (e.g. Maintain accurate clinical records and chart patient progress)\n• Daily Responsibility 3 (e.g. Collaborate with interdisciplinary teams on care plans)"
                      }
                    />
                  </FormField>

                  {lintFlags.length > 0 ? (
                    <div
                      role="alert"
                      className="space-y-3 rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 text-foreground"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="size-4 shrink-0 text-warning" aria-hidden="true" />
                          <p className="text-sm font-semibold text-foreground">
                            Anti-bias &amp; licensure feedback ({lintFlags.length})
                          </p>
                        </div>
                        {cleanReplacementsAvailable ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoCleanBias}
                          >
                            Sanitize biased terms
                          </Button>
                        ) : null}
                      </div>

                      <ul className="space-y-2">
                        {lintFlags.map((flag, idx) => (
                          <li
                            key={`${flag.category}-${idx}`}
                            className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <StatusBadge status="warning">
                                {flag.category.replace(/_/g, " ")}
                              </StatusBadge>
                              <span className="leading-5 text-foreground">{flag.message}</span>
                            </div>
                            {flag.category === "missing_regulatory_license" ? (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleAddMandatoryLicense}
                                className="self-start shrink-0"
                              >
                                <Plus aria-hidden="true" />
                                Add PRC license
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {/* STEP 2: QUALIFICATIONS & LICENSES */}
              {step === 2 ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label="Minimum experience"
                      htmlFor="job-exp"
                      required
                      error={fieldErrors.minExp || undefined}
                      description="Tenure-inflation cap applies automatically."
                    >
                      <Input
                        id="job-exp"
                        type="text"
                        value={minExp}
                        error={Boolean(fieldErrors.minExp)}
                        disabled={loading}
                        onChange={(e) => {
                          const val = e.target.value;
                          setMinExp(val);
                          if (fieldErrors.minExp && val.trim()) {
                            setFieldErrors((prev) => ({ ...prev, minExp: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!minExp.trim()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              minExp: "Minimum experience requirement is required.",
                            }));
                          }
                        }}
                        placeholder="e.g. At least 2 years of relevant experience"
                      />
                    </FormField>

                    <FormField
                      label="Education & academic credentials"
                      htmlFor="job-edu"
                      required
                      error={fieldErrors.education || undefined}
                      description="Evaluated by degree level and field fit."
                    >
                      <Input
                        id="job-edu"
                        type="text"
                        value={education}
                        error={Boolean(fieldErrors.education)}
                        disabled={loading}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEducation(val);
                          if (fieldErrors.education && val.trim()) {
                            setFieldErrors((prev) => ({ ...prev, education: null }));
                          }
                        }}
                        onBlur={() => {
                          if (!education.trim()) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              education: "Education or credential requirement is required.",
                            }));
                          }
                        }}
                        placeholder="e.g. Bachelor's degree in Nursing or Computer Science"
                      />
                    </FormField>
                  </div>

                  <QualificationChecklistPanel
                    variant="required"
                    inputId="req-skills-input"
                    title="Must-have competencies & state licenses"
                    description="Enter full qualification sentences or required licenses (e.g. PRC). Paste multi-line bullet lists to split automatically."
                    weightLabel={`${rubricWeights.required_skills}% core weight`}
                    items={requiredSkills}
                    inputValue={reqSkillInput}
                    placeholder="e.g. Hands-on experience building REST APIs with Django, or Active PRC RN License"
                    addButtonLabel="Add criterion"
                    emptyTitle="No must-have screening criteria added yet"
                    emptyDescription="Enter a qualification sentence above and press Enter, or paste bullet points from an existing job description."
                    error={fieldErrors.requiredSkills}
                    editingIdx={editingReqIdx}
                    editingText={editingReqText}
                    moveDirection="down"
                    moveTooltip="Move to preferred qualifications"
                    onInputChange={setReqSkillInput}
                    onAdd={() => addReqSkill()}
                    onPaste={handleReqPaste}
                    onStartEdit={startEditingReq}
                    onEditTextChange={setEditingReqText}
                    onSaveEdit={saveEditingReq}
                    onCancelEdit={() => {
                      setEditingReqIdx(null);
                      setEditingReqText("");
                    }}
                    onMoveItem={moveReqToPref}
                    onRemoveItem={removeReqSkill}
                  />

                  <QualificationChecklistPanel
                    variant="preferred"
                    inputId="pref-skills-input"
                    title="Preferred qualifications & bonus certifications"
                    description="Optional competencies, specialized tools, or secondary certifications that award bonus merit points."
                    weightLabel={`${rubricWeights.preferred_skills}% bonus pool`}
                    items={preferredSkills}
                    inputValue={prefSkillInput}
                    placeholder="e.g. Familiarity with Docker and CI/CD pipelines, or BLS/ACLS certification"
                    addButtonLabel="Add bonus"
                    emptyTitle="No preferred qualifications added (optional)"
                    emptyDescription="Add optional credentials or tools candidates can earn bonus rubric credit for."
                    editingIdx={editingPrefIdx}
                    editingText={editingPrefText}
                    moveDirection="up"
                    moveTooltip="Promote to must-have qualification"
                    onInputChange={setPrefSkillInput}
                    onAdd={() => addPrefSkill()}
                    onPaste={handlePrefPaste}
                    onStartEdit={startEditingPref}
                    onEditTextChange={setEditingPrefText}
                    onSaveEdit={saveEditingPref}
                    onCancelEdit={() => {
                      setEditingPrefIdx(null);
                      setEditingPrefText("");
                    }}
                    onMoveItem={movePrefToReq}
                    onRemoveItem={removePrefSkill}
                  />
                </div>
              ) : null}

              {/* STEP 3: SCREENING CALIBRATION & PUBLISH */}
              {step === 3 ? (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          Scoring rubric weights
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Adjust how each dimension contributes to candidate match scores (must total 100%).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          status={isWeightValid ? "success" : "warning"}
                          dot
                          className="tabular-nums"
                        >
                          {isWeightValid
                            ? "100% Balanced"
                            : `${totalRubricWeight}% (${totalRubricWeight > 100
                              ? `+${totalRubricWeight - 100}%`
                              : `-${100 - totalRubricWeight}%`
                            })`}
                        </StatusBadge>

                        {!isWeightValid ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAutoBalance}
                          >
                            <Scale aria-hidden="true" />
                            Auto-balance
                          </Button>
                        ) : null}

                        {!areWeightsDefault(rubricWeights) ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetDefaultWeights}
                          >
                            <RotateCcw aria-hidden="true" />
                            Reset defaults
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="divide-y divide-border rounded-xl border border-border bg-muted/40">
                      {RUBRIC_DIMENSIONS.map((dimension) => {
                        const weight = rubricWeights[dimension.key] ?? 0;
                        const inputId = `rubric-weight-${dimension.key}`;

                        return (
                          <div
                            key={dimension.key}
                            className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1 space-y-1">
                              <label
                                htmlFor={inputId}
                                className="block text-sm font-semibold text-foreground"
                              >
                                {dimension.label}
                              </label>
                              <p className="text-sm leading-5 text-muted-foreground">
                                {dimension.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 sm:shrink-0">
                              <div className="hidden w-28 sm:block">
                                <Progress value={weight} aria-hidden="true" />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <IconButton
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  label={`Decrease ${dimension.label} by 5%`}
                                  onClick={() => adjustWeight(dimension.key, -5)}
                                  disabled={loading || weight <= 0}
                                >
                                  <Minus />
                                </IconButton>

                                <div className="flex items-center gap-1">
                                  <Input
                                    id={inputId}
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={5}
                                    value={weight}
                                    disabled={loading}
                                    onChange={(e) =>
                                      updateWeight(dimension.key, Number(e.target.value))
                                    }
                                    aria-label={`${dimension.label} weight percentage`}
                                    className="h-8 w-16 px-2 text-center font-semibold tabular-nums"
                                  />
                                  <span className="text-sm font-medium text-muted-foreground">%</span>
                                </div>

                                <IconButton
                                  type="button"
                                  size="icon-sm"
                                  variant="outline"
                                  label={`Increase ${dimension.label} by 5%`}
                                  onClick={() => adjustWeight(dimension.key, 5)}
                                  disabled={loading || weight >= 100}
                                >
                                  <Plus />
                                </IconButton>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {!isWeightValid ? (
                      <FieldError
                        message={
                          fieldErrors.rubricWeights ||
                          `Rubric weights currently total ${totalRubricWeight}%. Adjust to 100% before saving.`
                        }
                      />
                    ) : null}
                  </div>

                  <fieldset disabled={loading} className="space-y-2">
                    <legend className="text-sm font-semibold text-foreground">
                      Requisition visibility
                    </legend>
                    <div
                      role="radiogroup"
                      aria-label="Requisition visibility"
                      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    >
                      {POSTING_STATE_OPTIONS.map(({ value, label, detail, icon: Icon }) => {
                        const selected = jobStatus === value;
                        return (
                          <Button
                            key={value}
                            type="button"
                            variant="outline"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => setJobStatus(value)}
                            className={cn(
                              "h-auto w-full items-center justify-between gap-3 rounded-xl border p-3.5 text-left transition-all",
                              selected
                                ? "border-primary bg-primary/5 text-foreground shadow-xs hover:bg-primary/10 hover:text-foreground"
                                : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-muted/40 hover:text-foreground"
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-3">
                              <span
                                className={cn(
                                  "grid size-9 shrink-0 place-items-center rounded-lg transition-colors",
                                  selected
                                    ? "bg-primary/15 text-primary"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                <Icon className="size-4" aria-hidden="true" />
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-foreground">
                                  {label}
                                </span>
                                <span className="block truncate text-sm font-normal text-muted-foreground">
                                  {detail}
                                </span>
                              </span>
                            </span>
                            <span
                              aria-hidden="true"
                              className={cn(
                                "grid size-5 shrink-0 place-items-center rounded-full border transition-colors [&>svg]:size-3",
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-card"
                              )}
                            >
                              {selected ? <Check /> : null}
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground">
                        Blind-screening safeguards active
                      </p>
                      <Badge variant="secondary" className="tabular-nums">
                        {requiredSkills.length} must-have · {preferredSkills.length} preferred
                      </Badge>
                    </div>
                    <p className="mt-1.5 flex gap-2 text-sm leading-5 text-muted-foreground">
                      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                      <span>
                        Resumes are evaluated without names, photos, gender, or school prestige.
                        Skills require sentence-grounded work-history proof and tenure capping prevents inflation.
                      </span>
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            <DialogFooter className="border-t border-border pt-4 sm:justify-between">
              <div>
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                    disabled={loading}
                  >
                    <ChevronLeft aria-hidden="true" />
                    Back
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>

                {step < 3 ? (
                  <Button type="submit" disabled={loading}>
                    <span>Continue</span>
                    <ChevronRight aria-hidden="true" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={loading || !isWeightValid}>
                    {loading ? (
                      <Spinner className="text-current" label="Saving requisition" />
                    ) : null}
                    {loading ? "Saving…" : primaryLabel}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}
