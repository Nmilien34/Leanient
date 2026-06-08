import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Svg, { Path } from "react-native-svg";
import type { ProgressPhoto } from "@leanient/shared";
import { ScreenGround } from "../../components/layout/ScreenGround";
import { ModalSafeArea } from "../../components/layout/ModalSafeArea";
import { colors } from "../../theme/tokens";
import { font } from "../../theme/fonts";
import {
  buildProgressPhotoShareContent,
  getProgressPhotoOpenUrl,
  progressPhotoDisplayLabel,
} from "./progressPhotoDownload";

interface ProgressPhotoDownloadScreenProps {
  visible: boolean;
  photos: ProgressPhoto[];
  onClose: () => void;
  onRefresh?: () => Promise<void>;
  onSharePhoto?: (content: { title: string; message: string; url: string }) => Promise<unknown>;
  onOpenPhoto?: (url: string) => Promise<unknown>;
}

export function ProgressPhotoDownloadScreen({
  visible,
  photos,
  onClose,
  onRefresh,
  onSharePhoto,
  onOpenPhoto,
}: ProgressPhotoDownloadScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [busyPhotoId, setBusyPhotoId] = useState<string | null>(null);
  const sortedPhotos = [...photos].sort((a, b) => b.captureDate.localeCompare(a.captureDate));

  const refresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } catch {
      Alert.alert("Photos could not refresh", "Try again in a moment.");
    } finally {
      setRefreshing(false);
    }
  };

  const openPhoto = async (photo: ProgressPhoto) => {
    const url = getProgressPhotoOpenUrl(photo);
    if (!url) {
      Alert.alert("Photo is not ready", "Try again after the upload finishes.");
      return;
    }

    setBusyPhotoId(photo.id);
    try {
      await (onOpenPhoto ? onOpenPhoto(url) : Linking.openURL(url));
    } catch {
      Alert.alert("Photo could not open", "Try again in a moment.");
    } finally {
      setBusyPhotoId(null);
    }
  };

  const sharePhoto = async (photo: ProgressPhoto) => {
    const content = buildProgressPhotoShareContent(photo);
    if (!content) {
      Alert.alert("Photo is not ready", "Try again after the upload finishes.");
      return;
    }

    setBusyPhotoId(photo.id);
    try {
      await (onSharePhoto ? onSharePhoto(content) : Share.share(content));
    } catch {
      Alert.alert("Photo could not be shared", "Try again in a moment.");
    } finally {
      setBusyPhotoId(null);
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
            <View style={styles.titleWrap}>
              <Text style={styles.headTitle}>Progress photos</Text>
              <Text style={styles.headSub}>{sortedPhotos.length} saved</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh photos"
              onPress={refresh}
              disabled={!onRefresh || refreshing}
              style={[styles.refreshBtn, (!onRefresh || refreshing) && styles.disabledBtn]}
            >
              {refreshing ? <ActivityIndicator size="small" color={colors.emeraldDeep} /> : <Text style={styles.refreshText}>Refresh</Text>}
            </Pressable>
          </View>

          {sortedPhotos.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No progress photos yet</Text>
              <Text style={styles.emptyCopy}>Photos you add from Progress will appear here.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {sortedPhotos.map((photo) => {
                const label = progressPhotoDisplayLabel(photo);
                const ready = Boolean(getProgressPhotoOpenUrl(photo));
                const busy = busyPhotoId === photo.id;

                return (
                  <View key={photo.id} style={styles.photoRow}>
                    <View style={styles.preview}>
                      {photo.viewUrl ? (
                        <Image source={{ uri: photo.viewUrl }} resizeMode="cover" style={styles.image} />
                      ) : (
                        <View style={styles.placeholder}>
                          <Text style={styles.placeholderText}>Pending</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.photoMeta}>
                      <Text style={styles.photoTitle}>{label}</Text>
                      <Text style={styles.photoSub}>{photo.status === "uploaded" ? "Ready" : "Processing"}</Text>
                      <View style={styles.actions}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open progress photo from ${label}`}
                          disabled={!ready || busy}
                          onPress={() => openPhoto(photo)}
                          style={({ pressed }) => [styles.actionBtn, (!ready || busy) && styles.actionDisabled, pressed && styles.actionPressed]}
                        >
                          <Text style={styles.actionText}>Open</Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Share or save progress photo from ${label}`}
                          disabled={!ready || busy}
                          onPress={() => sharePhoto(photo)}
                          style={({ pressed }) => [styles.actionBtn, styles.primaryAction, (!ready || busy) && styles.actionDisabled, pressed && styles.actionPressed]}
                        >
                          <Text style={[styles.actionText, styles.primaryActionText]}>{busy ? "Working" : "Share or save"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </ModalSafeArea>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  safe: { flex: 1 },
  head: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.sageFill, alignItems: "center", justifyContent: "center" },
  titleWrap: { flex: 1 },
  headTitle: { fontFamily: font.bold, fontSize: 16, color: colors.ink },
  headSub: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 2 },
  refreshBtn: { minWidth: 74, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  disabledBtn: { opacity: 0.55 },
  refreshText: { fontFamily: font.semibold, fontSize: 12, color: colors.emeraldDeep },
  scroll: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 28, gap: 12 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 36 },
  emptyTitle: { fontFamily: font.bold, fontSize: 17, color: colors.ink, textAlign: "center" },
  emptyCopy: { fontFamily: font.regular, fontSize: 13, lineHeight: 19, color: colors.muted, textAlign: "center", marginTop: 6 },
  photoRow: { flexDirection: "row", gap: 14, padding: 12, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  preview: { width: 86, height: 112, borderRadius: 14, overflow: "hidden", backgroundColor: colors.sageFill },
  image: { width: "100%", height: "100%" },
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontFamily: font.bold, fontSize: 11, color: colors.muted },
  photoMeta: { flex: 1, justifyContent: "center" },
  photoTitle: { fontFamily: font.bold, fontSize: 15, color: colors.ink },
  photoSub: { fontFamily: font.medium, fontSize: 12, color: colors.muted, marginTop: 3 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionBtn: { minHeight: 34, paddingHorizontal: 13, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.sageFill },
  primaryAction: { backgroundColor: colors.emeraldDeep },
  actionDisabled: { opacity: 0.5 },
  actionPressed: { transform: [{ scale: 0.98 }] },
  actionText: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  primaryActionText: { color: "#FFFFFF" },
});

export default ProgressPhotoDownloadScreen;
