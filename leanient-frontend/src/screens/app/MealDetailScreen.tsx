import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import type { MealLog, MealLogScanDetailResponse, SubscriptionStatus } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { CoachChatScreen } from "./CoachChatScreen";
import { SubscriptionScreen } from "./SubscriptionScreen";
import { useAuth } from "../../context/AuthContext";
import apiService from "../../services/api.service";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

function Spark({ color = "#fff" }: { color?: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9z" />
    </Svg>
  );
}

const SUBSCRIBED: SubscriptionStatus[] = ["trialing", "active", "active_canceled"];

/** Chat openers seeded with the logged meal, mirroring the confirm-meal screen. */
function mealSuggestions(meal: MealLog): string[] {
  const label = `${meal.foodName} (${Math.round(meal.protein)}g protein, ${Math.round(meal.calories)} cal)`;
  return [
    `I logged ${label} today. How does it fit my protein target?`,
    `What should my next meal be after ${meal.foodName}?`,
    "How is my protein looking this week overall?",
  ];
}

interface MealDetailScreenProps {
  visible: boolean;
  meal: MealLog | null;
  onClose: () => void;
}

/**
 * Read-only view of a logged meal, styled like the confirm-meal screen: the
 * meal photo and the coach's confirm-time callout come from the scan record
 * behind the log (GET /meal-logs/:id/scan); macros render from the log itself
 * so manual/barcode meals still get a useful detail view.
 */
export function MealDetailScreen({ visible, meal, onClose }: MealDetailScreenProps) {
  const auth = useAuth();
  const [scan, setScan] = useState<MealLogScanDetailResponse | null>(null);
  const [loadingScan, setLoadingScan] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  const subscribed = auth.user ? SUBSCRIBED.includes(auth.user.subscriptionStatus) : false;
  const openCoach = () => (subscribed ? setCoachOpen(true) : setSubscriptionOpen(true));

  useEffect(() => {
    if (!visible || !meal) {
      setScan(null);
      setCoachOpen(false);
      setSubscriptionOpen(false);
      return;
    }
    let cancelled = false;
    setScan(null);
    setLoadingScan(true);
    apiService
      .getMealLogScan(meal.id)
      .then((detail) => {
        if (!cancelled) setScan(detail);
      })
      .catch(() => {
        // Photo + coach content are enhancements; the log's own macros still render.
      })
      .finally(() => {
        if (!cancelled) setLoadingScan(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, meal?.id]);

  if (!visible || !meal) return null;

  const coachContent = scan?.coachContent ?? null;
  const swap = coachContent?.mode === "swap" ? coachContent.swap : null;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScreenGround />
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.head}>
          <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
              <Path d="M6 6l12 12M18 6L6 18" />
            </Svg>
          </Pressable>
          <Text style={styles.headTitle}>Logged meal</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {scan?.photoViewUrl ? (
            <View style={styles.photoWrap}>
              <Image source={{ uri: scan.photoViewUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            </View>
          ) : loadingScan ? (
            <View style={[styles.photoWrap, styles.photoLoading]}>
              <ActivityIndicator color={colors.emerald} />
            </View>
          ) : null}

          <View style={styles.titleBlock}>
            <Text style={styles.foodName}>{meal.foodName}</Text>
            <Text style={styles.serving}>
              {meal.servingSize ? `${meal.servingSize} · ` : ""}logged today
            </Text>
          </View>

          <View style={styles.macros}>
            <Macro value={`${Math.round(meal.protein)}g`} label="Protein" lead />
            <Macro value={`${Math.round(meal.calories)}`} label="Calories" />
            {meal.carbs != null ? <Macro value={`${Math.round(meal.carbs)}g`} label="Carbs" /> : null}
          </View>

          {coachContent ? (
            <LinearGradient colors={["rgba(47,184,122,0.10)", "rgba(255,255,255,0.5)"]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.aicard}>
              <View style={styles.coachmark}>
                <View style={styles.coachdot}>
                  <Spark />
                </View>
                <Text style={styles.coachLabel}>LEANIENT COACH</Text>
              </View>
              <Text style={styles.callout}>{coachContent.callout}</Text>
              {swap ? (
                <View style={styles.statline}>
                  <View style={styles.sli}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M12 3s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z" />
                    </Svg>
                  </View>
                  <Text style={styles.slk}>{swap.description}</Text>
                  <Text style={styles.slv}>+{swap.additionalProtein}g</Text>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Talk to your coach"
                onPress={openCoach}
                style={styles.coachChatBtn}
              >
                <Text style={styles.coachChatBtnText}>Talk to your coach</Text>
                <Text style={styles.coachChatChev}>›</Text>
              </Pressable>
            </LinearGradient>
          ) : null}

          {meal.notes ? (
            <View style={styles.notes}>
              <Text style={styles.notesLabel}>NOTES</Text>
              <Text style={styles.notesText}>{meal.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      <CoachChatScreen
        visible={coachOpen}
        onClose={() => setCoachOpen(false)}
        onUpgrade={() => {
          setCoachOpen(false);
          setSubscriptionOpen(true);
        }}
        suggestions={mealSuggestions(meal)}
      />
      <SubscriptionScreen visible={subscriptionOpen} onClose={() => setSubscriptionOpen(false)} />
    </View>
  );
}

function Macro({ value, label, lead }: { value: string; label: string; lead?: boolean }) {
  return (
    <View style={[styles.macro, lead && styles.macroLead]}>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.paper, zIndex: 70 },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 8 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  photoWrap: { marginHorizontal: 20, marginTop: 8, height: 172, borderRadius: 20, overflow: "hidden", backgroundColor: colors.sageFill },
  photoLoading: { alignItems: "center", justifyContent: "center" },
  titleBlock: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 2 },
  foodName: { fontFamily: font.extrabold, fontSize: 20, letterSpacing: -0.4, color: colors.ink },
  serving: { fontFamily: font.regular, fontSize: 13, color: colors.muted, marginTop: 2 },
  macros: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  macro: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 12, alignItems: "center" },
  macroLead: { borderColor: "rgba(47,184,122,0.4)", backgroundColor: "rgba(47,184,122,0.07)" },
  macroValue: { fontFamily: font.extrabold, fontSize: 19, letterSpacing: -0.38, color: colors.ink },
  macroLabel: { fontFamily: font.semibold, fontSize: 11.5, color: colors.muted, marginTop: 2 },
  aicard: { marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: "rgba(47,184,122,0.25)", borderRadius: 20, padding: 16 },
  coachmark: { flexDirection: "row", alignItems: "center", gap: 8 },
  coachdot: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: colors.emeraldDeep },
  coachLabel: { fontFamily: font.bold, fontSize: 11.5, letterSpacing: 0.69, color: colors.emeraldDeep },
  callout: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: colors.inkSoft, marginTop: 10 },
  statline: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, padding: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14 },
  sli: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: "#EEF7F1" },
  slk: { flex: 1, fontFamily: font.semibold, fontSize: 13.5, color: colors.ink },
  slv: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  coachChatBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 4, marginTop: 12 },
  coachChatBtnText: { fontFamily: font.bold, fontSize: 13.5, color: colors.emeraldDeep },
  coachChatChev: { fontFamily: font.bold, fontSize: 15, color: colors.emeraldDeep },
  notes: { marginHorizontal: 20, marginTop: 16 },
  notesLabel: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 1.08, color: colors.muted },
  notesText: { fontFamily: font.regular, fontSize: 14.5, lineHeight: 21, color: colors.inkSoft, marginTop: 6 },
});

export default MealDetailScreen;
