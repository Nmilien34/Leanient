import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { mockUser } from "../../mocks/user";
import apiService from "../../services/api.service";
import { font } from "../../theme/fonts";

interface UserAvatarProps {
  size?: number;
}

/**
 * The profile bubble shown in app headers. Renders, in order of preference: the
 * user's uploaded avatar (private S3 photo, fetched via a presigned view URL),
 * the OAuth provider photo (avatarUrl), or the initial derived from the name.
 */
export function UserAvatar({ size = 34 }: UserAvatarProps) {
  const auth = useAuth();
  const user = auth.user ?? mockUser;
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Fetch a fresh presigned URL for the uploaded avatar whenever the signed-in
  // user changes or their record updates (e.g. right after a new upload, which
  // bumps updatedAt). Presigned URLs are short-lived, so we resolve on demand.
  useEffect(() => {
    if (!auth.isAuthenticated || !user.hasAvatar) {
      setUploadedUrl(null);
      return;
    }
    let cancelled = false;
    apiService
      .getAvatarViewUrl()
      .then((result) => {
        if (!cancelled) setUploadedUrl(result.viewUrl);
      })
      .catch(() => {
        if (!cancelled) setUploadedUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated, user.hasAvatar, user.id, user.updatedAt]);

  const photoUri = uploadedUrl ?? user.avatarUrl ?? null;
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (photoUri) {
    return <Image source={{ uri: photoUri }} style={[styles.avatar, dimensions]} resizeMode="cover" />;
  }

  const source = user.displayName ?? user.email ?? "?";
  const initial = source.trim().charAt(0).toUpperCase() || "?";

  return (
    <LinearGradient
      colors={["#D9DCD3", "#B9BEB2"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.avatar, dimensions]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.38) }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center", backgroundColor: "#D9DCD3" },
  text: { fontFamily: font.bold, color: "#5B6157" },
});

export default UserAvatar;
