import { REPORT_PROBLEM_EMAIL, SUPPORT_EMAIL } from "../../config";

function mailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function coachHelpMailto(): string {
  return mailto(SUPPORT_EMAIL, "Help with Leanient");
}

export function reportProblemMailto(): string {
  return mailto(REPORT_PROBLEM_EMAIL, "Problem report");
}
