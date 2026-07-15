import React, { useEffect, useRef, useState } from "react";
import { Text as RNText, TextInput as RNTextInput } from "react-native";
import { useFonts } from "expo-font";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Render at the designed point sizes regardless of the device's text-scale setting,
// so the tuned card layouts don't inflate. (OS-level Display Zoom can't be overridden
// from here; this pins the Dynamic-Type font scaling the app honors by default.)
const textDefaults = RNText as unknown as { defaultProps?: { allowFontScaling?: boolean } };
textDefaults.defaultProps = { ...textDefaults.defaultProps, allowFontScaling: false };
const textInputDefaults = RNTextInput as unknown as { defaultProps?: { allowFontScaling?: boolean } };
textInputDefaults.defaultProps = { ...textInputDefaults.defaultProps, allowFontScaling: false };
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { LeanientDataProvider, useLeanientData } from "./src/context/LeanientDataContext";
import { OnboardingProvider } from "./src/context/OnboardingContext";
import { fontAssets } from "./src/theme/fonts";
import { SplashScreen } from "./src/screens/onboarding/SplashScreen";
import { SignInScreen } from "./src/screens/SignInScreen";
import { WelcomeScreen } from "./src/screens/onboarding/WelcomeScreen";
import { GlpScreen } from "./src/screens/onboarding/GlpScreen";
import { MedicationDetailsScreen } from "./src/screens/onboarding/MedicationDetailsScreen";
import { BelongingScreen } from "./src/screens/onboarding/BelongingScreen";
import { ShotDayScreen } from "./src/screens/onboarding/ShotDayScreen";
import { JourneyScreen } from "./src/screens/onboarding/JourneyScreen";
import { FearScreen } from "./src/screens/onboarding/FearScreen";
import { BasicsScreen } from "./src/screens/onboarding/BasicsScreen";
import { HeightWeightScreen } from "./src/screens/onboarding/HeightWeightScreen";
import { TrainingStatusScreen } from "./src/screens/onboarding/TrainingStatusScreen";
import { GoalWeightScreen } from "./src/screens/onboarding/GoalWeightScreen";
import { PaceScreen } from "./src/screens/onboarding/PaceScreen";
import { EnergyRealityScreen } from "./src/screens/onboarding/EnergyRealityScreen";
import { CraftingPlanScreen } from "./src/screens/onboarding/CraftingPlanScreen";
import { PlanReadyScreen } from "./src/screens/onboarding/PlanReadyScreen";
import { TruthScreen } from "./src/screens/onboarding/TruthScreen";
import { StepTransition } from "./src/components/onboarding/StepTransition";
import { PaywallScreen } from "./src/screens/onboarding/PaywallScreen";
import { RootApp } from "./src/navigation/RootApp";
import { isOnboardingCompleteForRouting } from "./src/navigation/onboardingRouting";

// Temporary onboarding step switcher until react-navigation is introduced.
// The conversation order and the progress bar both read from
// src/onboarding/flowProgress.ts, so the bar advances evenly per screen.
import type { OnboardingStep } from "./src/onboarding/flowProgress";

/**
 * Routing + lifecycle triggers. Lives INSIDE the providers so it can read auth
 * state and call the data context. Two responsibilities:
 *   1. Route between onboarding and the main app from real auth state.
 *   2. Fetch home data at the right lifecycle points (sign-in / cold start /
 *      onboarding completion) — see `useInitialHomeFetch` below.
 */
