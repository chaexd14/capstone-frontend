export const legalConfig = {
  organizationName:
    process.env.NEXT_PUBLIC_ORGANIZATION_NAME || "TalentMatch",
  privacyContactEmail:
    process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL || "privacy@talentmatch.ph",
  policyVersion:
    process.env.NEXT_PUBLIC_PRIVACY_POLICY_VERSION || "Draft",
  retentionDays:
    process.env.NEXT_PUBLIC_DATA_RETENTION_DAYS || "not yet configured",
};
