import { describe, expect, it } from "vitest";
import { buildMedals } from "../../screens/app/medals";

const NOW = new Date("2026-07-13T12:00:00");
const iso = (daysAgo: number) => new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString();

describe("buildMedals", () => {
  it("earns 10-lb-down on the log that crossed the line, with its date", () => {
    const medals = buildMedals({
      doseLogs: [],
      weightLogs: [
        { value: 226, measuredAt: iso(30) },
        { value: 219, measuredAt: iso(15) },
        { value: 215.5, measuredAt: iso(6) }, // crosses -10 here (Jul 7)
        { value: 214, measuredAt: iso(1) },
      ],
      snapshotWeeks: [],
      photoDates: [],
      streak: { days: 0, longest: 0, passAvailable: true },
      now: NOW,
    });
    const ten = medals.find((m) => m.key === "ten-down");
    expect(ten).toMatchObject({ earned: true, sub: "Jul 7" });
  });

  it("locked medals carry exact progress", () => {
    const medals = buildMedals({
      doseLogs: [],
      weightLogs: [
        { value: 226, measuredAt: iso(10) },
        { value: 222, measuredAt: iso(1) },
      ],
      snapshotWeeks: [],
      photoDates: [iso(2), iso(9)],
      streak: { days: 5, longest: 5, passAvailable: true },
      now: NOW,
    });
    expect(medals.find((m) => m.key === "ten-down")).toMatchObject({ earned: false, sub: "4 of 10 lb" });
    expect(medals.find((m) => m.key === "steady-7")).toMatchObject({ earned: false, sub: "5 of 7 days" });
    expect(medals.find((m) => m.key === "photo-month")).toMatchObject({ earned: false, sub: "2 of 4 weeks" });
    // earned-first ordering: nothing earned here, ladder order preserved
    expect(medals[0].key).toBe("first-shot");
  });

  it("sorts earned medals to the front", () => {
    const medals = buildMedals({
      doseLogs: [{ recordedAt: iso(20) }],
      weightLogs: [],
      snapshotWeeks: [],
      photoDates: [],
      streak: { days: 8, longest: 8, passAvailable: true },
      now: NOW,
    });
    expect(medals[0]).toMatchObject({ key: "first-shot", earned: true });
    expect(medals[1]).toMatchObject({ key: "steady-7", earned: true, sub: "in the bag" });
  });
});
