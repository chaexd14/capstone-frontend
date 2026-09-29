export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

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
  status: JobStatus;
  applicant_count?: number;
  created_at: string;
  updated_at: string;
}
