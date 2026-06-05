import React from "react";
import { StyleSheet, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/AuthContext";
import { mockUser } from "../../mocks/user";
import { font } from "../../theme/fonts";

interface UserAvatarProps {
  size?: number;
}

/**
 * The profile bubble shown in app headers. Its initial is derived from the
 * signed-in user (`displayName`, falling back to email), so it reflects whoever
 * is logged in rather than a hardcoded letter.
 */
export function UserAvatar({ size = 34 }: UserAvatarProps) {
  const auth = useAuth();
  const user = auth.user ?? mockUser;
  const source = user.displayName ?? user.email ?? "?";
  const initial = source.trim().charAt(0).toUpperCase() || "?";

  return (
    <LinearGradient
      colors={["#D9DCD3", "#B9BEB2"]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.text, { fontSize: Math.round(size * 0.38) }]}>{initial}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  text: { fontFamily: font.bold, color: "#5B6157" },
});

export default UserAvatar;
