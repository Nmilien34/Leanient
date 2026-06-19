import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AddPhotoThumb, ProgressPhotoThumb } from "./ProgressPhotoThumb";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";

export interface ProgressPhotoItem {
  id: string;
  uri?: string;
  label: string;
}

interface ProgressPhotosCardProps {
  photos: ProgressPhotoItem[];
  /** Opens the progress-photo capture flow. */
  onAdd: () => void;
  /** Optional jump to the full gallery on Progress. */
  onSeeAll?: () => void;
}

/**
 * Home progress-photos card: a horizontal strip of recent body photos with the
 * capture button up front, mirroring the Progress gallery so visual change shows
 * up on Home too. When there are no photos yet, the add tile invites the first.
 */
export function ProgressPhotosCard({ photos, onAdd, onSeeAll }: ProgressPhotosCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>PROGRESS PHOTOS</Text>
        {onSeeAll && photos.length > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="See all progress photos" onPress={onSeeAll}>
            <Text style={styles.seeAll}>See all ›</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        <AddPhotoThumb onPress={onAdd} />
        {photos.map((p) => (
          <ProgressPhotoThumb key={p.id} uri={p.uri} label={p.label} />
        ))}
      </ScrollView>

      {photos.length === 0 ? (
        <Text style={styles.empty}>Add your first photo to start tracking visual change.</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, marginTop: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 20, padding: 16, shadowColor: "rgba(24,28,24,1)", shadowOffset: { width: 0, height: 8 }, shadowRadius: 18, shadowOpacity: 0.06, elevation: 2 },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  eyebrow: { fontFamily: font.bold, fontSize: 11, letterSpacing: 0.77, color: colors.muted },
  seeAll: { fontFamily: font.semibold, fontSize: 12.5, color: colors.emeraldDeep },
  strip: { gap: 10, paddingRight: 4 },
  empty: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.faint, marginTop: 10 },
});

export default ProgressPhotosCard;
