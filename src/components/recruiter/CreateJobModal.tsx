"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Sparkles,
  Loader2,
  Wand2,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowDown,
  ArrowUp,
  ShieldCheck,
  Scale,
  Briefcase,
  GraduationCap,
  Clock,
  MapPin,
  Info,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
  Sliders,
  Lightbulb,
} from "lucide-react";
import { Job, JobStatus } from "@/types/job";
import { fetchApi } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

const INDUSTRY_PRESETS = [
  {
    name: "🏥 Healthcare (RN)",
    title: "Registered Staff Nurse (RN)",
    department: "Healthcare & Medical",
    employmentType: "Full-time / Shifting",
    location: "Quezon City / Hospital On-site",
    description:
      "• Deliver compassionate, patient-centered direct clinical nursing care in accordance with healthcare standards.\n• Administer prescribed oral and IV medications, monitor fluid balances, and document patient progress.\n• Regularly measure, record, and interpret patient vital signs, alerting attending physicians to acute changes.\n• Coordinate with interdisciplinary healthcare teams to implement individualized nursing care plans.",
    minExp: "1-2 years clinical experience",
    education: "BS Nursing with active PRC Registered Nurse (RN) License",
    reqSkills: ["PRC Registered Nurse", "Patient Care", "IV Therapy", "Vital Signs Monitoring", "Medication Administration"],
    prefSkills: ["BLS/ACLS Certified", "ICU Care", "Triage", "Electronic Health Records (EHR)"],
    suggestedSkills: ["Wound Dressing", "Catheterization", "Infection Control", "Emergency Response", "Patient Charting"],
  },
  {
    name: "💼 Finance (CPA)",
    title: "Certified Public Accountant (CPA)",
    department: "Finance & Accounting",
    employmentType: "Full-time",
    location: "Makati / Hybrid",
    description:
      "• Perform general ledger reconciliations, monthly journal entries, and balance sheet variance analysis.\n• Oversee preparation and timely filing of BIR statutory tax returns (1601-C, 2550M/Q, 1702).\n• Prepare audit-ready financial statements in strict accordance with PFRS/IFRS accounting standards.\n• Coordinate external financial audit deliverables and maintain internal financial control documentation.",
    minExp: "2+ years accounting experience",
    education: "BS Accountancy with active PRC CPA License",
    reqSkills: ["PRC CPA", "Financial Reporting", "Tax Preparation", "General Ledger", "BIR Compliance"],
    prefSkills: ["QuickBooks", "SAP", "Auditing", "Xero", "Financial Modeling"],
    suggestedSkills: ["Bank Reconciliation", "Payroll Accounting", "Variance Analysis", "Cash Flow Forecasting", "Budgeting"],
  },
  {
    name: "🏗️ Engineering (Civil)",
    title: "Civil Site Project Engineer",
    department: "Engineering & Construction",
    employmentType: "Full-time",
    location: "Taguig (BGC) / Site-based",
    description:
      "• Supervise structural and architectural construction activities on-site to ensure compliance with engineering specifications.\n• Inspect materials, structural framing, concrete pouring, and subcontractor deliverables for QA/QC compliance.\n• Review and verify 2D/3D civil blueprints, shop drawings, and structural calculations in AutoCAD.\n• Track daily project progress, manage site safety guidelines, and coordinate structural milestone billing.",
    minExp: "2-3 years construction experience",
    education: "BS Civil Engineering with active PRC Civil Engineer License",
    reqSkills: ["PRC Civil Engineer", "AutoCAD", "Site Supervision", "Project Estimation", "QA/QC Inspection"],
    prefSkills: ["BOSH/COSH Certified", "STAAD Pro", "Revit", "MS Project"],
    suggestedSkills: ["Concrete Testing", "Structural Analysis", "Bar Bending Schedules", "Cost Estimation", "Safety Compliance"],
  },
  {
    name: "💻 Software Dev (Full Stack)",
    title: "Full Stack Software Developer",
    department: "Information Technology",
    employmentType: "Full-time",
    location: "Manila / Hybrid",
    description:
      "• Design, develop, and maintain performant backend REST APIs and microservices using Python and Django.\n• Build interactive, accessible web user interfaces with React, TypeScript, and modern CSS frameworks.\n• Optimize relational database schemas, write complex PostgreSQL queries, and implement Redis caching.\n• Participate in code reviews, continuous integration/continuous delivery (CI/CD) pipelines, and Docker containerization.",
    minExp: "2+ years web development experience",
    education: "BS Computer Science, Information Technology, or equivalent experience",
    reqSkills: ["Python", "Django", "PostgreSQL", "JavaScript", "React"],
    prefSkills: ["Docker", "Redis", "TypeScript", "Next.js", "AWS", "CI/CD"],
    suggestedSkills: ["REST API Design", "Git", "TailwindCSS", "Node.js", "Unit Testing", "Microservices Architecture"],
  },
  {
    name: "🎧 BPO Support",
    title: "Customer Support Specialist (BPO)",
    department: "BPO & Customer Operations",
    employmentType: "Full-time / Shifting",
    location: "Pasig (Ortigas) / Hybrid",
    description:
      "• Provide prompt, empathetic first-contact resolution for inbound customer inquiries via voice, email, and live chat.\n• Troubleshoot billing, account access, and service configuration issues using enterprise CRM software.\n• Maintain detailed documentation of customer interactions, bug reports, and escalation paths in Zendesk/Salesforce.\n• Consistently achieve team KPIs for Customer Satisfaction (CSAT), First Contact Resolution (FCR), and Average Handle Time (AHT).",
    minExp: "1+ year customer support experience",
    education: "College Graduate or Completed at least 2 years in College",
    reqSkills: ["Customer Service", "Inbound Voice Support", "English Fluency", "Troubleshooting", "Zendesk"],
    prefSkills: ["Salesforce", "Email Support", "Live Chat", "Conflict Resolution"],
    suggestedSkills: ["Ticket Escalation", "CRM", "Active Listening", "Call Center Operations", "Omnichannel Support"],
  },
  {
    name: "📈 Sales Executive",
    title: "B2B Sales Account Executive",
    department: "Sales & Business Development",
    employmentType: "Full-time",
    location: "Mandaluyong / Hybrid",
    description:
      "• Prospect, qualify, and close enterprise B2B sales leads across designated market verticals.\n• Deliver tailored executive product presentations, solution demonstrations, and commercial proposals.\n• Maintain active sales pipeline visibility and accurate deal forecasting in CRM software.\n• Negotiate service contracts, commercial terms, and enterprise master service agreements (MSAs).",
    minExp: "2+ years B2B sales experience",
    education: "BS Business Administration, Marketing, or related field",
    reqSkills: ["B2B Sales", "Lead Generation", "Pipeline Management", "Contract Negotiation", "CRM"],
    prefSkills: ["Salesforce", "Cold Calling", "Enterprise Sales", "Presentation Skills"],
    suggestedSkills: ["Account Management", "Key Stakeholder Pitching", "Market Research", "Objection Handling"],
  },
];

