import { Application, ApplicationStatus } from "@/types/application";

const IDENTITY_REVEAL_STATUSES = new Set<ApplicationStatus>(["SHORTLISTED", "INTERVIEW", "HIRED"]);

export function getCandidateDisplayName(application: Application, anonymize: boolean) {
  const mayRevealIdentity = !anonymize || IDENTITY_REVEAL_STATUSES.has(application.status);
  return mayRevealIdentity && application.applicant_name?.trim()
    ? application.applicant_name
    : application.candidate_code;
}
