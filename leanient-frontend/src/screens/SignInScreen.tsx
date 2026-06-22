import React, { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";
import { SplashArt } from "../components/brand/SplashArt";
import { useAuth } from "../context/AuthContext";
import { extractApiError } from "../services/apiError";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "../config";
import { colors } from "../theme/tokens";
import { font } from "../theme/fonts";
import { runAppleSignIn, shouldRenderAppleSignIn } from "./appleSignIn";

// Configure native Google Sign-In once. webClientId is REQUIRED — it's the
// audience the backend's /auth/google validation expects on the idToken, so it
// must match GOOGLE_CLIENT_ID in the backend env.
GoogleSignin.configure({
  iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
  webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
  offlineAccess: false,
  scopes: ["profile", "email"],
});

const GOOGLE_CONFIGURED = Boolean(GOOGLE_WEB_CLIENT_ID);

function GoogleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path fill="#4285F4" d="M21 12.2c0-.6-.1-1.2-.2-1.7H12v3.4h5.1c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.9-4.1 2.9-7Z" />
      <Path fill="#34A853" d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.5C5.4 19.1 8.5 21 12 21Z" />
      <Path fill="#FBBC05" d="M7.1 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.8H3.9C3.3 9.1 3 10.5 3 12s.3 2.9.9 4.2l3.2-2.5Z" />
      <Path fill="#EA4335" d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 3.9 14.4 3 12 3 8.5 3 5.4 4.9 3.9 7.8l3.2 2.5C7.8 8.1 9.7 6.6 12 6.6Z" />
    </Svg>
  );
}

function AppleMark() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="#fff">
      <Path d="M16 13c0 3 2.6 4 2.6 4s-1.8 3-3.3 3c-1 0-1.6-.7-2.9-.7s-1.9.7-2.9.7C7.8 20 5 16.4 5 13c0-3.6 2.4-5 4.3-5 1.2 0 2.2.8 3 .8.7 0 1.9-.9 3.3-.8 1.6.1 2.6.9 3.2 1.8-2.8 1.6-2.8 4.6-.8 5.4M14 6.5c.7-.9 1.1-2 1-3.2-1.1.1-2.3.7-3 1.5-.6.7-1.2 1.8-1 2.9 1.2.1 2.3-.5 3-1.2Z" />
    </Svg>
  );
}

/**
 * Sign-in entry. Shown to signed-out users after the splash. Google runs the
 * native Google Sign-In flow (@react-native-google-signin) → idToken →
 * `auth.signInWithGoogle`, which populates `auth.user`; the app router
 * (App.tsx) then routes to onboarding or the main app. Apple follows the same
 * auth context path after the native iOS sheet returns an identity token.
 */
