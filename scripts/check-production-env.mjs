const required = [
  "NEXT_PUBLIC_API_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_ORGANIZATION_NAME",
  "NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL",
  "NEXT_PUBLIC_PRIVACY_POLICY_VERSION",
  "NEXT_PUBLIC_DATA_RETENTION_DAYS",
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing required production environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const retentionDays = Number(process.env.NEXT_PUBLIC_DATA_RETENTION_DAYS);
if (!Number.isInteger(retentionDays) || retentionDays <= 0) {
  console.error("NEXT_PUBLIC_DATA_RETENTION_DAYS must be a positive integer.");
  process.exit(1);
}

const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL;
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(privacyEmail)) {
  console.error("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL must be a valid monitored mailbox.");
  process.exit(1);
}

console.log("Production environment contract is complete.");
