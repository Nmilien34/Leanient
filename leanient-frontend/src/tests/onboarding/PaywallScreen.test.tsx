import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { __DEV__?: boolean }
).__DEV__ = false;

const mocks = vi.hoisted(() => ({
  onComplete: vi.fn(),
  purchasePlan: vi.fn(),
  submit: vi.fn(),
  updateCachedUser: vi.fn(),
}));

vi.mock("react-native", () => ({
  Animated: {
    Value: class {
      interpolate() {
        return 0;
      }
    },
    timing: vi.fn(() => ({ start: (cb?: () => void) => cb?.() })),
  },
  Easing: {
    cubic: "cubic",
    in: vi.fn((value) => value),
    out: vi.fn((value) => value),
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
  ScrollView: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("ScrollView", props, children),
  StyleSheet: {
    absoluteFill: {},
    absoluteFillObject: {},
    create: (styles: unknown) => styles,
  },
  Text: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("Text", props, children),
  TurboModuleRegistry: {
    get: vi.fn(() => null),
    getEnforcing: vi.fn(() => ({})),
  },
  View: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("View", props, children),
}));

vi.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("SafeAreaView", props, children),
}));

vi.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

vi.mock("expo-modules-core", () => ({
  EventEmitter: class {},
  requireNativeModule: vi.fn(() => ({})),
  requireOptionalNativeModule: vi.fn(() => ({})),
}));

vi.mock("expo-constants", () => ({
  default: {},
}));

vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("LinearGradient", props, children),
}));

vi.mock("expo-blur", () => ({
  BlurView: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("BlurView", props, children),
}));

vi.mock("react-native-svg", () => ({
  default: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("Svg", props, children),
  Path: "Path",
}));

vi.mock("../../components/layout/ScreenGround", () => ({
  ScreenGround: "ScreenGround",
}));

vi.mock("../../components/ui/Button", () => ({
  Button: ({
    disabled,
    label,
    loading,
    onPress,
    style,
  }: {
    disabled?: boolean;
    label: string;
    loading?: boolean;
    onPress?: () => void;
    style?: unknown;
  }) =>
    React.createElement(
      "Pressable",
      {
        accessibilityRole: "button",
        accessibilityLabel: label,
        disabled,
        loading,
        onPress,
        style,
      },
      label,
    ),
}));

vi.mock("../../components/app/SubscriptionLegal", () => ({
  SubscriptionLegal: () => React.createElement("Text", null, "Subscription legal"),
}));

vi.mock("../../components/YourPlanView", () => ({
  YourPlanView: ({ onContinue }: { onContinue: () => void }) =>
    React.createElement(
      "Pressable",
      { accessibilityRole: "button", accessibilityLabel: "Continue to your dashboard", onPress: onContinue },
      "Continue to your dashboard",
    ),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    updateCachedUser: mocks.updateCachedUser,
    user: { id: "user_1" },
  }),
}));

vi.mock("../../context/OnboardingContext", () => ({
  useOnboarding: () => ({
    draft: {},
    submit: mocks.submit,
  }),
}));

vi.mock("../../services/revenueCat.service", () => ({
  default: {
    purchasePlan: mocks.purchasePlan,
  },
}));

vi.mock("../../onboarding/planPreview", () => ({
  buildPlanPreview: () => ({
    dailyProteinLabel: "150g",
    workoutsLabel: "3",
    goalDateLabel: "Sep 1",
    muscleRetainedLabel: "82%",
  }),
}));

vi.mock("../../theme/fonts", () => ({
  font: {
    bold: "Bold",
    extrabold: "ExtraBold",
    light: "Light",
    medium: "Medium",
    regular: "Regular",
    semibold: "SemiBold",
  },
}));

const { PaywallScreen } = await import("../../screens/onboarding/PaywallScreen");

function allText(root: TestRenderer.ReactTestRenderer["root"]): string {
  return root
    .findAll((node) => (node.type as unknown) === "Text" || (node.type as unknown) === "Pressable")
    .flatMap((node) => node.children)
    .filter((child): child is string => typeof child === "string")
    .join("\n");
}

function button(root: TestRenderer.ReactTestRenderer["root"], label: string): ReactTestInstance {
  const match = root
    .findAll(
      (node) =>
        (node.type as unknown) === "Pressable" &&
        node.props.accessibilityRole === "button" &&
        node.props.accessibilityLabel === label,
    )
    .at(0);
  if (!match) throw new Error(`No button named "${label}"`);
  return match;
}

describe("PaywallScreen", () => {
  beforeEach(() => {
    mocks.onComplete.mockReset();
    mocks.purchasePlan.mockReset();
    mocks.submit.mockReset();
    mocks.updateCachedUser.mockReset();
  });

  it("renders a hard subscription paywall without close bypass, trial copy, or retention sheet", async () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<PaywallScreen onComplete={mocks.onComplete} />);
    });

    const copy = allText(tree!.root).toLowerCase();
    expect(button(tree!.root, "Subscribe")).toBeTruthy();
    expect(tree!.root.findAll((node) => node.props.accessibilityLabel === "Skip")).toHaveLength(0);
    expect(copy).not.toContain("free trial");
    expect(copy).not.toContain("7 days free");
    expect(copy).not.toContain("$0");
    expect(copy).not.toContain("not now");
    expect(copy).not.toContain("before you go");
  });

  it("keeps users on the paywall when the native purchase sheet is cancelled", async () => {
    mocks.purchasePlan.mockResolvedValueOnce({ status: "cancelled" });
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<PaywallScreen onComplete={mocks.onComplete} />);
    });

    await act(async () => {
      button(tree!.root, "Subscribe").props.onPress();
    });

    expect(mocks.purchasePlan).toHaveBeenCalledWith({ planId: "annual", appUserId: "user_1" });
    expect(mocks.submit).not.toHaveBeenCalled();
    expect(mocks.onComplete).not.toHaveBeenCalled();
    expect(allText(tree!.root)).not.toContain("$44.99");
  });
});
