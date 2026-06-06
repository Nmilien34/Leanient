import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useAuth } from "../../context/AuthContext";
import { pickAvatar, uploadAvatar, type AvatarSource } from "../../services/avatar.service";
import { UserAvatar } from "./UserAvatar";
import { colors } from "../../theme/tokens";

interface EditableAvatarProps {
  size?: number;
}

/**
 * The profile bubble plus an edit pencil. Tapping it offers library/camera,
 * uploads the chosen photo to S3 (presigned), and refreshes the cached user so
 * the new avatar renders everywhere.
 */
export function EditableAvatar({ size = 60 }: EditableAvatarProps) {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);

  const runUpload = async (source: AvatarSource) => {
    try {
      setBusy(true);
      const picked = await pickAvatar(source);
      if (!picked) return; // user cancelled
      const updated = await uploadAvatar(picked);
      await auth.updateCachedUser(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Please try again.";
      Alert.alert("Couldn't update photo", message);
    } finally {
      setBusy(false);
    }
  };

  const openPicker = () => {
    if (busy) return;
    Alert.alert("Profile photo", "Add a picture from your library or take a new one.", [
      { text: "Choose from Library", onPress: () => void runUpload("library") },
      { text: "Take Photo", onPress: () => void runUpload("camera") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const badge = Math.max(20, Math.round(size * 0.34));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Edit profile photo"
      onPress={openPicker}
      style={{ width: size, height: size }}
    >
      <UserAvatar size={size} />

      {busy ? (
        <View style={[styles.overlay, { borderRadius: size / 2 }]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : null}

      <View style={[styles.pencil, { width: badge, height: badge, borderRadius: badge / 2 }]}>
        <Svg width={badge * 0.55} height={badge * 0.55} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <Path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
          <Path d="M14.5 7.5l3 3" />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(12,16,11,0.35)",
  },
  pencil: {
    position: "absolute",
    right: -2,
    bottom: -2,
    backgroundColor: colors.emeraldDeep,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.paper,
  },
});

export default EditableAvatar;
