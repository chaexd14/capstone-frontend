export type ApplicationStatus =
  | "SUBMITTED"
  | "PROCESSING"
  | "UNDER_REVIEW"
  | "SHORTLISTED"
  | "INTERVIEW"
  | "REJECTED"
  | "HIRED";

export type ResumeProcessingStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

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

export interface AiInsights {
  summary?: string;
  strengths?: GroundedStrength[];
  gaps?: GroundedGap[];
  interview_focus?: string[];
  score_breakdown?: {
    required_skills?: number;
    experience?: number;
    education?: number;
    preferred_skills?: number;
    projects?: number;
  };
  fields_used?: string[];
  fields_excluded?: string[];
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
  redacted_data?: Record<string, any>;
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
