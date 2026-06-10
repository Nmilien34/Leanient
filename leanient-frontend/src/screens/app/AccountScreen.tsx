import React, { useRef, useState } from "react";
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { StatusBar } from "expo-status-bar";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { mockUser } from "../../mocks/user";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { SettingGroup } from "../../components/app/SettingsRow";
import { EditableAvatar } from "../../components/app/EditableAvatar";
import { Button } from "../../components/ui/Button";
import apiService from "../../services/api.service";
import { extractApiError } from "../../services/apiError";
import { ACCOUNT_HEADER_TOP_PADDING, ACCOUNT_PROFILE_TOP_PADDING } from "./accountLayout";
import { providerCanBeLinkedFromSettings } from "./accountAuthLinking";
import { deriveAccountView } from "./accountMetrics";
import { persistAccountEdit } from "./accountSettings";
import { runAppleSignIn } from "../appleSignIn";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

const ic = (children: React.ReactNode) => (
  <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </Svg>
);
const Icons = {
  name: ic(<><Circle cx={12} cy={8} r={3.5} /><Path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" /></>),
  mail: ic(<><Rect x={3} y={5} width={18} height={14} rx={3} /><Path d="M4 7l8 6 8-6" /></>),
  apple: ic(<Path d="M16 13c0 3 2 4 2 4s-1.5 3-3 3c-1 0-1.5-.7-2.8-.7S10 22 9 22c-1.6 0-4-3.5-4-7 0-3.6 2.4-5 4.3-5 1.2 0 2.2.8 3 .8.7 0 1.9-.9 3.2-.8 1.6.1 2.6.9 3.2 1.8-2.7 1.6-2 4.2-.9 5.2M14 6.5c.7-.9 1.1-2 1-3.2-1.1.1-2.2.7-2.9 1.5-.6.7-1.1 1.8-1 2.9 1.2.1 2.2-.4 2.9-1.2Z" />),
  google: ic(<><Path d="M21 12.2c0-.6-.1-1.2-.2-1.7H12v3.4h5.1c-.2 1.2-.9 2.2-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7Z" /><Path d="M12 21c2.4 0 4.5-.8 6-2.2l-3.1-2.4c-.8.6-1.9.9-2.9.9-2.3 0-4.2-1.5-4.9-3.6H3.9v2.5C5.4 19.1 8.5 21 12 21Z" /><Path d="M7.1 13.7c-.2-.6-.3-1.1-.3-1.7s.1-1.2.3-1.7V7.8H3.9C3.3 9.1 3 10.5 3 12s.3 2.9.9 4.2l3.2-2.5Z" /><Path d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6C16.5 3.9 14.4 3 12 3 8.5 3 5.4 4.9 3.9 7.8l3.2 2.5C7.8 8.1 9.7 6.6 12 6.6Z" /></>),
  trash: (
    <Svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#C2554E" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
    </Svg>
  ),
};

interface AccountScreenProps {
  visible: boolean;
  onClose: () => void;
  onDeleteAccount?: () => void;
}

/**
 * Settings · Account (screen 24). Profile identity + the real sign-in model
 * (linked providers, dynamic from `user.authProviders`) + delete account. All
 * values come from the signed-in `User` via `deriveAccountView`.
 */
export function AccountScreen({ visible, onClose, onDeleteAccount }: AccountScreenProps) {
  const auth = useAuth();
  const user = auth.user ?? mockUser;
  const view = deriveAccountView(user);

  // Name edit sheet. Email is intentionally read-only: the backend `patchMe`
  // contract only accepts displayName/avatarUrl, and a real email change needs a
  // re-verification flow (deferred to v1.5).
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(view.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<"apple" | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const sheet = useRef(new Animated.Value(0)).current;

  const openNameEdit = () => {
    setNameInput(view.name);
    setError(null);
    setEditing(true);
    Animated.timing(sheet, { toValue: 1, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };
  const closeNameEdit = () => {
    if (saving) return;
    Animated.timing(sheet, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setEditing(false));
  };
  const saveName = async () => {
    if (saving) return;
    const trimmed = nameInput.trim();
    if (trimmed.length < 1) {
      setError("Name cannot be empty.");
      return;
    }
    if (trimmed === view.name) {
      closeNameEdit();
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // patchMe persists, then updateCachedUser updates AuthContext so the name
      // reflects across the app. On failure the sheet stays open with the input
      // preserved and the error shown (no retry queue).
      await persistAccountEdit(
        { displayName: trimmed },
        { patchMe: (body) => apiService.patchMe(body), applyUser: (u) => auth.updateCachedUser(u) },
      );
      setSaving(false);
      Animated.timing(sheet, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setEditing(false));
    } catch (e) {
      setError(extractApiError(e).message);
      setSaving(false);
    }
  };

  const linkApple = async () => {
    if (linkingProvider) return;
    setLinkError(null);
    setLinkingProvider("apple");
    try {
      await runAppleSignIn({
        appleAuth: AppleAuthentication,
        signInWithApple: auth.linkAppleProvider,
      });
    } catch (e) {
      setLinkError(extractApiError(e).message);
    } finally {
      setLinkingProvider(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.root}>
        <StatusBar style="dark" />
        <ScreenGround />
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Back" onPress={onClose} style={styles.backBtn}>
              <Svg width={10} height={17} viewBox="0 0 10 17" fill="none" stroke={colors.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M8.5 1.5L1.5 8.5l7 7" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Account</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.phead}>
              <EditableAvatar size={60} />
              <View>
                <Text style={styles.pn}>{view.name}</Text>
                <Text style={styles.changePhoto}>Tap your photo to change it</Text>
              </View>
            </View>

            <Text style={styles.glabel}>PROFILE</Text>
            <SettingGroup
              rows={[
                { key: "name", icon: Icons.name, label: "Name", value: view.name, onPress: openNameEdit },
                { key: "email", icon: Icons.mail, label: "Email", value: view.email ?? "Add" },
              ]}
            />

            <Text style={styles.glabel}>SIGN-IN</Text>
            {linkError ? <Text style={styles.linkError}>{linkError}</Text> : null}
            <SettingGroup
              rows={view.providers.map((p) => ({
                key: p.provider,
                icon: p.provider === "apple" ? Icons.apple : Icons.google,
                label: p.label,
                value: linkingProvider === p.provider ? "Linking..." : p.status,
                onPress: providerCanBeLinkedFromSettings({
                  provider: p.provider,
                  linked: p.linked,
                  platform: Platform.OS,
                })
                  ? () => void linkApple()
                  : undefined,
              }))}
            />

            <View style={styles.dangerWrap}>
              <SettingGroup
                rows={[{ key: "delete", icon: Icons.trash, label: "Delete account", destructive: true, onPress: onDeleteAccount }]}
              />
            </View>
            <Text style={styles.disc}>Deleting your account removes your verdicts, logs, and photos. This cannot be undone.</Text>
          </ScrollView>
        </ModalSafeArea>

        {editing ? (
          <View style={styles.overlay}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: sheet }]}>
              <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss" onPress={closeNameEdit} />
            </Animated.View>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheet.interpolate({ inputRange: [0, 1], outputRange: [340, 0] }) }] }]}>
              <View style={styles.grabber} />
              <Text style={styles.sheetTitle}>Edit name</Text>
              <TextInput
                style={styles.input}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor={colors.faint}
                autoFocus
                editable={!saving}
                maxLength={120}
                returnKeyType="done"
                accessibilityLabel="Name"
                onSubmitEditing={() => void saveName()}
              />
              {error ? <Text style={styles.sheetError}>{error}</Text> : null}
              <Button label="Save" onPress={() => void saveName()} loading={saving} disabled={saving} style={styles.sheetCta} />
              <Pressable accessibilityRole="button" accessibilityLabel="Cancel" onPress={closeNameEdit} disabled={saving} style={styles.sheetCancel}>
                <Text style={styles.sheetCancelText}>Cancel</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: ACCOUNT_HEADER_TOP_PADDING, paddingBottom: 8 },
  backBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  phead: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: ACCOUNT_PROFILE_TOP_PADDING },
  pn: { fontFamily: font.extrabold, fontSize: 21, letterSpacing: -0.42, color: colors.ink },
  changePhoto: { fontFamily: font.semibold, fontSize: 13, color: colors.emeraldDeep, marginTop: 4 },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 2 },
  linkError: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", paddingHorizontal: 22, paddingTop: 6 },
  dangerWrap: { marginTop: 22 },
  disc: { fontFamily: font.regular, fontSize: 11.5, lineHeight: 16, color: colors.faint, textAlign: "center", paddingHorizontal: 28, paddingTop: 14 },
  // name edit sheet
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: "flex-end" },
  scrim: { backgroundColor: "rgba(24,28,24,0.32)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 30,
    shadowColor: "rgba(12,16,11,1)",
    shadowOffset: { width: 0, height: -8 },
    shadowRadius: 24,
    shadowOpacity: 0.18,
    elevation: 16,
  },
  grabber: { width: 40, height: 5, borderRadius: 3, backgroundColor: colors.faintest, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, marginBottom: 14 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 16,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  sheetError: { fontFamily: font.medium, fontSize: 13, color: "#C2554E", marginTop: 10 },
  sheetCta: { marginTop: 18 },
  sheetCancel: { alignSelf: "center", paddingVertical: 12, marginTop: 4 },
  sheetCancelText: { fontFamily: font.medium, fontSize: 14, color: colors.faint },
});

export default AccountScreen;
