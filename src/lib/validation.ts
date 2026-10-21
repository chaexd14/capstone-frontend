export interface PasswordRequirementItem {
  id: "length" | "uppercase" | "lowercase" | "numberOrSymbol";
  label: string;
  met: boolean;
}

export interface PasswordValidationResult {
  isValid: boolean;
  error: string | null;
  requirements: PasswordRequirementItem[];
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const NAME_REGEX = /^[\p{L}\s'.-]+$/u;
const PHONE_ALLOWED_CHARS_REGEX = /^[+\d\s().-]+$/;

export function validateEmail(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Email address is required. Enter your work or personal email.";
  }
  if (trimmed.length > 254 || !EMAIL_REGEX.test(trimmed)) {
    return "Enter a valid email address (for example, name@company.com).";
  }
  return null;
}

export function validateName(value: string, fieldLabel = "Name"): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${fieldLabel} is required.`;
  }
  if (trimmed.length < 2) {
    return `${fieldLabel} must be at least 2 characters long.`;
  }
  if (trimmed.length > 100) {
    return `${fieldLabel} cannot exceed 100 characters.`;
  }
  if (!NAME_REGEX.test(trimmed)) {
    return `${fieldLabel} can only contain letters, spaces, hyphens, and apostrophes.`;
  }
  return null;
}

export function validatePasswordLogin(value: string): string | null {
  if (!value) {
    return "Password is required to sign in.";
  }
  return null;
}

export function validatePasswordStrength(value: string): PasswordValidationResult {
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value);

  const requirements: PasswordRequirementItem[] = [
    { id: "length", label: "8+ characters", met: hasMinLength },
    { id: "uppercase", label: "1 uppercase letter", met: hasUppercase },
    { id: "lowercase", label: "1 lowercase letter", met: hasLowercase },
    { id: "numberOrSymbol", label: "1 number or symbol", met: hasNumberOrSymbol },
  ];

  if (!value) {
    return {
      isValid: false,
      error: "Password is required.",
      requirements,
    };
  }

  const missing: string[] = [];
  if (!hasMinLength) missing.push("at least 8 characters");
  if (!hasUppercase) missing.push("an uppercase letter");
  if (!hasLowercase) missing.push("a lowercase letter");
  if (!hasNumberOrSymbol) missing.push("a number or symbol");

  if (missing.length > 0) {
    return {
      isValid: false,
      error: `Password needs ${missing.join(", ")}.`,
      requirements,
    };
  }

  return {
    isValid: true,
    error: null,
    requirements,
  };
}

export function validatePasswordMatch(password: string, repeatPassword: string): string | null {
  if (!repeatPassword) {
    return "Please re-enter your password to confirm.";
  }
  if (password !== repeatPassword) {
    return "Passwords do not match. Re-enter the exact password above.";
  }
  return null;
}

export function validatePhone(value: string, required = true): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return required
      ? "Phone number is required (for example, +63 917 123 4567 or 0917 123 4567)."
      : null;
  }
  if (trimmed.length > 50) {
    return "Phone number cannot exceed 50 characters.";
  }
  if (!PHONE_ALLOWED_CHARS_REGEX.test(trimmed)) {
    return "Phone number can only contain digits, spaces, '+', '-', and parentheses.";
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return "Enter a valid phone number containing 7 to 15 digits (for example, +63 917 123 4567).";
  }
  return null;
}

export const ALLOWED_RESUME_EXTENSIONS = ["pdf", "docx", "txt"] as const;
export const MAX_RESUME_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export function validateResumeFile(file: File | null): string | null {
  if (!file) {
    return "Please attach your resume in .pdf, .docx, or .txt format to continue.";
  }
  if (file.size === 0) {
    return "The selected file is empty (0 bytes). Please upload a valid resume document.";
  }
  if (file.size > MAX_RESUME_SIZE_BYTES) {
    return "Resume file exceeds the 10MB limit. Please upload a smaller PDF, DOCX, or TXT file.";
  }
  const parts = file.name.split(".");
  const ext = parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
  if (ext === "doc") {
    return "Legacy binary .doc files are not supported. Please save your resume as .docx or .pdf and upload again.";
  }
  if (!ALLOWED_RESUME_EXTENSIONS.includes(ext as (typeof ALLOWED_RESUME_EXTENSIONS)[number])) {
    return "Unsupported file format. Only .pdf, .docx, and .txt files are accepted.";
  }
  return null;
}
