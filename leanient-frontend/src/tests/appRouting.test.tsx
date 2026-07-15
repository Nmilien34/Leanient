import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { __DEV__?: boolean }
).__DEV__ = false;

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; onboardingComplete: boolean } | null;
};

const harness = vi.hoisted(() => ({
  auth: {
    isAuthenticated: true,
    isLoading: false,
    user: { id: "user_1", onboardingComplete: false },
  } as AuthState,
  refreshHomeData: vi.fn(),
  resetOnboardingDraft: vi.fn(),
}));

function MockButtonScreen({
  label,
  onPress,
}: {
  label: string;
  onPress?: (...args: never[]) => void;
}) {
  return React.createElement(
    "Pressable",
    { accessibilityRole: "button", accessibilityLabel: label, onPress },
    label,
  );
}

vi.mock("react-native", () => ({
  AppState: {
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
  Platform: {
    OS: "ios",
  },
  Pressable: ({
    children,
    ...props
  }: {
    children?: React.ReactNode | ((state: { pressed: boolean }) => React.ReactNode);
  }) =>
    React.createElement(
      "Pressable",
      props,
      typeof children === "function" ? children({ pressed: false }) : children,
    ),
  Text: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("Text", props, children),
  TextInput: (props: Record<string, unknown>) => React.createElement("TextInput", props),
  TurboModuleRegistry: {
    get: vi.fn(() => null),
    getEnforcing: vi.fn(() => ({})),
  },
  View: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("View", props, children),
}));

vi.mock("expo-font", () => ({
  useFonts: () => [true],
}));

vi.mock("expo-modules-core", () => ({
  EventEmitter: class {},
  requireNativeModule: vi.fn(() => ({})),
  requireOptionalNativeModule: vi.fn(() => ({})),
}));

vi.mock("../theme/fonts", () => ({
  fontAssets: {},
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement("SafeAreaProvider", null, children),
}));

vi.mock("../context/AuthContext", () => ({
  AuthProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useAuth: () => harness.auth,
}));

vi.mock("../context/LeanientDataContext", () => ({
  LeanientDataProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useLeanientData: () => ({
    profile: null,
    isRefreshing: false,
    refreshHomeData: harness.refreshHomeData,
  }),
}));

vi.mock("../context/OnboardingContext", () => ({
  OnboardingProvider: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  useOnboarding: () => ({
    reset: harness.resetOnboardingDraft,
  }),
}));

vi.mock("../components/onboarding/StepTransition", () => ({
  StepTransition: ({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}));

vi.mock("../screens/onboarding/SplashScreen", () => ({
  SplashScreen: ({ onDone }: { onDone?: () => void }) =>
    MockButtonScreen({ label: "Splash", onPress: onDone }),
}));

vi.mock("../screens/SignInScreen", () => ({
  SignInScreen: () => MockButtonScreen({ label: "Sign in" }),
}));

vi.mock("../navigation/RootApp", () => ({
  RootApp: () => MockButtonScreen({ label: "Root app" }),
}));

vi.mock("../screens/onboarding/WelcomeScreen", () => ({
  WelcomeScreen: ({ onStart }: { onStart: () => void }) =>
    MockButtonScreen({ label: "Welcome", onPress: onStart }),
}));

vi.mock("../screens/onboarding/JourneyScreen", () => ({
  JourneyScreen: ({ onAnswer }: { onAnswer: () => void }) =>
    MockButtonScreen({ label: "Journey", onPress: onAnswer }),
}));

vi.mock("../screens/onboarding/GlpScreen", () => ({
  GlpScreen: ({ onAnswer }: { onAnswer: (hasMedication: boolean) => void }) =>
    MockButtonScreen({ label: "GLP", onPress: () => onAnswer(true) }),
}));

vi.mock("../screens/onboarding/MedicationDetailsScreen", () => ({
  MedicationDetailsScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Medication details", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/ShotDayScreen", () => ({
  ShotDayScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Shot day", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/BelongingScreen", () => ({
  BelongingScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Belonging", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/EnergyRealityScreen", () => ({
  EnergyRealityScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Energy reality", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/FearScreen", () => ({
  FearScreen: ({ onAnswer }: { onAnswer: () => void }) =>
    MockButtonScreen({ label: "Fear", onPress: onAnswer }),
}));

vi.mock("../screens/onboarding/TruthScreen", () => ({
  TruthScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Truth", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/BasicsScreen", () => ({
  BasicsScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Basics", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/HeightWeightScreen", () => ({
  HeightWeightScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Height weight", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/GoalWeightScreen", () => ({
  GoalWeightScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Goal weight", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/PaceScreen", () => ({
  PaceScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Pace", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/TrainingStatusScreen", () => ({
  TrainingStatusScreen: ({ onAnswer }: { onAnswer: () => void }) =>
    MockButtonScreen({ label: "Training status", onPress: onAnswer }),
}));

vi.mock("../screens/onboarding/CraftingPlanScreen", () => ({
  CraftingPlanScreen: ({ onDone }: { onDone: () => void }) =>
    MockButtonScreen({ label: "Crafting", onPress: onDone }),
}));

vi.mock("../screens/onboarding/PlanReadyScreen", () => ({
  PlanReadyScreen: ({ onContinue }: { onContinue: () => void }) =>
    MockButtonScreen({ label: "Plan ready", onPress: onContinue }),
}));

vi.mock("../screens/onboarding/PaywallScreen", () => ({
  PaywallScreen: () => MockButtonScreen({ label: "Paywall" }),
}));

const App = (await import("../../App")).default;

function button(root: TestRenderer.ReactTestRenderer["root"], label: string): ReactTestInstance {
  const match = root
    .findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityRole === "button" &&
        node.props.accessibilityLabel === label,
    )
    .at(0);
  if (!match) {
    const labels = root
      .findAll((node) => (node.type as unknown) === "Pressable")
      .map((node) => node.props.accessibilityLabel)
      .filter(Boolean)
      .join(", ");
    throw new Error(`No button named "${label}". Found: ${labels}`);
  }
  return match;
}

async function tap(root: TestRenderer.ReactTestRenderer["root"], label: string): Promise<void> {
  await act(async () => {
    button(root, label).props.onPress?.();
  });
}

describe("App routing", () => {
  beforeEach(() => {
    harness.auth = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "user_1", onboardingComplete: false },
    };
    harness.refreshHomeData.mockReset();
    harness.resetOnboardingDraft.mockReset();
  });

  it("starts a fresh onboarding flow after logout instead of reusing the previous paywall step", async () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<App />);
    });

    for (const label of [
      "Welcome",
      "Journey",
      "GLP",
      "Medication details",
      "Shot day",
      "Belonging",
      "Energy reality",
      "Fear",
      "Truth",
      "Basics",
      "Height weight",
      "Goal weight",
      "Pace",
      "Training status",
      "Crafting",
      "Plan ready",
    ]) {
      await tap(tree!.root, label);
    }

    expect(button(tree!.root, "Paywall")).toBeTruthy();

    harness.auth = {
      isAuthenticated: false,
      isLoading: false,
      user: null,
    };
    await act(async () => {
      tree!.update(<App />);
    });

    harness.auth = {
      isAuthenticated: true,
      isLoading: false,
      user: { id: "user_2", onboardingComplete: false },
    };
    await act(async () => {
      tree!.update(<App />);
    });

    expect(button(tree!.root, "Welcome")).toBeTruthy();
    expect(tree!.root.findAll((node) => node.props.accessibilityLabel === "Paywall")).toHaveLength(0);
    expect(harness.resetOnboardingDraft).toHaveBeenCalled();
  });
});
