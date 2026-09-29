"use client";

import React, { useState } from "react";
import { X, Plus, Sparkles, Loader2, Wand2 } from "lucide-react";
import { Job } from "@/types/job";
import { fetchApi } from "@/lib/api";

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (job: Job) => void;
}

const INDUSTRY_PRESETS = [
  {
    name: "🏥 Healthcare & Nursing",
    title: "Registered Staff Nurse (RN)",
    department: "Healthcare & Medical",
    employmentType: "Full-time / Shifting",
    location: "Quezon City / Hospital On-site",
    description: "Provide compassionate direct patient care, administer medications and IV therapy, monitor vitals, and assist attending physicians.",
    minExp: "1-2 years clinical experience",
    education: "BS Nursing with active PRC Registered Nurse (RN) License",
    reqSkills: ["PRC Registered Nurse", "Patient Care", "IV Therapy", "Vital Signs Monitoring", "Medication Administration"],
    prefSkills: ["BLS/ACLS Certified", "ICU Care", "Triage"],
  },
  {
    name: "💼 Finance & Accounting",
    title: "Certified Public Accountant (CPA)",
    department: "Finance & Accounting",
    employmentType: "Full-time",
    location: "Makati / Hybrid",
    description: "Handle financial statement audits, general ledger reconciliations, tax preparation, and BIR compliance.",
    minExp: "2+ years accounting experience",
    education: "BS Accountancy with active PRC CPA License",
    reqSkills: ["PRC CPA", "Financial Reporting", "Tax Preparation", "General Ledger", "QuickBooks"],
    prefSkills: ["SAP", "BIR Compliance", "Auditing"],
  },
  {
    name: "🎧 BPO & Customer Service",
    title: "Customer Support Specialist (BPO)",
    department: "BPO & Customer Support",
    employmentType: "Full-time / Night Shift",
    location: "Pasig (Ortigas) / Hybrid",
    description: "Deliver high-quality inbound customer support, handle customer resolutions, and document cases in CRM ticketing systems.",
    minExp: "1+ year BPO/Customer Support experience",
    education: "College Graduate or Completed at least 2 years in College",
    reqSkills: ["Customer Service", "Inbound Calls", "English Fluency", "Troubleshooting", "Zendesk"],
    prefSkills: ["Salesforce", "Email Support", "Chat Support"],
  },
  {
    name: "🏗️ Engineering & Construction",
    title: "Civil Site Project Engineer",
    department: "Engineering & Construction",
    employmentType: "Full-time",
    location: "Taguig (BGC) / Site",
    description: "Supervise construction site progress, inspect structural compliance, review AutoCAD plans, and manage subcontractor schedules.",
    minExp: "2-3 years construction experience",
    education: "BS Civil Engineering with PRC Civil Engineer License",
    reqSkills: ["PRC Civil Engineer", "AutoCAD", "Site Supervision", "Project Estimation", "QA/QC Inspection"],
    prefSkills: ["BOSH/COSH Safety Officer", "STAAD Pro", "Revit"],
  },
  {
    name: "📈 Sales & Marketing",
    title: "B2B Sales Account Executive",
    department: "Sales & Business Development",
    employmentType: "Full-time",
    location: "Mandaluyong / Hybrid",
    description: "Drive corporate revenue through B2B prospecting, client presentations, pipeline management, and contract negotiation.",
    minExp: "2+ years B2B Sales experience",
    education: "BS in Business Administration, Marketing or related field",
    reqSkills: ["B2B Sales", "Lead Generation", "Pipeline Management", "Negotiation", "CRM"],
    prefSkills: ["Cold Calling", "Salesforce", "Presentation Skills"],
  },
  {
    name: "💻 Information Technology",
    title: "Full Stack Software Developer",
    department: "Information Technology",
    employmentType: "Full-time",
    location: "Manila / Remote",
    description: "Design and implement scalable web applications, REST APIs, and modern responsive user interfaces.",
    minExp: "2+ years web development experience",
    education: "BS Computer Science, Information Technology, or relevant experience",
    reqSkills: ["Python", "Django", "PostgreSQL", "JavaScript", "React"],
    prefSkills: ["Docker", "Redis", "Next.js", "AWS"],
  },
];

