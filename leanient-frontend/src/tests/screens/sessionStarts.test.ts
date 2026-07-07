import { describe, expect, it } from "vitest";
import {
  dayKeyOf,
  pruneOldStarts,
  unfinishedStartFor,
  withSessionCompleted,
  withSessionProgress,
  withSessionStart,
  type SessionStartMap,
} from "../../screens/app/sessionStarts";

const NOW = new Date(2026, 6, 7, 15, 0, 0);
const TODAY = dayKeyOf(NOW);

describe("session start tracking", () => {
  it("records a start and surfaces it as unfinished", () => {
    const map = withSessionStart({}, "Upper body", NOW);
    expect(unfinishedStartFor(map, NOW)).toMatchObject({ workoutTitle: "Upper body", completed: false });
  });

  it("folds in elapsed time on close and keeps the max across restarts", () => {
    let map = withSessionStart({}, "Upper body", NOW);
    map = withSessionProgress(map, 300, NOW);
    map = withSessionStart(map, "Upper body", NOW); // reopened the player
    map = withSessionProgress(map, 120, NOW); // shorter second attempt
    expect(map[TODAY].elapsedSeconds).toBe(300);
  });

  it("stops reporting unfinished once completed", () => {
    let map = withSessionStart({}, "Upper body", NOW);
    map = withSessionCompleted(map, 900, NOW);
    expect(unfinishedStartFor(map, NOW)).toBeNull();
    expect(map[TODAY]).toMatchObject({ completed: true, elapsedSeconds: 900 });
  });

  it("ignores progress with no start and prunes old entries", () => {
    expect(withSessionProgress({}, 300, NOW)).toEqual({});
    const old: SessionStartMap = {
      "2026-06-01": { dateKey: "2026-06-01", workoutTitle: "Old", startedAt: "", elapsedSeconds: 60, completed: false },
      [TODAY]: { dateKey: TODAY, workoutTitle: "New", startedAt: "", elapsedSeconds: 60, completed: false },
    };
    const pruned = pruneOldStarts(old, NOW);
    expect(Object.keys(pruned)).toEqual([TODAY]);
  });
});
