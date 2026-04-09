import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setAuthToken } from '@/services/apiClient';
import * as authService from '@/services/authService';
import { getOrganizerStats } from '@/services/organizerService';
import { getPushRegistrationContext, syncPushTokenWithBackend } from '@/services/pushNotificationService';
import type { AuthUser, LoginRequest, RegisterRequest } from '@/types/auth.types';
import { isOrganizerRole } from '@/utils/role';

const STORAGE_KEY_ACCESS = 'nearhub_access_token';
const STORAGE_KEY_REFRESH = 'nearhub_refresh_token';
const STORAGE_KEY_USER = 'nearhub_user';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (data: LoginRequest) => Promise<AuthUser>;
  signUp: (data: RegisterRequest) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshUser: (updatedUser: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function resolveEffectiveRole(inputUser: AuthUser): Promise<AuthUser> {
    const normalizedRole = (inputUser.role ?? '').trim().toLowerCase();
    if (isOrganizerRole(normalizedRole)) {
      return { ...inputUser, role: 'organizer' };
    }

    // Fallback: infer organizer role from actual permission on organizer APIs.
    // This handles stale/incorrect role values persisted in client state.
    try {
      await getOrganizerStats();
      return { ...inputUser, role: 'organizer' };
    } catch {
      return { ...inputUser, role: normalizedRole || inputUser.role };
    }
  }

  async function restoreSession() {
    try {
      const [accessToken, refreshTokenStr, userJson] = await Promise.all([
        SecureStore.getItemAsync(STORAGE_KEY_ACCESS),
        SecureStore.getItemAsync(STORAGE_KEY_REFRESH),
        SecureStore.getItemAsync(STORAGE_KEY_USER),
      ]);

      if (accessToken && userJson) {
        setAuthToken(accessToken);
        const parsedUser = JSON.parse(userJson) as AuthUser;
        const resolvedUser = await resolveEffectiveRole(parsedUser);
        setUser(resolvedUser);
        await SecureStore.setItemAsync(STORAGE_KEY_USER, JSON.stringify(resolvedUser));
        syncPushTokenWithBackend().catch(() => {});
      } else if (refreshTokenStr) {
        const res = await authService.refreshToken(refreshTokenStr);
        await persistAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
      }
    } catch {
      await clearAuth();
    } finally {
      setIsLoading(false);
    }
  }

  async function persistAuth(u: AuthUser, access: string, refresh: string) {
    setAuthToken(access);
    const resolvedUser = await resolveEffectiveRole(u);
    setUser(resolvedUser);
    await Promise.all([
      SecureStore.setItemAsync(STORAGE_KEY_ACCESS, access),
      SecureStore.setItemAsync(STORAGE_KEY_REFRESH, refresh),
      SecureStore.setItemAsync(STORAGE_KEY_USER, JSON.stringify(resolvedUser)),
    ]);
    syncPushTokenWithBackend().catch(() => {});
  }

  async function clearAuth() {
    setAuthToken(null);
    setUser(null);
    await Promise.all([
      SecureStore.deleteItemAsync(STORAGE_KEY_ACCESS),
      SecureStore.deleteItemAsync(STORAGE_KEY_REFRESH),
      SecureStore.deleteItemAsync(STORAGE_KEY_USER),
    ]);
  }

  const signIn = useCallback(async (data: LoginRequest) => {
    const pushContext = await getPushRegistrationContext();
    const res = await authService.login({ ...data, ...pushContext });
    await persistAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    return await resolveEffectiveRole(res.user);
  }, []);

  const signUp = useCallback(async (data: RegisterRequest) => {
    const pushContext = await getPushRegistrationContext();
    const res = await authService.register({ ...data, ...pushContext });
    await persistAuth(res.user, res.tokens.accessToken, res.tokens.refreshToken);
    return await resolveEffectiveRole(res.user);
  }, []);

  const refreshUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
    SecureStore.setItemAsync(STORAGE_KEY_USER, JSON.stringify(updatedUser)).catch(() => {});
  }, []);

  const signOut = useCallback(async () => {
    try {
      const refreshTokenStr = await SecureStore.getItemAsync(STORAGE_KEY_REFRESH);
      if (refreshTokenStr) {
        await authService.logout(refreshTokenStr);
      }
    } catch {
      // Best-effort server logout
    }
    await clearAuth();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }),
    [user, isLoading, signIn, signUp, signOut, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
