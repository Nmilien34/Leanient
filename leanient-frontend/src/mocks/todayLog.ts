import type { TodayLog } from "../screens/app/todayMetrics";

/**
 * TEST-ONLY fixture for the Home "Today" derive functions (todayMetrics /
 * todayPlanMetrics unit tests). Not used in app code: the screen builds a real
 * TodayLog from `todaysMeals` via `toTodayLog()`.
 */
export const mockTodayLog: TodayLog = {
  meals: [
    { name: "Greek yogurt + berries", grams: 32, timeLabel: "8:10a" },
    { name: "Chicken & rice bowl", grams: 26, timeLabel: "1:05p" },
  ],
  workoutsDone: 0,
};
