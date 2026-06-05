import React, { useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { buildManualMealLogDraft, initialMealLogForm, type MealLogForm } from "./mealLogForm";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface MealLogScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: ReturnType<typeof buildManualMealLogDraft>) => Promise<void>;
}

function updateField<K extends keyof MealLogForm>(
  setForm: React.Dispatch<React.SetStateAction<MealLogForm>>,
  key: K,
  value: MealLogForm[K],
) {
  setForm((form) => ({ ...form, [key]: value }));
}

export function MealLogScreen({ visible, onClose, onSave }: MealLogScreenProps) {
  const [form, setForm] = useState(initialMealLogForm);

  const save = () => {
    try {
      void onSave?.(buildManualMealLogDraft(form, new Date().toISOString()));
    } catch (error) {
      Alert.alert("Check this meal", error instanceof Error ? error.message : "Meal details are incomplete.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
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
            <Text style={styles.headTitle}>Log meal</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.glabel}>FOOD</Text>
            <TextInput
              value={form.foodName}
              onChangeText={(value) => updateField(setForm, "foodName", value)}
              placeholder="Greek yogurt"
              placeholderTextColor={colors.faint}
              style={styles.input}
              accessibilityLabel="Food name"
            />

            <Text style={styles.glabel}>PROTEIN</Text>
            <TextInput
              value={form.protein}
              onChangeText={(value) => updateField(setForm, "protein", value)}
              placeholder="28"
              placeholderTextColor={colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel="Protein grams"
            />

            <Text style={styles.glabel}>CALORIES</Text>
            <TextInput
              value={form.calories}
              onChangeText={(value) => updateField(setForm, "calories", value)}
              placeholder="210"
              placeholderTextColor={colors.faint}
              keyboardType="decimal-pad"
              style={styles.input}
              accessibilityLabel="Calories"
            />

            <Text style={styles.glabel}>NOTES</Text>
            <TextInput
              value={form.notes}
              onChangeText={(value) => updateField(setForm, "notes", value)}
              placeholder="Optional"
              placeholderTextColor={colors.faint}
              multiline
              style={[styles.input, styles.notes]}
              accessibilityLabel="Meal notes"
            />

            <Pressable accessibilityRole="button" accessibilityLabel="Save meal" onPress={save}>
              <LinearGradient colors={["#4ECF8B", "#2DB87A", "#1F9E63"]} locations={[0, 0.56, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.cta}>
                <Text style={styles.ctaText}>Save meal</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  input: {
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 15,
    paddingVertical: 13,
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.ink,
  },
  notes: { minHeight: 88, textAlignVertical: "top" },
  cta: { marginHorizontal: 20, marginTop: 22, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
});

export default MealLogScreen;
