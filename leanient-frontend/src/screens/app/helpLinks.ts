import { REPORT_PROBLEM_EMAIL } from "../../config";

function mailto(email: string, subject: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}

export function coachHelpMailto(): string {
  return mailto(REPORT_PROBLEM_EMAIL, "Help with Leanient");
}

export function reportProblemMailto(): string {
  return mailto(REPORT_PROBLEM_EMAIL, "Problem report");
}

export function suggestFeatureMailto(): string {
  return mailto(REPORT_PROBLEM_EMAIL, "Feature suggestion for Leanient");
}
