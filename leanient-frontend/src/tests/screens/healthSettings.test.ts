import { describe, expect, it } from "vitest";
import { defaultHealthSyncState, relativeSyncLabel } from "../../screens/app/healthSettings";

const now = new Date(2026, 5, 3, 12, 0, 0);
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

describe("relativeSyncLabel", () => {
  it("reads recent syncs as 'just now'", () => {
    expect(relativeSyncLabel(ago(10 * 1000), now)).toBe("just now");
  });

  it("counts minutes and hours, pluralizing correctly", () => {
    expect(relativeSyncLabel(ago(2 * 60 * 1000), now)).toBe("2 minutes ago");
    expect(relativeSyncLabel(ago(60 * 1000), now)).toBe("1 minute ago");
    expect(relativeSyncLabel(ago(3 * 60 * 60 * 1000), now)).toBe("3 hours ago");
  });

  it("rolls over to days", () => {
    expect(relativeSyncLabel(ago(2 * 24 * 60 * 60 * 1000), now)).toBe("2 days ago");
  });

  it("handles an invalid timestamp", () => {
    expect(relativeSyncLabel("nonsense", now)).toBe("not yet");
  });
});

describe("defaultHealthSyncState", () => {
  it("seeds weight/workouts/steps on and active energy/body fat off", () => {
    const s = defaultHealthSyncState();
    expect(s).toMatchObject({ weight: true, workouts: true, steps: true, active_energy: false, body_fat: false });
  });
});
