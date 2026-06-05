import { vi } from "vitest";
import { testStorage } from "./testStorage";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: testStorage,
}));

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Platform: {
    OS: "ios",
  },
}));
