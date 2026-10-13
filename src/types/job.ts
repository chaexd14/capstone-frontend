export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export interface RubricWeights {
  required_skills: number;
  experience: number;
  education: number;
  preferred_skills: number;
  projects: number;
}

export interface Job {
  id: number;
  company?: number;
  company_name?: string;
  title: string;
  department: string;
  description: string;
  employment_type: string;
  location: string;
  minimum_experience: string;
  education_requirement: string;
  required_skills: string[];
  preferred_skills: string[];
  rubric_weights?: RubricWeights;
  status: JobStatus;
  applicant_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ArchivedJob {
  id: number;
  company?: number;
  company_name?: string;
  title: string;
  department: string;
  description: string;
  employment_type: string;
  location: string;
  minimum_experience: string;
  education_requirement: string;
  required_skills: string[];
  preferred_skills: string[];
  rubric_weights?: RubricWeights;
  original_created_at?: string;
  archived_at: string;
}