export function CreateJobModal({ isOpen, onClose, onJobCreated }: CreateJobModalProps) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [location, setLocation] = useState("Manila / Hybrid");
  const [description, setDescription] = useState("");
  const [minExp, setMinExp] = useState("2+ years");
  const [education, setEducation] = useState("BS in Computer Science, IT or related field");
  const [reqSkillInput, setReqSkillInput] = useState("");
  const [requiredSkills, setRequiredSkills] = useState<string[]>(["Python", "Django", "PostgreSQL"]);
  const [prefSkillInput, setPrefSkillInput] = useState("");
  const [preferredSkills, setPreferredSkills] = useState<string[]>(["Docker", "React", "AWS"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const applyPreset = (preset: typeof INDUSTRY_PRESETS[0]) => {
    setTitle(preset.title);
    setDepartment(preset.department);
    setEmploymentType(preset.employmentType);
    setLocation(preset.location);
    setDescription(preset.description);
    setMinExp(preset.minExp);
    setEducation(preset.education);
    setRequiredSkills(preset.reqSkills);
    setPreferredSkills(preset.prefSkills);
  };

  const addReqSkill = () => {
    if (reqSkillInput.trim() && !requiredSkills.includes(reqSkillInput.trim())) {
      setRequiredSkills([...requiredSkills, reqSkillInput.trim()]);
      setReqSkillInput("");
    }
  };

  const removeReqSkill = (skill: string) => {
    setRequiredSkills(requiredSkills.filter((s) => s !== skill));
  };

  const addPrefSkill = () => {
    if (prefSkillInput.trim() && !preferredSkills.includes(prefSkillInput.trim())) {
      setPreferredSkills([...preferredSkills, prefSkillInput.trim()]);
      setPrefSkillInput("");
    }
  };

  const removePrefSkill = (skill: string) => {
    setPreferredSkills(preferredSkills.filter((s) => s !== skill));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload = {
        title,
        department,
        employment_type: employmentType,
        location,
        description,
        minimum_experience: minExp,
        education_requirement: education,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        status: "PUBLISHED",
      };

      const newJob = await fetchApi<Job>("/jobs/", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      onJobCreated(newJob);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Universal Job Studio
            </div>
            <h2 className="text-xl font-bold text-white mt-0.5">Post a New Position</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Create a job posting for any industry (Healthcare, Finance, BPO, Sales, Engineering, IT).
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1-Click Industry Presets */}
        <div className="mt-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
            <Wand2 className="h-3.5 w-3.5 text-indigo-400" />
            1-Click Multi-Industry Presets:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRY_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(preset)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600/30 hover:border-indigo-500/50 border border-slate-800 text-[11px] text-slate-300 transition"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Job Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Registered Staff Nurse / CPA Accountant"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Department / Field</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Employment Type</label>
              <input
                type="text"
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Job Description & Responsibilities *</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the duties, role expectations, and operational tasks..."
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Minimum Experience</label>
              <input
                type="text"
                value={minExp}
                onChange={(e) => setMinExp(e.target.value)}
                placeholder="e.g. 2+ years"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Education & Licensure Requirement</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. BS Nursing with active PRC RN License"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          {/* Required Skills & Competencies */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Required Competencies & Licenses (evaluated dynamically by AI)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={reqSkillInput}
                onChange={(e) => setReqSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addReqSkill())}
                placeholder="Add required skill or license (e.g. PRC RN, IV Therapy, QuickBooks)"
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={addReqSkill}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requiredSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs flex items-center gap-1.5"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeReqSkill(s)}
                    className="hover:text-rose-400 text-indigo-400/70"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Preferred Competencies */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Preferred Competencies / Certifications</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={prefSkillInput}
                onChange={(e) => setPrefSkillInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPrefSkill())}
                placeholder="Add bonus certification or tool (e.g. BLS/ACLS, SAP, Salesforce)"
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              <button
                type="button"
                onClick={addPrefSkill}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {preferredSkills.map((s, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs flex items-center gap-1.5"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removePrefSkill(s)}
                    className="hover:text-rose-400 text-slate-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Publish Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
