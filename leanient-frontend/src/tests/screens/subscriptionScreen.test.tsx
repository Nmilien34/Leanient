import React from "react";
import TestRenderer, { act, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  baseUser: {
    id: "user_1",
    emailVerified: true,
    onboardingComplete: true,
    authProviders: [],
    hasAvatar: false,
    subscriptionStatus: "free" as const,
    subscriptionWillRenew: false,
    entitlementExpiresAt: "2027-03-03T00:00:00.000Z",
    createdAt: "2026-05-29T12:00:00.000Z",
    updatedAt: "2026-05-29T12:00:00.000Z",
  },
  openURL: vi.fn(),
  purchasePlan: vi.fn(),
  restorePurchases: vi.fn(),
  syncSubscriptionStatus: vi.fn(),
  updateCachedUser: vi.fn(),
  refreshMe: vi.fn(),
  user: {
    id: "user_1",
    emailVerified: true,
    onboardingComplete: true,
    authProviders: [],
    hasAvatar: false,
    subscriptionStatus: "free" as const,
    subscriptionWillRenew: false,
    entitlementExpiresAt: "2027-03-03T00:00:00.000Z",
    createdAt: "2026-05-29T12:00:00.000Z",
    updatedAt: "2026-05-29T12:00:00.000Z",
  },
}));

vi.mock("react-native", () => ({
  Linking: {
    openURL: mocks.openURL,
  },
  Modal: ({ children, visible, ...props }: { children?: React.ReactNode; visible?: boolean }) =>
    visible ? React.createElement("Modal", props, children) : null,
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
  View: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("View", props, children),
}));

vi.mock("expo-status-bar", () => ({
  StatusBar: "StatusBar",
}));

vi.mock("expo-linear-gradient", () => ({
  LinearGradient: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("LinearGradient", props, children),
}));

vi.mock("react-native-svg", () => ({
  default: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("Svg", props, children),
  Path: "Path",
  Rect: "Rect",
}));

vi.mock("../../components/layout/ScreenGround", () => ({
  ScreenGround: "ScreenGround",
}));

vi.mock("../../components/layout/ModalSafeArea", () => ({
  ModalSafeArea: ({ children, ...props }: { children?: React.ReactNode }) =>
    React.createElement("ModalSafeArea", props, children),
}));

vi.mock("../../components/app/SettingsRow", () => ({
  SettingGroup: ({
    rows,
  }: {
    rows: Array<{
      key: string;
      label: string;
      value?: string;
      onPress?: () => void;
    }>;
  }) =>
    React.createElement(
      "View",
      null,
      rows.map((row) =>
        React.createElement(
          "Pressable",
          {
            key: row.key,
            accessibilityRole: "button",
            accessibilityLabel: row.label,
            onPress: row.onPress,
          },
          React.createElement("Text", null, row.label),
          row.value ? React.createElement("Text", null, row.value) : null,
        ),
      ),
    ),
}));

vi.mock("../../components/app/SubscriptionLegal", () => ({
  SubscriptionLegal: () => React.createElement("Text", null, "Subscription legal"),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    refreshMe: mocks.refreshMe,
    updateCachedUser: mocks.updateCachedUser,
    user: mocks.user,
  }),
}));

vi.mock("../../services/revenueCat.service", () => ({
  applyRevenueCatCustomerInfoToUser: (user: unknown) => user,
  hasActiveEntitlement: (customerInfo: { entitlements: { active: Record<string, { isActive?: boolean }> } }) =>
    Object.values(customerInfo.entitlements.active).some((entitlement) => entitlement.isActive),
  default: {
    purchasePlan: mocks.purchasePlan,
    restorePurchases: mocks.restorePurchases,
    syncSubscriptionStatus: mocks.syncSubscriptionStatus,
  },
}));

vi.mock("../../theme/fonts", () => ({
  font: {
    bold: "Bold",
    extrabold: "ExtraBold",
    medium: "Medium",
    regular: "Regular",
    semibold: "SemiBold",
  },
}));

const { APP_STORE_SUBSCRIPTIONS_URL, SubscriptionScreen } = await import("../../screens/app/SubscriptionScreen");