function AppContent() {
  const auth = useAuth();
  const { profile, isRefreshing, refreshHomeData } = useLeanientData();
  const [showSignIn, setShowSignIn] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("welcome");

  // Initial + sign-in fetch: load home data once per signed-in identity. Keying
  // on the user id means this fires exactly once when the user becomes known —
  // covering BOTH a cold start with a restored session and a fresh sign-in
  // (both set auth.user). The ref + the data context's own in-flight dedupe
  // guard against double-fetching.
  const userId = auth.user?.id;
  const userOnboarded = auth.user?.onboardingComplete;
  const fetchedForUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || fetchedForUserRef.current === userId) {
      return;
    }
    // A user mid-signup has no profile or logs yet; every home call would
    // 403/404 and poison homeError before onboarding even starts. Hold off
    // until the flag flips (the paywall submit updates the cached user, which
    // re-runs this effect), leaving the ref unset so the fetch fires then.
    if (userOnboarded === false) {
      return;
    }
    fetchedForUserRef.current = userId;
    void refreshHomeData();
  }, [userId, userOnboarded, refreshHomeData]);

  // Onboarding completion → refresh so the freshly-created profile loads, which
  // flips the router to the main app. (The user-id effect above already fired
  // at sign-in for the same id, so this explicit refresh is what re-fetches.)
  const handleOnboardingComplete = () => {
    void refreshHomeData();
  };

  // Branded splash doubles as the loading screen while the stored session
  // hydrates (no onDone → it just animates).
  if (auth.isLoading) {
    return <SplashScreen />;
  }

  // Signed out → splash intro, then the sign-in screen.
  if (!auth.isAuthenticated) {
    return showSignIn ? <SignInScreen /> : <SplashScreen onDone={() => setShowSignIn(true)} />;
  }

  const onboardingDone = isOnboardingCompleteForRouting({
    user: auth.user,
    hasProfile: Boolean(profile),
  });

  // Signed in: route on the real auth user onboarding flag, with profile
  // existence as a legacy fallback. While the first home fetch is in flight we
  // hold on the splash so a returning user is not flashed onboarding.
  if (!onboardingDone) {
    if (isRefreshing) {
      return <SplashScreen />;
    }
    // Keyed on the step so every conversation turn eases in (fade + rise)
    // instead of cutting.
    return <StepTransition key={step}>{renderOnboarding()}</StepTransition>;
  }

  return <RootApp />;

  // The conversation order (see flowProgress.ts): journey stage routes early so
  // "still considering" users skip the medication cluster AND the how-are-you-
  // feeling question (which assumes being on the med). Back links are static,
  // majority-path, matching the switcher's existing convention.
  function renderOnboarding() {
    switch (step) {
    case "welcome":
      return <WelcomeScreen onStart={() => setStep("journey")} />;
    case "journey":
      return <JourneyScreen onBack={() => setStep("welcome")} onAnswer={() => setStep("glp")} />;
    case "glp":
      return (
        <GlpScreen
          onBack={() => setStep("journey")}
          onAnswer={(hasMedication) => setStep(hasMedication ? "medicationDetails" : "fear")}
        />
      );
    case "medicationDetails":
      return <MedicationDetailsScreen onBack={() => setStep("glp")} onContinue={() => setStep("shotDay")} />;
    case "shotDay":
      return <ShotDayScreen onBack={() => setStep("medicationDetails")} onContinue={() => setStep("belonging")} />;
    case "belonging":
      return <BelongingScreen onBack={() => setStep("shotDay")} onContinue={() => setStep("energyReality")} />;
    case "energyReality":
      return <EnergyRealityScreen onBack={() => setStep("belonging")} onContinue={() => setStep("fear")} />;
    case "fear":
      return <FearScreen onBack={() => setStep("energyReality")} onAnswer={() => setStep("truth")} />;
    case "truth":
      return <TruthScreen onBack={() => setStep("fear")} onContinue={() => setStep("basics")} />;
    case "basics":
      return <BasicsScreen onBack={() => setStep("truth")} onContinue={() => setStep("heightWeight")} />;
    case "heightWeight":
      return <HeightWeightScreen onBack={() => setStep("basics")} onContinue={() => setStep("goalWeight")} />;
    case "goalWeight":
      return <GoalWeightScreen onBack={() => setStep("heightWeight")} onContinue={() => setStep("pace")} />;
    case "pace":
      return <PaceScreen onBack={() => setStep("goalWeight")} onContinue={() => setStep("trainingStatus")} />;
    case "trainingStatus":
      return <TrainingStatusScreen onBack={() => setStep("pace")} onAnswer={() => setStep("crafting")} />;
    case "crafting":
      return <CraftingPlanScreen onBack={() => setStep("trainingStatus")} onDone={() => setStep("planReady")} />;
    case "planReady":
      return <PlanReadyScreen onContinue={() => setStep("paywall")} />;
    case "paywall":
    default:
      return <PaywallScreen onComplete={handleOnboardingComplete} />;
    }
  }
}

export default function App() {
  const [fontsLoaded] = useFonts(fontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LeanientDataProvider>
          <OnboardingProvider>
            <AppContent />
          </OnboardingProvider>
        </LeanientDataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
