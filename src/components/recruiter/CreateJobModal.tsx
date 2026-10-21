"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Loader2,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  Info,
  ChevronRight,
  ChevronLeft,
  Plus,
  Check,
  Pencil,
  ShieldCheck,
  ListChecks,
} from "lucide-react";
import { Job, JobStatus } from "@/types/job";
import { fetchApi, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { FieldError, FormAlertNote } from "@/components/ui/form-error";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: Job) => void;
}

interface LintFlag {
  category: string;
  matched_terms?: string[];
  message: string;
  severity: "warning" | "error" | "info";
}

interface RubricWeights {
  required_skills: number;
  experience: number;
  education: number;
  preferred_skills: number;
  projects: number;
}

const DEFAULT_RUBRIC_WEIGHTS: RubricWeights = {
  required_skills: 40,
  experience: 25,
  education: 15,
  preferred_skills: 10,
  projects: 10,
};

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

export function CreateJobModal({ isOpen, onClose, onJobCreated }: CreateJobModalProps) {
  // Stepper state (1: Role & Duties, 2: Qualifications & Credentials, 3: Screening Calibration)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Blank-slate form fields (no prefilled defaults)
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [minExp, setMinExp] = useState("");
  const [education, setEducation] = useState("");
  const [jobStatus, setJobStatus] = useState<JobStatus>("PUBLISHED");

  // Sentence-based Must-Have & Preferred Qualifications (blank by default)
  const [reqSkillInput, setReqSkillInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [prefSkillInput, setPrefSkillInput] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);

  // Inline editing state for qualification rows
  const [editingReqIdx, setEditingReqIdx] = useState<number | null>(null);
  const [editingReqText, setEditingReqText] = useState("");
  const [editingPrefIdx, setEditingPrefIdx] = useState<number | null>(null);
  const [editingPrefText, setEditingPrefText] = useState("");

  // Guidance popover disclosure
  const [showBestPracticeTip, setShowBestPracticeTip] = useState(false);

  // 5-Component Scoring Rubric Weights
  const [rubricWeights, setRubricWeights] = useState<RubricWeights>(DEFAULT_RUBRIC_WEIGHTS);

  // Section 13.11 Pre-flight Linter states
  const [lintFlags, setLintFlags] = useState<LintFlag[]>([]);
  const [isLinting, setIsLinting] = useState(false);
  const [cleanReplacementsAvailable, setCleanReplacementsAvailable] = useState(false);
  const lintAbortControllerRef = useRef<AbortController | null>(null);

  // Form submission & validation
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string | null;
    department?: string | null;
    employmentType?: string | null;
    location?: string | null;
    description?: string | null;
    minExp?: string | null;
    education?: string | null;
    requiredSkills?: string | null;
    rubricWeights?: string | null;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setStep(1);
    setTitle("");
    setDepartment("");
    setEmploymentType("");
    setLocation("");
    setDescription("");
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

  // Determine if role is regulated dynamically
  const isRegulated = useMemo(() => {
    const combined = `${title} ${department} ${description}`.toLowerCase();
    const regulatedKeywords = [
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
    return regulatedKeywords.some((kw) => combined.includes(kw));
  }, [title, department, description]);

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

  // Auto-balance weights to exactly 100% proportionally
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
      toast.info("Reset to Default Weights", {
        description: "Weights set to 40 / 25 / 15 / 10 / 10.",
      });
      return;
    }

    const scaled = keys.map((key) => ({
      key,
      val: Math.round((rubricWeights[key] / currentSum) * 100),
    }));

    const scaledSum = scaled.reduce((sum, item) => sum + item.val, 0);
    const delta = 100 - scaledSum;
    scaled[0].val += delta;

    const balanced: RubricWeights = {
      required_skills: scaled[0].val,
      experience: scaled[1].val,
      education: scaled[2].val,
      preferred_skills: scaled[3].val,
      projects: scaled[4].val,
    };

    setRubricWeights(balanced);
    setFieldErrors((prev) => ({ ...prev, rubricWeights: null }));
    toast.success("Weights Auto-Balanced", {
      description: "Rubric percentages normalized to exactly 100%.",
    });
  }, [rubricWeights, totalRubricWeight]);

  // Direct manual weight adjustment
  const updateWeight = (key: keyof RubricWeights, val: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(val)));
    setRubricWeights((prev) => ({ ...prev, [key]: clamped }));
  };

  const adjustWeight = (key: keyof RubricWeights, delta: number) => {
    updateWeight(key, (rubricWeights[key] || 0) + delta);
  };

  // Section 13.11 Pre-flight Linting with AbortController
  const runLintCheck = useCallback(
    async (descText: string, reqSkills: string[], eduText: string, roleTitle: string) => {
      if (!descText.trim()) {
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
          has_replacements: boolean;
        }>("/jobs/lint-jd/", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            title: roleTitle,
            description: descText,
            required_skills: reqSkills,
            education_requirement: eduText,
          }),
        });

        setLintFlags(res.flags || []);
        setCleanReplacementsAvailable(res.has_replacements || false);
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

  // Debounced auto-lint on change
  useEffect(() => {
    const timer = setTimeout(() => {
      runLintCheck(description, requiredSkills, education, title);
    }, 600);
    return () => {
      clearTimeout(timer);
      if (lintAbortControllerRef.current) {
        lintAbortControllerRef.current.abort();
      }
    };
  }, [description, requiredSkills, education, title, runLintCheck]);

  // 1-Click Auto-Clean Biased Terms
  const handleAutoCleanBias = async () => {
    try {
      const res = await fetchApi<{
        cleaned_description: string;
      }>("/jobs/lint-jd/", {
        method: "POST",
        body: JSON.stringify({
          title,
          description,
          required_skills: requiredSkills,
          education_requirement: education,
        }),
      });

      if (res.cleaned_description) {
        setDescription(res.cleaned_description);
        setLintFlags((prev) => prev.filter((f) => f.category === "missing_regulatory_license"));
        setCleanReplacementsAvailable(false);
        toast.success("Biased Terms Cleaned", {
          description: "Substituted gendered or non-operational terms with objective language.",
        });
      }
    } catch (e) {
      console.warn("Failed to clean biased terms:", e);
    }
  };

  // Add mandatory PRC license if recommended by linter
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
    toast.success("Licensure Requirement Added", {
      description: `Added "${licenseSentence}" to Must-Have Qualifications.`,
    });
  };

  // Add one or more sentence qualifications to Must-Haves
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
        toast.success(`Added ${count} Qualification Criteria`, {
          description: "Multi-line requirements were split into individual checklist items.",
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

  // Add one or more sentence qualifications to Preferred
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
        toast.success(`Added ${count} Preferred Qualifications`, {
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
    const nextErrors: typeof fieldErrors = {};
    const cleanTitle = title.trim();
    const cleanDept = department.trim();
    const cleanType = employmentType.trim();
    const cleanLoc = location.trim();
    const cleanDesc = description.trim();

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
      nextErrors.employmentType = "Employment type is required.";
    }

    if (!cleanLoc) {
      nextErrors.location = "Location and work setup are required.";
    } else if (cleanLoc.length < 2) {
      nextErrors.location = "Location must be at least 2 characters.";
    }

    if (!cleanDesc) {
      nextErrors.description = "Core responsibilities and operational duties are required.";
    } else if (cleanDesc.length < 20) {
      nextErrors.description = "Please provide at least 20 characters of responsibilities for AI matching.";
    }

    setFieldErrors((prev) => ({
      ...prev,
      title: nextErrors.title || null,
      department: nextErrors.department || null,
      employmentType: nextErrors.employmentType || null,
      location: nextErrors.location || null,
      description: nextErrors.description || null,
    }));

    return (
      nextErrors.title ||
      nextErrors.department ||
      nextErrors.employmentType ||
      nextErrors.location ||
      nextErrors.description ||
      null
    );
  };

  const validateStep2Fields = (effectiveReqCount?: number) => {
    const nextErrors: typeof fieldErrors = {};
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

  // Step validation
  const handleProceedToStep2 = () => {
    setFormError(null);
    const step1Err = validateStep1Fields();
    if (step1Err) {
      toast.warning("Check Highlighted Fields", {
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
      toast.warning("Check Highlighted Fields", {
        description: step2Err,
      });
      return;
    }
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const step1Err = validateStep1Fields();
    if (step1Err) {
      toast.warning("Missing Required Fields", {
        description: step1Err,
      });
      setStep(1);
      return;
    }

    const step2Err = validateStep2Fields();
    if (step2Err) {
      toast.warning("Missing Qualification Criteria", {
        description: step2Err,
      });
      setStep(2);
      return;
    }

    if (!isWeightValid) {
      const weightMsg = `Rubric weights currently total ${totalRubricWeight}%. Adjust the sliders to equal 100% or click Auto-Balance.`;
      setFieldErrors((prev) => ({ ...prev, rubricWeights: weightMsg }));
      toast.warning("Rubric Total Must Equal 100%", {
        description: weightMsg,
      });
      return;
    }

    setFieldErrors((prev) => ({ ...prev, rubricWeights: null }));
    setLoading(true);

    try {
      const payload = {
        title: title.trim(),
        department: department.trim(),
        employment_type: employmentType.trim(),
        location: location.trim(),
        description: description.trim(),
        minimum_experience: minExp.trim(),
        education_requirement: education.trim(),
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        rubric_weights: rubricWeights,
        status: jobStatus,
      };

      const newJob = await fetchApi<Job>("/jobs/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      toast.success("Job Requisition Created!", {
        description: `${newJob.title} is now active and ready for AI resume screening.`,
      });
      resetForm();
      onJobCreated(newJob);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create job profile";
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors((prev) => ({
          ...prev,
          title: err.fieldErrors.title || prev.title,
          department: err.fieldErrors.department || prev.department,
          location: err.fieldErrors.location || prev.location,
          description: err.fieldErrors.description || prev.description,
          requiredSkills: err.fieldErrors.required_skills || prev.requiredSkills,
          rubricWeights: err.fieldErrors.rubric_weights || prev.rubricWeights,
        }));
      }
      setFormError(msg);
      toast.error("Failed to Create Job", {
        description: msg,
      });
    } finally {
      setLoading(false);
    }
  };

  const isLicenseBadge = (criterionText: string) => {
    return /\b(prc|cpa|registered\s+nurse|rn|lpt|license|licensed|board\s+exam|tesda|bosh|cosh|bls|acls)\b/i.test(
      criterionText
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onClose={onClose}
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border"
      >
        {/* Modal Header */}
        <DialogHeader className="p-5 pb-3 border-b border-border space-y-2 bg-background">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Create Job Requisition
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Define role specifications, qualification statements, and benchmark criteria for objective screening.
              </DialogDescription>
            </div>
            <Badge
              variant={isRegulated ? "default" : "secondary"}
              className="text-xs font-medium py-1 px-2.5 shrink-0"
            >
              {isRegulated ? "Regulated Profession" : "Standard Rubric"}
            </Badge>
          </div>

          {/* 3-Step Guided Wizard Stepper */}
          <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                step === 1
                  ? "border-primary bg-primary/5 text-primary font-semibold"
                  : step > 1
                  ? "border-border bg-muted/20 text-foreground hover:bg-muted/40"
                  : "border-border/60 text-muted-foreground opacity-60"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  step === 1
                    ? "bg-primary text-primary-foreground"
                    : step > 1
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > 1 ? <Check className="h-3 w-3 stroke-[3]" /> : "1"}
              </span>
              <div className="truncate">
                <span className="block leading-tight">Role &amp; Duties</span>
                <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
                  Title &amp; Responsibilities
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim() && description.trim()) setStep(2);
                else handleProceedToStep2();
              }}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                step === 2
                  ? "border-primary bg-primary/5 text-primary font-semibold"
                  : step > 2
                  ? "border-border bg-muted/20 text-foreground hover:bg-muted/40"
                  : "border-border/60 text-muted-foreground opacity-60"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  step === 2
                    ? "bg-primary text-primary-foreground"
                    : step > 2
                    ? "bg-emerald-500/15 text-emerald-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step > 2 ? <Check className="h-3 w-3 stroke-[3]" /> : "2"}
              </span>
              <div className="truncate">
                <span className="block leading-tight">Qualifications &amp; Licenses</span>
                <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
                  Must-Haves &amp; Preferred
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim() && description.trim() && requiredSkills.length > 0) setStep(3);
                else if (!title.trim() || !description.trim()) handleProceedToStep2();
                else handleProceedToStep3();
              }}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                step === 3
                  ? "border-primary bg-primary/5 text-primary font-semibold"
                  : "border-border/60 text-muted-foreground opacity-60"
              }`}
            >
              <span
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </span>
              <div className="truncate">
                <span className="block leading-tight">Screening Calibration</span>
                <span className="text-[10px] text-muted-foreground font-normal hidden sm:inline">
                  Weights &amp; Publish
                </span>
              </div>
            </button>
          </div>
        </DialogHeader>

        {/* Modal Body (Scrollable with controlled height) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {formError && (
            <FormAlertNote
              variant="error"
              title="Requisition Could Not Be Saved"
              description={formError}
              onDismiss={() => setFormError(null)}
            />
          )}

          {/* ========================================================
              STEP 1: ROLE OVERVIEW & CORE RESPONSIBILITIES
             ======================================================== */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Title & Department Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="job-title" className="text-xs font-semibold flex items-center gap-1">
                    <span>Job Title</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="job-title"
                    type="text"
                    value={title}
                    error={!!fieldErrors.title}
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
                    placeholder="e.g. Registered Staff Nurse, Senior Full Stack Developer, CPA Tax Auditor"
                    className="h-9 text-sm font-medium"
                  />
                  <FieldError message={fieldErrors.title} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-dept" className="text-xs font-semibold flex items-center gap-1">
                    <span>Department / Industry</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="job-dept"
                    type="text"
                    value={department}
                    error={!!fieldErrors.department}
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
                    placeholder="e.g. Healthcare & Nursing, Information Technology, Finance & Accounting"
                    className="h-9 text-sm"
                  />
                  <FieldError message={fieldErrors.department} />
                </div>
              </div>

              {/* Setup Details (Employment Type & Location) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label htmlFor="job-type" className="text-xs font-semibold flex items-center gap-1">
                    <span>Employment Type</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="job-type"
                    type="text"
                    value={employmentType}
                    error={!!fieldErrors.employmentType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEmploymentType(val);
                      if (fieldErrors.employmentType && val.trim()) {
                        setFieldErrors((prev) => ({ ...prev, employmentType: null }));
                      }
                    }}
                    onBlur={() => {
                      if (!employmentType.trim()) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          employmentType: "Employment type is required.",
                        }));
                      }
                    }}
                    placeholder="e.g. Full-time, Shifting, Contract, Part-time"
                    className="h-9 text-xs"
                  />
                  <FieldError message={fieldErrors.employmentType} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="job-loc" className="text-xs font-semibold flex items-center gap-1">
                    <span>Location &amp; Work Setup</span>
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="job-loc"
                    type="text"
                    value={location}
                    error={!!fieldErrors.location}
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
                    placeholder="e.g. Makati City (Hybrid), Quezon City (On-site), Remote"
                    className="h-9 text-xs"
                  />
                  <FieldError message={fieldErrors.location} />
                </div>
              </div>

              {/* Key Responsibilities & Pre-Flight Anti-Bias Check */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="job-desc" className="text-xs font-semibold flex items-center gap-1">
                      <span>Core Responsibilities &amp; Operational Duties</span>
                      <span className="text-destructive">*</span>
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowBestPracticeTip(!showBestPracticeTip)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      title="Screening Tips"
                      aria-label="View writing tips"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isLinting && (
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Checking bias...</span>
                      </span>
                    )}
                    {lintFlags.length === 0 && description.trim().length > 30 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Bias-Free &amp; Compliant</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Progressive Disclosure: Writing Tips Popover */}
                {showBestPracticeTip && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground space-y-1.5">
                    <div className="font-semibold text-foreground">
                      Writing Effective Duties for AI Screening:
                    </div>
                    <p className="leading-relaxed text-[11px]">
                      List 3–5 bullet points describing daily operational actions using active verbs (e.g.
                      <em> &quot;Administer prescribed IV medications...&quot;</em>,{" "}
                      <em> &quot;Design REST APIs...&quot;</em>). TalentMatch evaluates candidates&apos; actual
                      work history against these concrete duties.
                    </p>
                  </div>
                )}

                <Textarea
                  id="job-desc"
                  rows={6}
                  value={description}
                  error={!!fieldErrors.description}
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
                          "Please provide at least 20 characters of responsibilities for AI matching.",
                      }));
                    }
                  }}
                  placeholder="• Daily Responsibility 1 (e.g. Administer prescribed medications and monitor patient vital signs...)&#10;• Daily Responsibility 2 (e.g. Maintain accurate clinical records and chart patient progress...)&#10;• Daily Responsibility 3 (e.g. Collaborate with interdisciplinary medical teams on care plans...)"
                  className="text-xs leading-relaxed font-sans"
                />
                <FieldError message={fieldErrors.description} />

                {/* Pre-Flight Compliance & Bias Notice */}
                {lintFlags.length > 0 && (
                  <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 dark:bg-amber-950/40 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <span>
                          Anti-Bias &amp; Licensure Feedback ({lintFlags.length} notice
                          {lintFlags.length > 1 ? "s" : ""})
                        </span>
                      </div>

                      {cleanReplacementsAvailable && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAutoCleanBias}
                          className="h-6 text-[11px] px-2 border-amber-500/40 hover:bg-amber-500/20"
                        >
                          Sanitize Biased Terms
                        </Button>
                      )}
                    </div>

                    <ul className="space-y-1 pl-1">
                      {lintFlags.map((flag, idx) => (
                        <li key={idx} className="flex items-start justify-between gap-2 text-[11px] leading-tight">
                          <div>
                            <span className="font-semibold uppercase tracking-wider text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded mr-1.5">
                              {flag.category.replace(/_/g, " ")}
                            </span>
                            <span>{flag.message}</span>
                          </div>
                          {flag.category === "missing_regulatory_license" && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleAddMandatoryLicense}
                              className="h-5 text-[10px] px-2 font-semibold shrink-0"
                            >
                              + Add PRC License
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 2: QUALIFICATIONS & COMPETENCIES (SENTENCE CHECKLIST)
             ======================================================== */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Experience & Education Requirements Grid (Blank inputs with placeholder hints only) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Minimum Experience */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="job-exp" className="text-xs font-semibold">
                      Minimum Experience <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Tenure Cap Applied</span>
                  </div>
                  <Input
                    id="job-exp"
                    type="text"
                    value={minExp}
                    error={!!fieldErrors.minExp}
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
                    placeholder="e.g. At least 2 years of relevant clinical or industry experience"
                    className="h-9 text-xs"
                  />
                  <FieldError message={fieldErrors.minExp} />
                </div>

                {/* Education & Licensure */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="job-edu" className="text-xs font-semibold">
                      Education &amp; Academic Credentials <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Degree &amp; Field Fit</span>
                  </div>
                  <Input
                    id="job-edu"
                    type="text"
                    value={education}
                    error={!!fieldErrors.education}
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
                    placeholder="e.g. Bachelor's degree in Nursing, Computer Science, or equivalent field"
                    className="h-9 text-xs"
                  />
                  <FieldError message={fieldErrors.education} />
                </div>
              </div>

              {/* ================================================================
                  MUST-HAVE COMPETENCIES & STATE LICENSES (SENTENCE CHECKLIST)
                 ================================================================ */}
              <div
                className={`space-y-3 p-4 rounded-xl border transition-colors ${
                  fieldErrors.requiredSkills
                    ? "border-rose-400 bg-rose-50/40"
                    : "border-[#2196F3]/25 bg-[#edf4fc]/50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-[#1976D2] shrink-0" />
                      <Label htmlFor="req-skills-input" className="text-xs sm:text-sm font-bold text-slate-900">
                        Must-Have Competencies &amp; State Licenses <span className="text-rose-500">*</span>
                      </Label>
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e3f1fe] text-[#1976D2] border border-[#2196F3]/20">
                        {requiredSkills.length} {requiredSkills.length === 1 ? "criterion" : "criteria"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Write full qualification sentences, hands-on competencies, or required state licenses (e.g. PRC).
                      You can also paste a multi-line bullet list to split items automatically.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#1976D2] bg-white px-2.5 py-1 rounded-lg border border-[#2196F3]/20 shrink-0 self-start">
                    {rubricWeights.required_skills}% Core Screening Weight
                  </span>
                </div>

                {/* Sentence Composer Input Bar */}
                <div className="flex gap-2">
                  <Input
                    id="req-skills-input"
                    type="text"
                    value={reqSkillInput}
                    error={!!fieldErrors.requiredSkills}
                    onChange={(e) => setReqSkillInput(e.target.value)}
                    onPaste={handleReqPaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addReqSkill();
                      }
                    }}
                    placeholder="e.g. Hands-on experience building REST APIs with Python & Django, or Active PRC Registered Nurse License"
                    className="text-xs h-9 bg-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => addReqSkill()}
                    disabled={!reqSkillInput.trim()}
                    className="shrink-0 h-9 text-xs font-semibold px-3.5 bg-[#2196F3] hover:bg-[#1976D2] text-white rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Criterion
                  </Button>
                </div>
                <FieldError message={fieldErrors.requiredSkills} />

                {/* Vertical Sentence Qualification Rows */}
                {requiredSkills.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300/90 bg-white/80 px-4 py-4 text-center space-y-1">
                    <p className="text-xs font-medium text-slate-600">
                      No must-have screening criteria added yet.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Enter a complete qualification sentence above and press Enter, or paste bullet points from your job description.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-0.5">
                    {requiredSkills.map((criterion, idx) => {
                      const isLicense = isLicenseBadge(criterion);
                      const isEditing = editingReqIdx === idx;
                      return (
                        <div
                          key={idx}
                          className={`group flex items-start justify-between gap-2.5 rounded-xl border px-3 py-2.5 transition-all ${
                            isLicense
                              ? "bg-amber-50/70 border-amber-300/80"
                              : "bg-white border-slate-200/90 hover:border-[#2196F3]/40"
                          }`}
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span
                              className={`mt-0.5 h-5 min-w-[22px] px-1.5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                                isLicense
                                  ? "bg-amber-500/20 text-amber-800 border border-amber-400/40"
                                  : "bg-[#e3f1fe] text-[#1976D2]"
                              }`}
                            >
                              {String(idx + 1).padStart(2, "0")}
                            </span>

                            {isEditing ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <Input
                                  type="text"
                                  value={editingReqText}
                                  onChange={(e) => setEditingReqText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveEditingReq(idx);
                                    } else if (e.key === "Escape") {
                                      setEditingReqIdx(null);
                                      setEditingReqText("");
                                    }
                                  }}
                                  className="h-7 text-xs bg-white flex-1"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => saveEditingReq(idx)}
                                  className="h-7 px-2 text-[11px] font-semibold"
                                >
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingReqIdx(null);
                                    setEditingReqText("");
                                  }}
                                  className="h-7 px-2 text-[11px]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div
                                onClick={() => startEditingReq(idx, criterion)}
                                className="flex-1 min-w-0 cursor-pointer"
                                title="Click to edit qualification sentence"
                              >
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {isLicense && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 border border-amber-400/30">
                                      <ShieldCheck className="h-3 w-3 text-amber-700" />
                                      License / Credential
                                    </span>
                                  )}
                                  <p className="text-xs sm:text-[13px] font-medium text-slate-800 leading-relaxed break-words">
                                    {criterion}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditingReq(idx, criterion)}
                                title="Edit qualification sentence"
                                aria-label={`Edit ${criterion}`}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveReqToPref(criterion)}
                                title="Demote to Preferred Qualifications"
                                aria-label={`Move ${criterion} to preferred qualifications`}
                                className="p-1 rounded-md text-slate-400 hover:text-[#1976D2] hover:bg-blue-50 transition-colors"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeReqSkill(criterion)}
                                title="Remove qualification"
                                aria-label={`Remove ${criterion}`}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ================================================================
                  PREFERRED QUALIFICATIONS & BONUS ASSETS (SENTENCE CHECKLIST)
                 ================================================================ */}
              <div className="space-y-3 p-4 rounded-xl border border-slate-200/90 bg-slate-50/60">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="pref-skills-input" className="text-xs sm:text-sm font-bold text-slate-800">
                        Preferred Qualifications &amp; Bonus Certifications
                      </Label>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
                        {preferredSkills.length} {preferredSkills.length === 1 ? "item" : "items"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Optional nice-to-have competencies, specialized tools, or secondary certifications that award bonus merit points.
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-600 font-semibold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 self-start">
                    {rubricWeights.preferred_skills}% Bonus Pool
                  </span>
                </div>

                {/* Preferred Sentence Input Bar */}
                <div className="flex gap-2">
                  <Input
                    id="pref-skills-input"
                    type="text"
                    value={prefSkillInput}
                    onChange={(e) => setPrefSkillInput(e.target.value)}
                    onPaste={handlePrefPaste}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addPrefSkill();
                      }
                    }}
                    placeholder="e.g. Familiarity with Docker containerization and CI/CD pipelines, or BLS/ACLS certification"
                    className="text-xs h-9 bg-white"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addPrefSkill()}
                    disabled={!prefSkillInput.trim()}
                    className="shrink-0 h-9 text-xs font-semibold px-3.5 rounded-lg cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Bonus
                  </Button>
                </div>

                {preferredSkills.length === 0 ? (
                  <p className="text-xs text-slate-400 italic px-1">
                    No preferred qualifications specified (optional).
                  </p>
                ) : (
                  <div className="space-y-2 pt-0.5">
                    {preferredSkills.map((criterion, idx) => {
                      const isEditing = editingPrefIdx === idx;
                      return (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-2 transition-all hover:border-slate-300"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <span className="mt-0.5 h-5 min-w-[22px] px-1.5 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-mono font-bold shrink-0">
                              +{idx + 1}
                            </span>

                            {isEditing ? (
                              <div className="flex items-center gap-1.5 flex-1">
                                <Input
                                  type="text"
                                  value={editingPrefText}
                                  onChange={(e) => setEditingPrefText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveEditingPref(idx);
                                    } else if (e.key === "Escape") {
                                      setEditingPrefIdx(null);
                                      setEditingPrefText("");
                                    }
                                  }}
                                  className="h-7 text-xs bg-white flex-1"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => saveEditingPref(idx)}
                                  className="h-7 px-2 text-[11px] font-semibold"
                                >
                                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setEditingPrefIdx(null);
                                    setEditingPrefText("");
                                  }}
                                  className="h-7 px-2 text-[11px]"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <p
                                onClick={() => startEditingPref(idx, criterion)}
                                title="Click to edit preferred qualification"
                                className="text-xs sm:text-[13px] text-slate-700 leading-relaxed flex-1 min-w-0 break-words cursor-pointer"
                              >
                                {criterion}
                              </p>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditingPref(idx, criterion)}
                                title="Edit preferred qualification"
                                aria-label={`Edit ${criterion}`}
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => movePrefToReq(criterion)}
                                title="Promote to Must-Have Qualification"
                                aria-label={`Promote ${criterion} to must-have`}
                                className="p-1 rounded-md text-slate-400 hover:text-[#1976D2] hover:bg-blue-50 transition-colors"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removePrefSkill(criterion)}
                                title="Remove preferred qualification"
                                aria-label={`Remove ${criterion}`}
                                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================
              STEP 3: SCREENING CALIBRATION & REQUISITION REVIEW
             ======================================================== */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Screening Calibration Header */}
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <Label className="text-xs font-bold text-foreground">
                      Screening Rubric Dimension Weights
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tune how each qualification dimension is weighted during automated candidate evaluation (must total 100%).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Badge
                      variant={isWeightValid ? "outline" : "destructive"}
                      className={`text-[11px] font-bold py-0.5 px-2.5 ${
                        isWeightValid
                          ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                          : "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                      }`}
                    >
                      {isWeightValid
                        ? "100% (Balanced)"
                        : `${totalRubricWeight}% (${
                            totalRubricWeight > 100
                              ? `+${totalRubricWeight - 100}%`
                              : `-${100 - totalRubricWeight}%`
                          })`}
                    </Badge>
                    {!isWeightValid && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoBalance}
                        className="h-6 text-[10px] px-2 text-primary border-primary/30 hover:bg-primary/10 font-semibold"
                      >
                        Auto-Balance
                      </Button>
                    )}
                  </div>
                </div>

                {/* Visual Multi-Segment Distribution Bar */}
                <div className="space-y-1 pt-1">
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden flex shadow-inner">
                    <div
                      style={{ width: `${rubricWeights.required_skills}%` }}
                      className="bg-primary h-full transition-all duration-300"
                      title={`Must-Have Qualifications: ${rubricWeights.required_skills}%`}
                    />
                    <div
                      style={{ width: `${rubricWeights.experience}%` }}
                      className="bg-emerald-500 h-full transition-all duration-300"
                      title={`Experience: ${rubricWeights.experience}%`}
                    />
                    <div
                      style={{ width: `${rubricWeights.education}%` }}
                      className="bg-[#1976D2] h-full transition-all duration-300"
                      title={`Education & Licensure: ${rubricWeights.education}%`}
                    />
                    <div
                      style={{ width: `${rubricWeights.preferred_skills}%` }}
                      className="bg-amber-400 h-full transition-all duration-300"
                      title={`Preferred Qualifications: ${rubricWeights.preferred_skills}%`}
                    />
                    <div
                      style={{ width: `${rubricWeights.projects}%` }}
                      className="bg-sky-400 h-full transition-all duration-300"
                      title={`Projects & Duties: ${rubricWeights.projects}%`}
                    />
                  </div>
                  {!isWeightValid && (
                    <FieldError
                      message={
                        fieldErrors.rubricWeights ||
                        `Rubric weights currently total ${totalRubricWeight}%. Must equal 100% before publishing.`
                      }
                    />
                  )}
                </div>
              </div>

              {/* Direct Manual Weight Adjustment (5 cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                {/* 1. Required Skills */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between shadow-2xs hover:border-border/80 transition-all">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className="truncate">Must-Haves</span>
                      </div>
                      <span className="font-mono font-bold text-primary text-xs shrink-0">
                        {rubricWeights.required_skills}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Core criteria &amp; licenses
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label="Must-Have Qualifications weight percentage"
                      value={rubricWeights.required_skills}
                      onChange={(e) => updateWeight("required_skills", Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => adjustWeight("required_skills", -5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Reduce by 5%"
                        aria-label="Decrease required skills by 5%"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono text-muted-foreground">±5%</span>
                      <button
                        type="button"
                        onClick={() => adjustWeight("required_skills", 5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Increase by 5%"
                        aria-label="Increase required skills by 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Experience */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between shadow-2xs hover:border-border/80 transition-all">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="truncate">Experience</span>
                      </div>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                        {rubricWeights.experience}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Tenure cap &amp; fit
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label="Experience weight percentage"
                      value={rubricWeights.experience}
                      onChange={(e) => updateWeight("experience", Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => adjustWeight("experience", -5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Reduce by 5%"
                        aria-label="Decrease experience by 5%"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono text-muted-foreground">±5%</span>
                      <button
                        type="button"
                        onClick={() => adjustWeight("experience", 5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Increase by 5%"
                        aria-label="Increase experience by 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Education & Credentials */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between shadow-2xs hover:border-border/80 transition-all">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="h-2 w-2 rounded-full bg-[#1976D2] shrink-0" />
                        <span className="truncate">Education</span>
                      </div>
                      <span className="font-mono font-bold text-[#1976D2] text-xs shrink-0">
                        {rubricWeights.education}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Degree &amp; credentials
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label="Education weight percentage"
                      value={rubricWeights.education}
                      onChange={(e) => updateWeight("education", Number(e.target.value))}
                      className="w-full accent-[#1976D2] h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => adjustWeight("education", -5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Reduce by 5%"
                        aria-label="Decrease education by 5%"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono text-muted-foreground">±5%</span>
                      <button
                        type="button"
                        onClick={() => adjustWeight("education", 5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Increase by 5%"
                        aria-label="Increase education by 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Bonus Tools */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between shadow-2xs hover:border-border/80 transition-all">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">Preferred</span>
                      </div>
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs shrink-0">
                        {rubricWeights.preferred_skills}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Bonus qualifications
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label="Preferred qualifications weight percentage"
                      value={rubricWeights.preferred_skills}
                      onChange={(e) => updateWeight("preferred_skills", Number(e.target.value))}
                      className="w-full accent-amber-400 h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => adjustWeight("preferred_skills", -5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Reduce by 5%"
                        aria-label="Decrease bonus tools by 5%"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono text-muted-foreground">±5%</span>
                      <button
                        type="button"
                        onClick={() => adjustWeight("preferred_skills", 5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Increase by 5%"
                        aria-label="Increase bonus tools by 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* 5. Projects / Duties */}
                <div className="p-3 rounded-xl border border-border bg-card space-y-2 flex flex-col justify-between shadow-2xs hover:border-border/80 transition-all">
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-foreground">
                        <span className="h-2 w-2 rounded-full bg-sky-400 shrink-0" />
                        <span className="truncate">Projects</span>
                      </div>
                      <span className="font-mono font-bold text-sky-600 dark:text-sky-400 text-xs shrink-0">
                        {rubricWeights.projects}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">
                      Hands-on duties
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      aria-label="Projects and duties weight percentage"
                      value={rubricWeights.projects}
                      onChange={(e) => updateWeight("projects", Number(e.target.value))}
                      className="w-full accent-sky-400 h-1.5 cursor-pointer"
                    />
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => adjustWeight("projects", -5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Reduce by 5%"
                        aria-label="Decrease projects by 5%"
                      >
                        -
                      </button>
                      <span className="text-[10px] font-mono text-muted-foreground">±5%</span>
                      <button
                        type="button"
                        onClick={() => adjustWeight("projects", 5)}
                        className="h-7 w-7 rounded-md border border-border hover:bg-muted text-xs font-bold text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
                        title="Increase by 5%"
                        aria-label="Increase projects by 5%"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Posting State Selection */}
              <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                <Label htmlFor="posting-state" className="text-xs font-semibold">
                  Requisition Posting State
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div
                    onClick={() => setJobStatus("PUBLISHED")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      jobStatus === "PUBLISHED"
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <span>Publish Immediately (Live for Applicants)</span>
                    {jobStatus === "PUBLISHED" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>

                  <div
                    onClick={() => setJobStatus("DRAFT")}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      jobStatus === "DRAFT"
                        ? "border-primary bg-primary/5 text-primary font-semibold"
                        : "border-border text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <span>Save Requisition as Draft (Internal Only)</span>
                    {jobStatus === "DRAFT" && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                </div>
              </div>

              {/* Safeguards Notice Banner */}
              <div className="p-3 rounded-lg border border-border bg-muted/20 text-xs text-muted-foreground space-y-1">
                <div className="font-semibold text-foreground text-[11px]">
                  Automated Anti-Bias Screening Safeguards Active:
                </div>
                <p className="text-[11px] leading-relaxed">
                  Candidate resumes are parsed without photos, names, gender, or schools. Screening checks
                  hands-on sentence evidence in work history and applies tenure capping to prevent tenure inflation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (Fixed Sticky Bottom) */}
        <div className="p-4 px-6 border-t border-border bg-muted/10 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3) : 1))}
                className="gap-1.5 h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </Button>
            ) : (
              <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 text-xs">
                Cancel
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <Button
                type="button"
                size="sm"
                onClick={step === 1 ? handleProceedToStep2 : handleProceedToStep3}
                className="bg-[#2196F3] hover:bg-[#1976D2] text-white gap-1.5 font-semibold h-8.5 text-xs px-4 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={loading}
                className="bg-[#2196F3] hover:bg-[#1976D2] text-white gap-2 font-semibold h-9 text-xs px-5 rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
              >
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>
                  {jobStatus === "PUBLISHED" ? "Publish Job Benchmark" : "Save Requisition Draft"}
                </span>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