function allText(root: TestRenderer.ReactTestRenderer["root"]): string {
  return root
    .findAll((node) => (node.type as unknown) === "Text" || (node.type as unknown) === "Pressable")
    .flatMap((node) => node.children)
    .filter((child): child is string => typeof child === "string")
    .join("\n");
}

function occurrences(value: string, text: string): number {
  return text.split(value).length - 1;
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

describe("SubscriptionScreen", () => {
  beforeEach(() => {
    mocks.openURL.mockReset();
    mocks.purchasePlan.mockReset();
    mocks.restorePurchases.mockReset();
    mocks.syncSubscriptionStatus.mockReset();
    mocks.updateCachedUser.mockReset();
    mocks.refreshMe.mockReset();
    mocks.user = {
      ...mocks.baseUser,
      id: "user_1",
      subscriptionStatus: "free",
      subscriptionWillRenew: false,
    };
  });

  it("offers both annual and monthly plans from settings before purchase", async () => {
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<SubscriptionScreen visible onClose={() => undefined} />);
    });

    const copy = allText(tree!.root);
    expect(copy).toContain("Annual");
    expect(copy).toContain("$29.99 / yr");
    expect(copy).toContain("Monthly");
    expect(copy).toContain("$7.99 / mo");
  });

  it("updates the hero preview and purchase target when monthly is selected", async () => {
    mocks.purchasePlan.mockResolvedValueOnce({ status: "cancelled" });
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<SubscriptionScreen visible onClose={() => undefined} />);
    });

    expect(occurrences("$7.99 / mo", allText(tree!.root))).toBe(1);

    await act(async () => {
      button(tree!.root, "Monthly").props.onPress();
    });

    expect(occurrences("$7.99 / mo", allText(tree!.root))).toBe(2);

    await act(async () => {
      button(tree!.root, "Upgrade").props.onPress();
    });

    expect(mocks.purchasePlan).toHaveBeenCalledWith({ planId: "monthly", appUserId: "user_1" });
  });

  it("does not mark a settings purchase as updated until RevenueCat reports an active entitlement", async () => {
    mocks.purchasePlan.mockResolvedValueOnce({
      status: "purchased",
      customerInfo: {
        originalAppUserId: "user_1",
        entitlements: {
          active: {},
          all: {},
        },
      },
    });
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<SubscriptionScreen visible onClose={() => undefined} />);
    });
    await act(async () => {
      button(tree!.root, "Upgrade").props.onPress();
    });

    expect(mocks.updateCachedUser).not.toHaveBeenCalled();
    expect(mocks.refreshMe).not.toHaveBeenCalled();
    expect(allText(tree!.root)).toContain("Purchase is still syncing");
  });

  it("shows legacy trial accounts an upgrade path instead of billing management", async () => {
    mocks.user = {
      ...mocks.baseUser,
      id: "user_1",
      subscriptionStatus: "trialing",
      subscriptionWillRenew: false,
    };
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<SubscriptionScreen visible onClose={() => undefined} />);
    });

    const copy = allText(tree!.root);
    expect(copy).toContain("Upgrade");
    expect(copy).not.toContain("Manage plan");
    expect(copy).not.toContain("Manage in App Store");
  });

  it("opens Apple's subscription manager when RevenueCat does not return a management URL", async () => {
    mocks.user = {
      ...mocks.baseUser,
      id: "user_1",
      subscriptionStatus: "active",
      subscriptionWillRenew: true,
    };
    mocks.syncSubscriptionStatus.mockResolvedValueOnce({
      entitlements: { active: {}, all: {} },
      managementURL: null,
      originalAppUserId: "user_1",
    });
    let tree: TestRenderer.ReactTestRenderer | undefined;

    await act(async () => {
      tree = TestRenderer.create(<SubscriptionScreen visible onClose={() => undefined} />);
    });
    await act(async () => {
      button(tree!.root, "Manage in App Store").props.onPress();
    });

    expect(mocks.openURL).toHaveBeenCalledWith(APP_STORE_SUBSCRIPTIONS_URL);
  });
});
