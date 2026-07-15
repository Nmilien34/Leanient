import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import type { AppleSignInRequest, AuthResponse, PatchMeRequest, User } from "@leanient/shared";
import apiService from "../services/api.service";
import {
  clearAuthStorage,
  getStoredAuthToken,
  getStoredUser,
  setStoredAuth,
  setStoredUser,
} from "../services/storage.service";
import appsFlyerService from "../services/appsflyer.service";
import revenueCatService from "../services/revenueCat.service";

interface AuthApi {
  signInWithGoogle(idToken: string): Promise<AuthResponse>;
  signInWithApple(body: AppleSignInRequest): Promise<AuthResponse>;
  signInWithDemo(email: string, password: string): Promise<AuthResponse>;
  linkAppleProvider(body: AppleSignInRequest): Promise<User>;
  logout(): Promise<void>;
  getMe(): Promise<User>;
  patchMe(body: PatchMeRequest): Promise<User>;
  setUnauthorizedHandler?(handler: (() => void) | undefined): void;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_AUTH"; payload: { user: User; token: string | null } }
  | { type: "SET_USER"; payload: User }
  | { type: "LOGOUT" };

type AuthMethod = "apple" | "demo" | "google";

export interface AuthContextValue extends AuthState {
  hydrateAuth(): Promise<void>;
  signInWithGoogle(idToken: string): Promise<User>;
  signInWithApple(identityToken: string, fullName?: AppleSignInRequest["fullName"]): Promise<User>;
  signInWithDemo(email: string, password: string): Promise<User>;
  linkAppleProvider(identityToken: string, fullName?: AppleSignInRequest["fullName"]): Promise<User>;
  logout(): Promise<void>;
  refreshMe(): Promise<User | null>;
  patchMe(body: PatchMeRequest): Promise<User>;
  updateCachedUser(user: User): Promise<User>;
}

interface AuthProviderProps {
  children: ReactNode;
  api?: AuthApi;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isDevRuntime(): boolean {
  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  return typeof devFlag === "boolean" ? devFlag : process.env.NODE_ENV !== "production";
}

function warnMissingNewUserFlag(method: AuthMethod): void {
  if (!isDevRuntime()) return;
  console.warn(
    `[AppsFlyer] Auth response for ${method} is missing isNewUser; skipping af_complete_registration.`,
  );
}

function warnCompleteRegistrationFailure(method: AuthMethod, error: unknown): void {
  if (!isDevRuntime()) return;
  console.warn(`[AppsFlyer] Failed to log af_complete_registration for ${method}.`, error);
}

function attributionDebugLog(message: string, ...args: unknown[]): void {
  if (!isDevRuntime()) return;
  console.log(`[Attribution Debug][temporary] ${message}`, ...args);
}

async function configureRevenueCatForUser(
  userId?: string,
  options: { syncSubscriptionStatus?: boolean } = {},
): Promise<void> {
  try {
    const configured = await revenueCatService.configure(userId);
    if (!configured || !userId || !options.syncSubscriptionStatus) {
      return;
    }

    await revenueCatService.syncSubscriptionStatus(userId);
  } catch {
    // RevenueCat must not block auth/session recovery in local dev or outage cases.
  }
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":
      return {
        ...state,
        isLoading: action.payload,
      };
    case "SET_AUTH":
      return {
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
      };
    case "SET_USER":
      return {
        ...state,
        user: action.payload,
        isLoading: false,
        isAuthenticated: true,
      };
    case "LOGOUT":
      return {
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      };
    default:
      return state;
  }
}

export function AuthProvider({ children, api = apiService }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // When any API call returns 401, the client interceptor clears stored
  // credentials; this flips the in-memory state too, so the app immediately
  // returns to the sign-in screen instead of carrying a ghost session.
  useEffect(() => {
    api.setUnauthorizedHandler?.(() => dispatch({ type: "LOGOUT" }));
    return () => api.setUnauthorizedHandler?.(undefined);
  }, [api]);

  const updateCachedUser = useCallback(async (user: User): Promise<User> => {
    await setStoredUser(user);
    dispatch({ type: "SET_USER", payload: user });
    return user;
  }, []);

  const hydrateAuth = useCallback(async (): Promise<void> => {
    dispatch({ type: "SET_LOADING", payload: true });

    try {
      const [user, token] = await Promise.all([getStoredUser(), getStoredAuthToken()]);

      if (!user || !token) {
        void appsFlyerService.initialize().catch(() => undefined);
        void configureRevenueCatForUser();
        await clearAuthStorage();
        dispatch({ type: "LOGOUT" });
        return;
      }

      await configureRevenueCatForUser(user.id, { syncSubscriptionStatus: true });
      dispatch({ type: "SET_AUTH", payload: { user, token } });
      void appsFlyerService.initialize(user.id).catch(() => undefined);

      // Validate the restored session in the background. A live token also
      // refreshes the cached user (onboarding flag, subscription status); a
      // dead one 401s, which clears storage and signs the UI out via the
      // unauthorized handler. Network failures keep the cached session so
      // offline launches still work.
      void api
        .getMe()
        .then((freshUser) => updateCachedUser(freshUser))
        .catch(() => undefined);
    } catch {
      void appsFlyerService.initialize().catch(() => undefined);
      void configureRevenueCatForUser();
      await clearAuthStorage();
      dispatch({ type: "LOGOUT" });
    }
  }, [api, updateCachedUser]);

  const finalizeAuth = useCallback(
    async (response: AuthResponse, method: AuthMethod): Promise<User> => {
      await setStoredAuth(response.user, response.token);

      await appsFlyerService.initialize(response.user.id).catch(() => false);

      if (response.isNewUser === true) {
        attributionDebugLog(`Auth isNewUser flag for ${method}:`, true);
        try {
          await appsFlyerService.logCompleteRegistration({ method });
          attributionDebugLog(`af_complete_registration sent for ${method}.`);
        } catch (error) {
          warnCompleteRegistrationFailure(method, error);
        }
      } else if (response.isNewUser === false) {
        attributionDebugLog(`Auth isNewUser flag for ${method}:`, false);
      } else if (response.isNewUser !== false) {
        warnMissingNewUserFlag(method);
      }

      await configureRevenueCatForUser(response.user.id, { syncSubscriptionStatus: true });
      dispatch({ type: "SET_AUTH", payload: response });
      return response.user;
    },
    [],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string): Promise<User> =>
      finalizeAuth(await api.signInWithGoogle(idToken), "google"),
    [api, finalizeAuth],
  );

