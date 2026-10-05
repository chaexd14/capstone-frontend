export type ApplicationStatus =
  | "SUBMITTED"
  | "PROCESSING"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

export type ResumeProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export type MatchBand = "Strong" | "Good" | "Partial" | "Weak";
export type ReviewPriority = "High" | "Medium" | "Low";

export interface SkillEvidenceItem {
  skill: string;
  status: "met" | "unclear" | "not found" | string;
  evidence?: string;
  source?: string;
  note?: string;
}

export interface CandidateLogistics {
  notice_period?: string;
  work_arrangement?: string;
  location?: string;
  expected_salary?: string;
  shift_availability?: string;
}

export interface CandidatePinpoint {
  headline: string;
  evidence: string;
  impact_metric?: string;
  source?: string;
}

export interface MustHaveCheckItem {
  criterion: string;
  status: "MET" | "MISSING" | "PARTIAL" | string;
  evidence?: string;
}

export interface InterviewProbe {
  question: string;
  probe_reason?: string;
  target_signal?: string;
}

export interface GroundedStrength {
  skill: string;
  matched_requirement?: string;
  evidence: string;
  source?: string;
  confidence?: "high" | "medium" | "low" | string;
}

export interface GroundedGap {
  skill: string;
  type: "must_have" | "nice_to_have" | string;
  note: string;
}

export interface ReferenceScoreItem {
  component: string;
  description?: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface ReferenceScoreCalculation {
  preset_name: string;
  items: ReferenceScoreItem[];
  raw_score: number;
  penalty_multiplier: number;
  penalty_description?: string;
  final_match: number;
  final_band: string;
}

export interface AiInsights {
  band?: MatchBand | string;
  review_priority?: ReviewPriority | string;
  why_this_score?: string;
  penalty_note?: string;
  action_needed?: string | null;
  hard_requirement_status?: string;
  flags?: string[];
  must_haves_summary?: string;
  must_have_breakdown?: SkillEvidenceItem[];
  preferred_breakdown?: SkillEvidenceItem[];
  other_evidence?: string[];
  screening_questions?: string[];
  logistics?: CandidateLogistics;
  executive_headline?: string;
  fit_level?: "HIGH_ALIGNMENT" | "MODERATE_FIT" | "REQUIRES_REVIEW" | "GATED_MISSING_MUST_HAVE" | string;
  summary?: string;
  must_have_checklist?: MustHaveCheckItem[];
  key_pinpoints?: CandidatePinpoint[];
  strengths?: GroundedStrength[];
  gaps?: GroundedGap[];
  interview_guide?: InterviewProbe[];
  interview_focus?: string[];
  score_breakdown?: {
    required_skills?: number;
    experience?: number;
    education?: number;
    preferred_skills?: number;
    projects?: number;
  };
  reference_calculation?: ReferenceScoreCalculation;
  fields_used?: string[];
  fields_excluded?: string[];
  config_version?: string;
}

export interface MatchResult {
  id: number;
  match_score: number;
  skill_match_score: number;
  experience_match_score: number;
  education_match_score: number;
  semantic_match_score: number;
  preferred_skill_match_score?: number;
  project_match_score?: number;
  matched_skills: string[];
  missing_skills: string[];
  ai_insights?: AiInsights;
  explanation: string;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: number;
  application: number;
  file?: string;
  file_url: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  processing_status: ResumeProcessingStatus;
  extracted_text?: string;
  extracted_skills: string[];
  extracted_education: string[];
  extracted_experience_years?: number | null;
  redacted_text?: string;
  redacted_data?: Record<string, unknown>;
  uploaded_at: string;
  processed_at?: string | null;
}

export interface Application {
  id: number;
  job: number;
  job_title?: string;
  job_department?: string;
  job_location?: string;
  candidate_code: string;
  first_name: string;
  last_name: string;
  applicant_name: string;
  email: string;
  phone: string;
  notes?: string;
  status: ApplicationStatus;
  resume?: Resume;
  match_result?: MatchResult;
  applied_at: string;
  updated_at: string;
}
