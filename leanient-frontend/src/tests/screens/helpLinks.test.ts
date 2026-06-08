import { describe, expect, it } from "vitest";
import { coachHelpMailto, reportProblemMailto } from "../../screens/app/helpLinks";

describe("helpLinks", () => {
  it("sends coach help to the support inbox", () => {
    expect(coachHelpMailto()).toBe("mailto:support@leanient.app?subject=Help%20with%20Leanient");
  });

  it("sends problem reports to the developer inbox", () => {
    expect(reportProblemMailto()).toBe("mailto:dev@boltzman.ai?subject=Problem%20report");
  });
});