export function SignInScreen() {
  const auth = useAuth();
  const [busyProvider, setBusyProvider] = useState<"google" | "apple" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [reviewerEmail, setReviewerEmail] = useState("review@leanient.app");
  const [reviewerPassword, setReviewerPassword] = useState("");
  const busy = busyProvider !== null;
  const showAppleSignIn = shouldRenderAppleSignIn(Platform.OS);

  const onReviewer = async () => {
    setError(null);
    setBusyProvider("demo");
    try {
      await auth.signInWithDemo(reviewerEmail.trim(), reviewerPassword);
      setReviewerOpen(false);
    } catch (e) {
      setError(extractApiError(e).message);
    } finally {
      setBusyProvider(null);
    }
  };

  const onGoogle = async () => {
    setError(null);
    if (!GOOGLE_CONFIGURED) {
      setError("Google sign-in isn't configured yet.");
      return;
    }
    setBusyProvider("google");
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== "success") {
        return; // user backed out, silent, no error UI
      }
      const idToken = response.data.idToken;
      if (!idToken) {
        throw new Error("No idToken returned from Google Sign-In");
      }
      await auth.signInWithGoogle(idToken);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === statusCodes.SIGN_IN_CANCELLED) {
        return; // cancelled, silent
      }
      if (code === statusCodes.IN_PROGRESS) {
        setError("Sign-in is already in progress.");
        return;
      }
      if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setError("Google Play Services isn't available.");
        return;
      }
      setError(extractApiError(e).message);
    } finally {
      setBusyProvider(null);
    }
  };

  const onApple = async () => {
    setError(null);
    setBusyProvider("apple");
    try {
      await runAppleSignIn({
        appleAuth: AppleAuthentication,
        signInWithApple: auth.signInWithApple,
      });
    } catch (e) {
      setError(extractApiError(e).message);
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <LinearGradient
        colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
        locations={[0, 0.56, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.hero}>
          <SplashArt />
          <Text style={styles.word}>Leanient</Text>
          <Text style={styles.tag}>Lose the fat. Keep yourself intact.</Text>
        </View>

        <View style={styles.actions}>
          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            onPress={onGoogle}
            disabled={busy}
            style={({ pressed }) => [styles.btn, styles.google, (pressed || busy) && styles.pressed]}
          >
            {busyProvider === "google" ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <>
                <GoogleMark />
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          {showAppleSignIn ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              onPress={onApple}
              disabled={busy}
              style={({ pressed }) => [styles.btn, styles.apple, (pressed || busy) && styles.pressed]}
            >
              {busyProvider === "apple" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <AppleMark />
                  <Text style={styles.appleText}>Continue with Apple</Text>
                </>
              )}
            </Pressable>
          ) : null}

          <Text style={styles.legal}>By continuing you agree to our Terms and Privacy Policy.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reviewer sign-in"
            onPress={() => {
              setError(null);
              setReviewerOpen(true);
            }}
            disabled={busy}
            hitSlop={8}
          >
            <Text style={styles.reviewerLink}>Reviewer sign-in</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={reviewerOpen} transparent animationType="fade" onRequestClose={() => setReviewerOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalRoot}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReviewerOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reviewer sign-in</Text>
            <Text style={styles.sheetHint}>For App Store review. Enter the demo credentials provided in App Review Information.</Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TextInput
              style={styles.input}
              value={reviewerEmail}
              onChangeText={setReviewerEmail}
              placeholder="Email"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              value={reviewerPassword}
              onChangeText={setReviewerPassword}
              placeholder="Password"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              editable={!busy}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in"
              onPress={onReviewer}
              disabled={busy || !reviewerPassword}
              style={({ pressed }) => [styles.sheetBtn, (pressed || busy || !reviewerPassword) && styles.pressed]}
            >
              {busyProvider === "demo" ? <ActivityIndicator color="#fff" /> : <Text style={styles.sheetBtnText}>Sign in</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between", paddingBottom: 12 },
  hero: { flex: 1, alignItems: "center", justifyContent: "center", gap: 24 },
  word: { fontFamily: font.bold, fontSize: 38, letterSpacing: -1.33, color: colors.ink, marginBottom: -16 },
  tag: { fontFamily: font.regular, fontSize: 16, letterSpacing: 0.08, color: colors.muted },
  actions: { paddingHorizontal: 24, gap: 12 },
  error: { fontFamily: font.medium, fontSize: 13.5, color: "#C2554E", textAlign: "center", marginBottom: 4 },
  btn: { height: 56, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  pressed: { opacity: 0.85 },
  google: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.line },
  googleText: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  apple: { backgroundColor: "#1A1D1A" },
  appleText: { fontFamily: font.semibold, fontSize: 16, color: "#fff" },
  legal: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, textAlign: "center", paddingHorizontal: 20, paddingTop: 6 },
  reviewerLink: { fontFamily: font.medium, fontSize: 12, color: colors.faint, textAlign: "center", paddingTop: 4, textDecorationLine: "underline" },
  modalRoot: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: "#fff", borderRadius: 20, padding: 22, gap: 12 },
  sheetTitle: { fontFamily: font.bold, fontSize: 19, letterSpacing: -0.4, color: colors.ink },
  sheetHint: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  input: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, fontFamily: font.medium, fontSize: 15, color: colors.ink, backgroundColor: "#fff" },
  sheetBtn: { height: 52, borderRadius: 26, backgroundColor: "#1A1D1A", alignItems: "center", justifyContent: "center", marginTop: 4 },
  sheetBtnText: { fontFamily: font.semibold, fontSize: 15.5, color: "#fff" },
});

export default SignInScreen;
