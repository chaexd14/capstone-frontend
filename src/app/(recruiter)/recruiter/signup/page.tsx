import { redirect } from "next/navigation";

export default function RecruiterSignupPage() {
  redirect("/recruiter/login?error=signup_disabled");
}
