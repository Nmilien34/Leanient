import { describe, expect, it } from "vitest";
import { coachHelpMailto, reportProblemMailto, suggestFeatureMailto } from "../../screens/app/helpLinks";

describe("helpLinks", () => {
  it("sends coach help to the developer inbox", () => {
    expect(coachHelpMailto()).toBe("mailto:dev@boltzman.ai?subject=Help%20with%20Leanient");
  });

  it("sends problem reports to the developer inbox", () => {
    expect(reportProblemMailto()).toBe("mailto:dev@boltzman.ai?subject=Problem%20report");
  });

  it("sends feature suggestions to the developer inbox", () => {
    expect(suggestFeatureMailto()).toBe(
      "mailto:dev@boltzman.ai?subject=Feature%20suggestion%20for%20Leanient",
    );
  });
});