const SENIORITY_PRESETS = [
  { label: "Entry (0-1 yr)", value: "Fresh Graduate / 0-1 year" },
  { label: "Associate (1-2 yrs)", value: "1-2 years" },
  { label: "Mid-Level (2-4 yrs)", value: "2-4 years" },
  { label: "Senior (5-7 yrs)", value: "5+ years" },
  { label: "Lead / Principal (8+ yrs)", value: "8+ years" },
];

const EDUCATION_PRESETS = [
  { label: "Bachelor's Degree", value: "Bachelor's degree in related field or equivalent" },
  { label: "Master's / Postgrad", value: "Master's degree or higher in relevant specialization" },
  { label: "Vocational / TESDA", value: "TESDA NC II/III Certification or Technical Diploma" },
  { label: "Open / Practical", value: "College level or demonstrated practical portfolio" },
];

export function CreateJobModal({ isOpen, onClose, onJobCreated }: CreateJobModalProps) {
  // Form fields
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Information Technology");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [location, setLocation] = useState("Manila / Hybrid");
  const [description, setDescription] = useState("");
  const [minExp, setMinExp] = useState("2+ years");
  const [education, setEducation] = useState("BS Computer Science, Information Technology, or relevant degree");
  const [jobStatus, setJobStatus] = useState<JobStatus>("PUBLISHED");

  // Competency tags
  const [reqSkillInput, setReqSkillInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(["Python", "Django", "PostgreSQL"]);
  const [prefSkillInput, setPrefSkillInput] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>(["Docker", "React", "AWS"]);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([
    "TypeScript",
    "Redis",
    "CI/CD",
    "TailwindCSS",
    "REST API Design",
  ]);

  // Guidance and calibration UI state
  const [showPostingGuide, setShowPostingGuide] = useState(false);
  const [showCalibration, setShowCalibration] = useState(true);
  // Determine if role is regulated dynamically
  const isRegulated = (() => {
    const combined = `${title} ${department} ${description}`.toLowerCase();
    return [
      "nurse", "nursing", "physician", "doctor", "medical", "healthcare", "hospital",
      "pharmacist", "pharmacy", "accountant", "cpa", "civil engineer", "mechanical engineer",
      "electrical engineer", "attorney", "lawyer", "teacher", "lpt", "medical technologist", "architect"
    ].some((kw) => combined.includes(kw));
  })();

  // Section 13.11 Pre-flight Linter states
  const [lintFlags, setLintFlags] = useState<LintFlag[]>([]);
  const [isLinting, setIsLinting] = useState(false);
  const [cleanReplacementsAvailable, setCleanReplacementsAvailable] = useState(false);

  // Form submission
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section 13.11 Pre-flight Linting
  const runLintCheck = useCallback(async (descText: string, reqSkills: string[], eduText: string, roleTitle: string) => {
    if (!descText.trim()) {
      setLintFlags([]);
      setCleanReplacementsAvailable(false);
      return;
    }

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
        body: JSON.stringify({
          title: roleTitle,
          description: descText,
          required_skills: reqSkills,
          education_requirement: eduText,
        }),
      });

      setLintFlags(res.flags || []);
      setCleanReplacementsAvailable(res.has_replacements || false);
    } catch (e) {
      console.warn("Failed to run JD linter:", e);
    } finally {
      setIsLinting(false);
    }
  }, []);

  // Debounced auto-lint on change
  useEffect(() => {
    const timer = setTimeout(() => {
      runLintCheck(description, requiredSkills, education, title);
    }, 600);
    return () => clearTimeout(timer);
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
      }
    } catch (e) {
      console.warn("Failed to clean biased terms:", e);
    }
  };

  // Add mandatory PRC license if recommended by linter
  const handleAddMandatoryLicense = () => {
    let licenseTag = "PRC Professional License";
    const t = title.toLowerCase();
    if (t.includes("nurse")) licenseTag = "PRC Registered Nurse";
    else if (t.includes("accountant") || t.includes("cpa")) licenseTag = "PRC CPA";
    else if (t.includes("civil engineer")) licenseTag = "PRC Civil Engineer";
    else if (t.includes("mechanical engineer")) licenseTag = "PRC Mechanical Engineer";
    else if (t.includes("electrical engineer")) licenseTag = "PRC Electrical Engineer";
    else if (t.includes("teacher")) licenseTag = "PRC LPT (Licensed Professional Teacher)";
    else if (t.includes("pharmacist")) licenseTag = "PRC Pharmacist";
    else if (t.includes("physician") || t.includes("doctor")) licenseTag = "PRC Physician License";

    if (!requiredSkills.includes(licenseTag)) {
      setRequiredSkills([licenseTag, ...requiredSkills]);
    }
    setLintFlags((prev) => prev.filter((f) => f.category !== "missing_regulatory_license"));
  };

  const applyPreset = (preset: (typeof INDUSTRY_PRESETS)[0]) => {
    setTitle(preset.title);
    setDepartment(preset.department);
    setEmploymentType(preset.employmentType);
    setLocation(preset.location);
    setDescription(preset.description);
    setMinExp(preset.minExp);
    setEducation(preset.education);
    setRequiredSkills(preset.reqSkills);
    setPreferredSkills(preset.prefSkills);
    setSuggestedSkills(preset.suggestedSkills);
  };

  const addReqSkill = () => {
    const trimmed = reqSkillInput.trim();
    if (trimmed && !requiredSkills.includes(trimmed)) {
      setRequiredSkills([...requiredSkills, trimmed]);
      setReqSkillInput("");
      setSuggestedSkills(suggestedSkills.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()));
    }
  };

  const removeReqSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const moveReqToPref = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
    if (!preferredSkills.includes(skill)) {
      setPreferredSkills([...preferredSkills, skill]);
    }
  };

  const addPrefSkill = () => {
    const trimmed = prefSkillInput.trim();
    if (trimmed && !preferredSkills.includes(trimmed)) {
      setPreferredSkills([...preferredSkills, trimmed]);
      setPrefSkillInput("");
      setSuggestedSkills(suggestedSkills.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()));
    }
  };

  const removePrefSkill = (skill: string) => {
    setPreferredSkills(preferredSkills.filter((s) => s !== skill));
  };

  const movePrefToReq = (skill: string) => {
    setPreferredSkills(preferredSkills.filter((s) => s !== skill));
    if (!requiredSkills.includes(skill)) {
      setRequiredSkills([...requiredSkills, skill]);
    }
  };

  const addSuggestedSkill = (skill: string, toRequired: boolean = true) => {
    if (toRequired) {
      if (!requiredSkills.includes(skill)) setRequiredSkills([...requiredSkills, skill]);
    } else {
      if (!preferredSkills.includes(skill)) setPreferredSkills([...preferredSkills, skill]);
    }
    setSuggestedSkills(suggestedSkills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Job Title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Job Description & Responsibilities are required for AI screening.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        department: department.trim(),
        employment_type: employmentType,
        location,
        description,
        minimum_experience: minExp,
        education_requirement: education,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        status: jobStatus,
      };

      const newJob = await fetchApi<Job>("/jobs/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onJobCreated(newJob);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job profile");
    } finally {
      setLoading(false);
    }
  };

  const isLicenseBadge = (skillName: string) => {
    return /prc|cpa|registered\s+nurse|rn|lpt|license|certified|tesda|bosh|cosh|bls|acls/i.test(skillName);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onClose={onClose} className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
              <Sliders className="h-4 w-4" />
              <span>Job Calibration & Benchmark Studio</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isRegulated ? "default" : "secondary"} className="gap-1 text-xs">
                {isRegulated ? <ShieldCheck className="h-3.5 w-3.5 text-amber-300" /> : <Scale className="h-3.5 w-3.5" />}
                <span>{isRegulated ? "Regulated Professional Rubric" : "Technical & Operations Rubric"}</span>
              </Badge>
            </div>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold">Post a New Job Benchmark</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            Configure job specifications, required credentials, and rubric weights to drive transparent, bias-reduced AI resume screening.
          </DialogDescription>
        </DialogHeader>

        {/* Informative Posting Clarity Guide Banner */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Lightbulb className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Job Posting Best Practices for AI Screening</span>
            </div>
            <button
              type="button"
              onClick={() => setShowPostingGuide(!showPostingGuide)}
              className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>{showPostingGuide ? "Hide Guide" : "Read Clarity Tips"}</span>
              {showPostingGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            TalentMatch screens candidate resumes against this benchmark using objective duty matching and rubric weights, without school or demographic bias.
          </p>

          {showPostingGuide && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-[11px] border-t border-primary/10">
              <div className="p-2.5 rounded-lg bg-background border border-border space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                  <span>1. Duty-Oriented Duties</span>
                </div>
                <p className="text-muted-foreground leading-normal">
                  Write 3–5 bullet points with action verbs. The AI matches candidates&apos; actual work history against these operational tasks.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-border space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  <span>2. Must-Haves vs Bonus</span>
                </div>
                <p className="text-muted-foreground leading-normal">
                  Put critical skills &amp; state licenses in <strong>Required</strong>. Use <strong>Preferred</strong> for nice-to-have tools that only grant bonus points.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-background border border-border space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>3. Tenure Capping</span>
                </div>
                <p className="text-muted-foreground leading-normal">
                  Experience points cap at the minimum requirement, ensuring junior talent is not unfairly penalized by tenure inflation.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick-Start Role Templates */}
        <div className="p-3.5 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="text-xs font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              <span>Quick-Start Role Templates (Click to prefill and customize):</span>
            </span>
            <span className="text-[11px] text-muted-foreground font-normal">Pre-calibrated baseline specifications</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRY_PRESETS.map((preset, idx) => (
              <Button
                key={idx}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="h-7 text-xs px-2.5 font-medium hover:bg-secondary transition-all"
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Role Overview & Basic Details */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">
                  1
                </span>
                <span>Role Overview &amp; Position Details</span>
              </div>
              <span className="text-[11px] text-muted-foreground">General identification and posting state</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="job-title" className="text-xs font-semibold flex items-center gap-1">
                  <span>Job Title</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="job-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Registered Staff Nurse (RN), Full Stack Developer, CPA Auditor"
                  className="bg-background text-sm font-medium"
                />
                <p className="text-[11px] text-muted-foreground">Official job title displayed to applicants and mapped during resume screening.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-dept" className="text-xs font-semibold flex items-center gap-1">
                  <span>Department / Industry</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="job-dept"
                  type="text"
                  required
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Healthcare & Medical, Information Technology, Finance"
                  className="bg-background text-sm"
                />
                <p className="text-[11px] text-muted-foreground">Organizational department or functional field of the role.</p>
              </div>
            </div>

            {/* Workplace Details (3-columns) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="space-y-1.5">
                <Label htmlFor="job-type" className="text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Employment Type</span>
                </Label>
                <Input
                  id="job-type"
                  type="text"
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value)}
                  placeholder="Full-time / Shifting / Contract"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-loc" className="text-xs font-semibold flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Location &amp; Work Setup</span>
                </Label>
                <Input
                  id="job-loc"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Manila / Hybrid or Remote"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="job-status" className="text-xs font-semibold flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Posting Status</span>
                </Label>
                <select
                  id="job-status"
                  value={jobStatus}
                  onChange={(e) => setJobStatus(e.target.value as JobStatus)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="PUBLISHED">Published (Open for Applicants)</option>
                  <option value="DRAFT">Draft (Internal Calibration Only)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Operational Duties & Responsibilities (AI Match Ground Truth) */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">
                  2
                </span>
                <span>Operational Duties &amp; Responsibilities</span>
                <span className="text-destructive">*</span>
              </div>
              <div className="flex items-center gap-2">
                {isLinting && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Auditing JD...</span>
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

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/80 text-[11px] text-muted-foreground space-y-1">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Ground-Truth Semantic Matching Guide:</span>
              </div>
              <p className="leading-relaxed">
                List 3–5 bullet points detailing concrete daily operational responsibilities with active verbs (e.g. <em>&quot;Administer IV medications...&quot;</em>, <em>&quot;Design RESTful APIs...&quot;</em>, <em>&quot;Inspect structural blueprints...&quot;</em>). Avoid vague corporate buzzwords like &quot;rockstar&quot; or subjective personality traits. Candidate work experience is compared directly against these duties.
              </p>
            </div>

            <Textarea
              id="job-desc"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="• Responsibility 1 (e.g. Administer prescribed medications and monitor patient vitals...)&#10;• Responsibility 2 (e.g. Maintain accurate medical records and chart patient progress...)&#10;• Responsibility 3 (e.g. Coordinate with attending physicians and healthcare teams...)"
              className="text-xs leading-relaxed font-mono"
            />

            {/* Section 13.11 Linter Warning Banner */}
            {lintFlags.length > 0 && (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Compliance &amp; Anti-Bias Audit ({lintFlags.length} notice{lintFlags.length > 1 ? "s" : ""})</span>
                  </div>

                  {cleanReplacementsAvailable && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoCleanBias}
                      className="h-6 text-[11px] px-2 border-amber-500/40 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20"
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Auto-Clean Biased Terms
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
                          className="h-5 text-[10px] px-2 font-semibold shrink-0 bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100"
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

          {/* Section 3: Experience & Education Requirements */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">
                  3
                </span>
                <span>Qualification Benchmarks &amp; Credentials</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Used for capped tenure and degree checks</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Experience */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="job-exp" className="text-xs font-semibold flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Minimum Experience (Tenure Cap)</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">25% Rubric Weight</span>
                </div>
                <Input
                  id="job-exp"
                  type="text"
                  value={minExp}
                  onChange={(e) => setMinExp(e.target.value)}
                  placeholder="e.g. 2+ years"
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Experience credit caps at this threshold to eliminate age or tenure inflation.
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {SENIORITY_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setMinExp(p.value)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Education */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="job-edu" className="text-xs font-semibold flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Education &amp; Licensure Requirement</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">{isRegulated ? "25%" : "15%"} Rubric Weight</span>
                </div>
                <Input
                  id="job-edu"
                  type="text"
                  value={education}
                  onChange={(e) => setEducation(e.target.value)}
                  placeholder="e.g. BS Nursing with active PRC RN License"
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Evaluated strictly for degree and field fit, completely ignoring school name or prestige.
                </p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {EDUCATION_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setEducation(p.value)}
                      className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Competencies & Licensure Calibration */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-2">
              <div className="text-xs font-bold text-foreground flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">
                  4
                </span>
                <span>Competency &amp; Skills Calibration</span>
              </div>
              <span className="text-[11px] text-muted-foreground">Define Must-Have vs Bonus skills</span>
            </div>

            {/* Explanatory callout for skills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="p-2.5 rounded-lg border border-primary/30 bg-primary/5 space-y-0.5">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  <span>Required Competencies (Must-Haves)</span>
                </div>
                <p className="text-muted-foreground">
                  Carries <strong>{isRegulated ? "30%" : "40%"} of the score</strong>. Missing required items incurs deductions or caps scores at 60%. Regulated roles require valid PRC licenses.
                </p>
              </div>

              <div className="p-2.5 rounded-lg border border-border bg-muted/30 space-y-0.5">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Preferred Competencies (Bonus Pool)</span>
                </div>
                <p className="text-muted-foreground">
                  Carries <strong>10% bonus credit</strong>. Nice-to-have tools that reward candidates who have them, without penalizing candidates who lack them.
                </p>
              </div>
            </div>

            {/* Required Competencies Box */}
            <div className="space-y-2 p-3 rounded-lg border border-primary/20 bg-background">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5 text-primary" />
                  <span>Required Competencies &amp; Licenses ({requiredSkills.length})</span>
                </Label>
                <span className="text-[11px] text-primary font-semibold">{isRegulated ? "30%" : "40%"} Rubric Weight</span>
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={reqSkillInput}
                  onChange={(e) => setReqSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReqSkill())}
                  placeholder="Type mandatory skill or license (e.g. PRC Registered Nurse, Python, General Ledger) and press Enter"
                  className="text-xs h-8"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addReqSkill} className="shrink-0 h-8 text-xs font-medium">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 min-h-[32px]">
                {requiredSkills.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No required competencies added yet.</span>
                ) : (
                  requiredSkills.map((s, idx) => {
                    const isLicense = isLicenseBadge(s);
                    return (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className={`gap-1 px-2.5 py-1 text-xs transition-all ${
                          isLicense ? "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300 font-semibold" : ""
                        }`}
                      >
                        {isLicense && <ShieldCheck className="h-3 w-3 text-amber-500 shrink-0" />}
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => moveReqToPref(s)}
                          title="Demote to Preferred Bonus (10%)"
                          className="hover:text-primary text-muted-foreground transition-colors ml-1"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeReqSkill(s)}
                          title="Remove requirement"
                          className="hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })
                )}
              </div>
            </div>

            {/* Preferred Competencies Box */}
            <div className="space-y-2 p-3 rounded-lg border border-border bg-background">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                  <span>Preferred Competencies / Bonus Tools ({preferredSkills.length})</span>
                </Label>
                <span className="text-[11px] text-muted-foreground font-semibold">10% Bonus Pool</span>
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  value={prefSkillInput}
                  onChange={(e) => setPrefSkillInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPrefSkill())}
                  placeholder="Type bonus certification or tool (e.g. BLS/ACLS, Docker, QuickBooks) and press Enter"
                  className="text-xs h-8"
                />
                <Button type="button" variant="secondary" size="sm" onClick={addPrefSkill} className="shrink-0 h-8 text-xs font-medium">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 min-h-[32px]">
                {preferredSkills.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No preferred tools specified.</span>
                ) : (
                  preferredSkills.map((s, idx) => (
                    <Badge key={idx} variant="outline" className="gap-1 px-2.5 py-1 text-xs">
                      <span>{s}</span>
                      <button
                        type="button"
                        onClick={() => movePrefToReq(s)}
                        title="Promote to Required Must-Have"
                        className="hover:text-primary text-muted-foreground transition-colors ml-1"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePrefSkill(s)}
                        title="Remove tool"
                        className="hover:text-destructive text-muted-foreground transition-colors ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            </div>

            {/* Contextual Suggested Competency Chips */}
            {suggestedSkills.length > 0 && (
              <div className="p-3 rounded-lg border border-dashed border-border bg-muted/20 space-y-2">
                <div className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                  <span>Suggested Related Competencies (Click to add directly):</span>
                  <span className="text-[10px]">Contextually matched for {title || "this position"}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedSkills.map((skill, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center rounded-md border border-border bg-background text-[11px] overflow-hidden"
                    >
                      <span className="px-2 py-0.5 text-foreground font-medium">{skill}</span>
                      <button
                        type="button"
                        onClick={() => addSuggestedSkill(skill, true)}
                        title="Add to Required Competencies"
                        className="px-1.5 py-0.5 border-l border-border bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-[10px] font-bold"
                      >
                        + Req
                      </button>
                      <button
                        type="button"
                        onClick={() => addSuggestedSkill(skill, false)}
                        title="Add to Preferred Bonus Pool"
                        className="px-1.5 py-0.5 border-l border-border hover:bg-secondary text-muted-foreground transition-colors text-[10px]"
                      >
                        + Pref
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 5: AI Scoring Rubric & Anti-Bias Safeguards Preview */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowCalibration(!showCalibration)}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[11px] font-extrabold flex items-center justify-center">
                  5
                </span>
                <span className="text-xs font-bold text-foreground">Live AI Scoring Rubric &amp; Safeguards Breakdown</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold ml-1">
                  {isRegulated ? "Regulated Professional Preset" : "Technical & Operations Preset"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{showCalibration ? "Hide Breakdown" : "View Breakdown"}</span>
                {showCalibration ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {showCalibration && (
              <div className="p-3.5 pt-0 space-y-3 text-xs border-t border-border/50">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3">
                  <div className="p-2.5 rounded-lg border border-border bg-background text-center space-y-0.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Required Skills</div>
                    <div className="text-sm font-bold text-primary">{isRegulated ? "30%" : "40%"}</div>
                    <div className="text-[10px] text-muted-foreground">Must-have fit</div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-background text-center space-y-0.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Experience</div>
                    <div className="text-sm font-bold text-foreground">25%</div>
                    <div className="text-[10px] text-muted-foreground">Capped tenure</div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-background text-center space-y-0.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Education</div>
                    <div className="text-sm font-bold text-foreground">{isRegulated ? "25%" : "15%"}</div>
                    <div className="text-[10px] text-muted-foreground">Degree + license</div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-background text-center space-y-0.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Bonus Tools</div>
                    <div className="text-sm font-bold text-foreground">10%</div>
                    <div className="text-[10px] text-muted-foreground">Preferred fit</div>
                  </div>

                  <div className="p-2.5 rounded-lg border border-border bg-background text-center space-y-0.5 col-span-2 sm:col-span-1">
                    <div className="text-[10px] text-muted-foreground uppercase font-bold">Projects / Duties</div>
                    <div className="text-sm font-bold text-foreground">10%</div>
                    <div className="text-[10px] text-muted-foreground">Hands-on tasks</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-background border border-border space-y-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    <span>Automated Screening Safeguards Active:</span>
                  </div>
                  <ul className="space-y-1 text-muted-foreground pl-5 list-disc">
                    <li>
                      <strong>Blind Resume Evaluation:</strong> Applicant names, photos, gender, age, and home addresses are fully redacted prior to algorithmic screening.
                    </li>
                    <li>
                      <strong>Keyword Bluffing Protection:</strong> Skills pasted only in a skills list without hands-on sentence evidence in work history will be flagged and incur a 15% evidence penalty.
                    </li>
                    {isRegulated ? (
                      <li className="text-amber-700 dark:text-amber-300 font-medium">
                        <strong>Regulated Role Hard Gate:</strong> Candidates with an unrelated degree or zero matching must-have licenses will be gated strictly to 0.0% to protect licensed clinical/accounting practice.
                      </li>
                    ) : (
                      <li>
                        <strong>Tenure Capping:</strong> Experience points max out at {minExp}. Unrelated candidate work history receives 0 credit.
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 self-start sm:self-center">
              <span>Benchmark Status:</span>
              <Badge variant={jobStatus === "PUBLISHED" ? "default" : "secondary"} className="text-[10px]">
                {jobStatus === "PUBLISHED" ? "Live for Screening" : "Saved as Draft"}
              </Badge>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-9">
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading} className="gap-2 font-semibold h-9 px-4">
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>{jobStatus === "PUBLISHED" ? "Publish Job Benchmark" : "Save Requisition Draft"}</span>
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
