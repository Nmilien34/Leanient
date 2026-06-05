import AsyncStorage from "@react-native-async-storage/async-storage";
import { userResponseSchema, type User } from "@leanient/shared";

export const AUTH_STORAGE_KEYS = {
  token: "leanient.auth.token",
  user: "leanient.auth.user",
} as const;

export async function getStoredAuthToken(): Promise<string | null> {
  return AsyncStorage.getItem(AUTH_STORAGE_KEYS.token);
}

export async function getStoredUser(): Promise<User | null> {
  const rawUser = await AsyncStorage.getItem(AUTH_STORAGE_KEYS.user);

  if (!rawUser) {
    return null;
  }

  const parsed = userResponseSchema.safeParse(JSON.parse(rawUser));

  if (!parsed.success) {
    await clearAuthStorage();
    return null;
  }

  return parsed.data;
}

export async function setStoredAuth(user: User, token: string): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
  await AsyncStorage.setItem(AUTH_STORAGE_KEYS.token, token);
}

export async function setStoredUser(user: User): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEYS.user, JSON.stringify(user));
}

export async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([AUTH_STORAGE_KEYS.user, AUTH_STORAGE_KEYS.token]);
}