  const signInWithApple = useCallback(
    async (identityToken: string, fullName?: AppleSignInRequest["fullName"]): Promise<User> =>
      finalizeAuth(await api.signInWithApple({ identityToken, fullName }), "apple"),
    [api, finalizeAuth],
  );

  const signInWithDemo = useCallback(
    async (email: string, password: string): Promise<User> =>
      finalizeAuth(await api.signInWithDemo(email, password), "demo"),
    [api, finalizeAuth],
  );

  const linkAppleProvider = useCallback(
    async (identityToken: string, fullName?: AppleSignInRequest["fullName"]): Promise<User> =>
      updateCachedUser(await api.linkAppleProvider({ identityToken, fullName })),
    [api, updateCachedUser],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.logout();
    } catch {
      // Local session clearing is authoritative for stateless JWT logout.
    } finally {
      await revenueCatService.logOut().catch(() => undefined);
      await clearAuthStorage();
      dispatch({ type: "LOGOUT" });
    }
  }, [api]);

  const refreshMe = useCallback(async (): Promise<User | null> => {
    if (!state.token) {
      return null;
    }

    const user = await api.getMe();
    await updateCachedUser(user);
    return user;
  }, [api, state.token, updateCachedUser]);

  const patchMe = useCallback(
    async (body: PatchMeRequest): Promise<User> => updateCachedUser(await api.patchMe(body)),
    [api, updateCachedUser],
  );

  useEffect(() => {
    void hydrateAuth();
  }, [hydrateAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      hydrateAuth,
      signInWithGoogle,
      signInWithApple,
      signInWithDemo,
      linkAppleProvider,
      logout,
      refreshMe,
      patchMe,
      updateCachedUser,
    }),
    [
      hydrateAuth,
      linkAppleProvider,
      logout,
      patchMe,
      refreshMe,
      signInWithApple,
      signInWithDemo,
      signInWithGoogle,
      state,
      updateCachedUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
