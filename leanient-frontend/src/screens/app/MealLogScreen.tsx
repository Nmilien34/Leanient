import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import {
  addItem,
  buildManualMealLogDraft,
  customItem,
  initialMealLogForm,
  itemFromPreset,
  removeItem,
  resetMacrosToEstimate,
  type MealLogForm,
} from "./mealLogForm";
import { FOOD_CATALOG, FOOD_CATEGORY_LABELS, popularFoods, searchFoods, splitMealParts, type FoodPreset } from "./foodCatalog";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

interface MealLogScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave?: (draft: ReturnType<typeof buildManualMealLogDraft>) => Promise<void>;
  /** Launches the camera meal scan — the consolidated "Scan" method tile. */
  onScan?: () => void;
}

const CATEGORY_ORDER: FoodPreset["category"][] = ["breakfast", "sandwiches", "meals", "snacks"];

/** One of the four logging-method tiles at the top of the hub. */
function MethodTile({ label, sub, soon, onPress, icon }: { label: string; sub?: string; soon?: boolean; onPress: () => void; icon: React.ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${sub ?? ""}`.trim()}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, soon && styles.tileSoon, pressed && styles.rowPressed]}
    >
      <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={soon ? colors.faint : colors.emeraldDeep} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </Svg>
      <Text style={[styles.tileLabel, soon && styles.tileLabelSoon]}>{label}</Text>
      {soon ? <Text style={styles.tileSoonTag}>Soon</Text> : sub ? <Text style={styles.tileSub}>{sub}</Text> : null}
    </Pressable>
  );
}

/**
 * Manual meal entry built around picking, not typing: quick-pick chips and a
 * typeahead over the food catalog add foods as removable pills, and the
 * protein/calorie fields prefill from the picks (still editable for odd
 * portions). Anything we don't know stays one tap away as a custom entry.
 */
export function MealLogScreen({ visible, onClose, onSave, onScan }: MealLogScreenProps) {
  const [form, setForm] = useState(initialMealLogForm);
  const [query, setQuery] = useState("");
  const [browseOpen, setBrowseOpen] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Composite meal: a typed phrase can be one meal with parts ("rice, beans and
  // chicken"), so we resolve each part to a catalog match or a custom item.
  const parts = useMemo(() => splitMealParts(query), [query]);
  const isComposite = parts.length > 1;
  const addAllParts = () => {
    setForm((f) => {
      let next = f;
      for (const part of parts) {
        const match = searchFoods(part, next.items.map((i) => i.key))[0];
        next = addItem(next, match ? itemFromPreset(match) : customItem(part));
      }
      return next;
    });
    setQuery("");
  };

  const onTile = (key: "scan" | "quick" | "barcode" | "voice") => {
    if (key === "scan") onScan?.();
    else if (key === "quick") inputRef.current?.focus();
    else Alert.alert("Coming soon", key === "barcode" ? "Barcode scanning is on the way." : "Voice logging is on the way.");
  };

  // The modal stays mounted between opens; each meal starts clean.
  useEffect(() => {
    if (visible) {
      setForm(initialMealLogForm);
      setQuery("");
      setBrowseOpen(false);
    }
  }, [visible]);

  const pickedIds = form.items.map((item) => item.key);
  const suggestions = useMemo(() => searchFoods(query, pickedIds), [query, pickedIds]);
  const quickPicks = useMemo(() => popularFoods().filter((f) => !pickedIds.includes(f.id)), [pickedIds]);
  const showCustomRow =
    query.trim().length > 1 &&
    !suggestions.some((s) => s.name.toLowerCase() === query.trim().toLowerCase());

  const addPreset = (preset: FoodPreset) => {
    setForm((f) => addItem(f, itemFromPreset(preset)));
    setQuery("");
  };

  const addCustom = () => {
    const name = query.trim();
    if (!name) return;
    setForm((f) => addItem(f, customItem(name)));
    setQuery("");
  };

  const setMacro = (key: "protein" | "calories") => (value: string) =>
    setForm((f) => ({ ...f, [key]: value, macrosEdited: true }));

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
        <ModalSafeArea style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.head}>
            <Pressable accessibilityLabel="Close" onPress={onClose} style={styles.closeBtn}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round">
                <Path d="M6 6l12 12M18 6L6 18" />
              </Svg>
            </Pressable>
            <Text style={styles.headTitle}>Log food</Text>
            <View style={styles.headSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.tiles}>
              <MethodTile label="Scan" sub="a meal" onPress={() => onTile("scan")} icon={<><Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><Path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /></>} />
              <MethodTile label="Quick" sub="add" onPress={() => onTile("quick")} icon={<Path d="M12 5v14M5 12h14" />} />
              <MethodTile label="Barcode" soon onPress={() => onTile("barcode")} icon={<Path d="M4 5v14M7 5v14M10 5v14M14 5v14M17 5v14M20 5v14" />} />
              <MethodTile label="Voice" soon onPress={() => onTile("voice")} icon={<><Path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3z" /><Path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>} />
            </View>

            <Text style={styles.glabel}>WHAT DID YOU EAT?</Text>

            {form.items.length > 0 ? (
              <View style={styles.pillRow}>
                {form.items.map((item) => (
                  <View key={item.key} style={styles.pill}>
                    <Text style={styles.pillText}>{item.name}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${item.name}`}
                      hitSlop={8}
                      onPress={() => setForm((f) => removeItem(f, item.key))}
                      style={styles.pillX}
                    >
                      <Svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round">
                        <Path d="M6 6l12 12M18 6L6 18" />
                      </Svg>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={form.items.length > 0 ? "Add another food, or a whole meal" : "Search foods, or type a whole meal"}
              placeholderTextColor={colors.faint}
              style={styles.input}
              accessibilityLabel="Search foods"
              autoCorrect={false}
            />

            {query.trim().length > 0 ? (
              <View style={styles.suggestCard}>
                {isComposite ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${parts.join(", ")} as one meal`}
                    onPress={addAllParts}
                    style={({ pressed }) => [styles.suggestRow, styles.compositeRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.suggestName}>Log as one meal</Text>
                      <Text style={styles.suggestMeta}>{parts.join(" + ")} · {parts.length} parts</Text>
                    </View>
                    <Text style={styles.suggestAdd}>Add all</Text>
                  </Pressable>
                ) : null}
                {suggestions.map((preset) => (
                  <Pressable
                    key={preset.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${preset.name}`}
                    onPress={() => addPreset(preset)}
                    style={({ pressed }) => [styles.suggestRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.suggestName}>{preset.name}</Text>
                      <Text style={styles.suggestMeta}>
                        {preset.serving} · {preset.protein}g protein · {preset.calories} cal
                      </Text>
                    </View>
                    <Text style={styles.suggestAdd}>Add</Text>
                  </Pressable>
                ))}
                {showCustomRow ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${query.trim()} as a custom food`}
                    onPress={addCustom}
                    style={({ pressed }) => [styles.suggestRow, pressed && styles.rowPressed]}
                  >
                    <View style={styles.flex}>
                      <Text style={styles.suggestName}>"{query.trim()}"</Text>
                      <Text style={styles.suggestMeta}>Add as your own. You set the protein and calories.</Text>
                    </View>
                    <Text style={styles.suggestAdd}>Add</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <>
                <View style={styles.chipWrap}>
                  {quickPicks.map((preset) => (
                    <Pressable
                      key={preset.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Add ${preset.name}`}
                      onPress={() => addPreset(preset)}
                      style={({ pressed }) => [styles.chip, pressed && styles.rowPressed]}
                    >
                      <Text style={styles.chipPlus}>+</Text>
                      <Text style={styles.chipText}>{preset.name}</Text>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={browseOpen ? "Hide all foods" : "Browse all foods"}
                  onPress={() => setBrowseOpen((open) => !open)}
                  style={styles.browseLink}
                >
                  <Text style={styles.browseText}>{browseOpen ? "Hide all foods" : "Browse all foods"}</Text>
                </Pressable>
                {browseOpen
                  ? CATEGORY_ORDER.map((category) => (
                      <View key={category}>
                        <Text style={styles.catLabel}>{FOOD_CATEGORY_LABELS[category]}</Text>
                        <View style={styles.chipWrap}>
                          {FOOD_CATALOG.filter((f) => f.category === category && !pickedIds.includes(f.id)).map(
                            (preset) => (
                              <Pressable
                                key={preset.id}
                                accessibilityRole="button"
                                accessibilityLabel={`Add ${preset.name}`}
                                onPress={() => addPreset(preset)}
                                style={({ pressed }) => [styles.chip, pressed && styles.rowPressed]}
                              >
                                <Text style={styles.chipPlus}>+</Text>
                                <Text style={styles.chipText}>{preset.name}</Text>
                              </Pressable>
                            ),
                          )}
                        </View>
                      </View>
                    ))
                  : null}
              </>
            )}

            <View style={styles.macroHead}>
              <Text style={[styles.glabel, styles.glabelTight]}>PROTEIN &amp; CALORIES</Text>
              {form.macrosEdited && form.items.some((i) => !i.isCustom) ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Reset to estimate" onPress={() => setForm(resetMacrosToEstimate)}>
                  <Text style={styles.resetLink}>Reset to estimate</Text>
                </Pressable>
              ) : null}
            </View>
            {form.items.some((i) => !i.isCustom) && !form.macrosEdited ? (
              <Text style={styles.estimateNote}>Estimated from your picks. Adjust if your portion was different.</Text>
            ) : null}
            <View style={styles.macroRow}>
              <View style={styles.flex}>
                <TextInput
                  value={form.protein}
                  onChangeText={setMacro("protein")}
                  placeholder="28"
                  placeholderTextColor={colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.inputBare}
                  accessibilityLabel="Protein grams"
                />
                <Text style={styles.macroUnit}>g protein</Text>
              </View>
              <View style={styles.flex}>
                <TextInput
                  value={form.calories}
                  onChangeText={setMacro("calories")}
                  placeholder="210"
                  placeholderTextColor={colors.faint}
                  keyboardType="decimal-pad"
                  style={styles.inputBare}
                  accessibilityLabel="Calories"
                />
                <Text style={styles.macroUnit}>calories</Text>
              </View>
            </View>

            <Text style={styles.glabel}>NOTES</Text>
            <TextInput
              value={form.notes}
              onChangeText={(value) => setForm((f) => ({ ...f, notes: value }))}
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
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  scroll: { paddingBottom: 28 },
  flex: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 4 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  headSpacer: { width: 34, height: 34 },
  headTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  glabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 10 },
  glabelTight: { paddingHorizontal: 0 },
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
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingBottom: 10 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(47,184,122,0.13)",
    borderWidth: 1,
    borderColor: "rgba(47,184,122,0.35)",
    borderRadius: 17,
    paddingLeft: 13,
    paddingRight: 6,
    paddingVertical: 7,
  },
  pillText: { fontFamily: font.semibold, fontSize: 14, color: colors.emeraldDeep },
  pillX: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.emeraldDeep, alignItems: "center", justifyContent: "center" },
  tiles: { flexDirection: "row", gap: 9, paddingHorizontal: 20, paddingTop: 14 },
  tile: { flex: 1, aspectRatio: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 18, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8 },
  tileSoon: { backgroundColor: colors.sageFill, borderColor: colors.line },
  tileLabel: { fontFamily: font.bold, fontSize: 12.5, color: colors.ink, letterSpacing: -0.1 },
  tileLabelSoon: { color: colors.muted },
  tileSub: { fontFamily: font.medium, fontSize: 10.5, color: colors.muted, marginTop: -3 },
  tileSoonTag: { fontFamily: font.bold, fontSize: 9, letterSpacing: 0.4, color: colors.faint, marginTop: -2 },
  compositeRow: { borderTopWidth: 0 },
  suggestCard: { marginHorizontal: 20, marginTop: 8, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 14 },
  suggestRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.sageFill },
  rowPressed: { opacity: 0.55 },
  suggestName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  suggestMeta: { fontFamily: font.medium, fontSize: 12.5, color: colors.muted, marginTop: 2 },
  suggestAdd: { fontFamily: font.bold, fontSize: 13, color: colors.emeraldDeep },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipPlus: { fontFamily: font.bold, fontSize: 14, color: colors.emeraldDeep },
  chipText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.inkSoft },
  browseLink: { paddingHorizontal: 22, paddingTop: 14 },
  browseText: { fontFamily: font.semibold, fontSize: 13.5, color: colors.emeraldDeep },
  catLabel: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.faint, paddingHorizontal: 22, paddingTop: 16 },
  macroHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22 },
  resetLink: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep, paddingTop: 18 },
  estimateNote: { fontFamily: font.regular, fontSize: 12.5, color: colors.muted, paddingHorizontal: 22, paddingBottom: 10, marginTop: -4 },
  macroRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20 },
  inputBare: {
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
  macroUnit: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 6, paddingLeft: 4 },
  notes: { minHeight: 88, textAlignVertical: "top" },
  cta: { marginHorizontal: 20, marginTop: 22, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  ctaText: { fontFamily: font.semibold, fontSize: 16, color: "#F4FBF7", letterSpacing: -0.16 },
});

export default MealLogScreen;
