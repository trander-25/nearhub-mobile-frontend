import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useGlobalSearchParams, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View, useColorScheme } from 'react-native';
import { AIChatWidget, AuthRequiredModalHost } from '@/components/features';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getOrganizerStats } from '@/services/organizerService';
import { initializePushNotifications } from '@/services/pushNotificationService';
import { colors } from '@/theme';
import { isAdminRole, isOrganizerRole } from '@/utils/role';
import { promptSignIn } from '@/utils/authPrompt';

const PUBLIC_GUEST_ROUTES = new Set<string | undefined>([
  undefined,
  'index',
  'for-you',
  'event',
  'map',
  'scan-qr',
]);

const pushTransition = {
  animation: Platform.OS === 'ios' ? 'simple_push' : 'slide_from_right',
  animationDuration: Platform.OS === 'ios' ? 360 : 300,
  animationMatchesGesture: true,
  fullScreenGestureEnabled: true,
  gestureEnabled: true,
} as const;

const tabTransition = {
  animation: 'none',
  gestureEnabled: false,
} as const;

const modalTransition = {
  animation: 'slide_from_bottom',
  animationDuration: 320,
  gestureEnabled: true,
} as const;

function AuthGate() {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const segments = useSegments();
  const params = useGlobalSearchParams<{ id?: string; entry?: string }>();
  const router = useRouter();
  const currentRoute = segments[0];
  const isOrganizerProfileRoute = currentRoute === 'organizer' && typeof params.id === 'string';
  const isOnAuthScreen = currentRoute === 'login' || currentRoute === 'register';
  const isIntentionalAuthScreen = isOnAuthScreen && typeof params.entry === 'string';
  const isPublicRoute = PUBLIC_GUEST_ROUTES.has(currentRoute) || isOrganizerProfileRoute;

  useEffect(() => {
    if (isLoading) return;

    const adminHome = '/admin-moderation';
    const organizerHome = '/organizer-overview';
    const defaultHome = '/';

    if (!isAuthenticated && isOnAuthScreen && !isIntentionalAuthScreen) {
      router.replace('/');
      return;
    }

    if (!isAuthenticated && !isOnAuthScreen && !isPublicRoute) {
      promptSignIn(() => router.push('/login?entry=required'));
      router.replace('/');
      return;
    }

    if (!isAuthenticated) return;

    const resolveAndRoute = async () => {
      const hasAdminRole = isAdminRole(user?.role);
      if (hasAdminRole) {
        if (isOnAuthScreen) {
          router.replace(defaultHome);
          return;
        }

        const nonAdminRoutes = new Set([
          'saved',
          'myevents',
          'organizer',
          'organizer-overview',
          'organizer-manage',
          'organizer-notifications',
        ]);
        if (currentRoute === undefined || nonAdminRoutes.has(currentRoute)) {
          router.replace(adminHome);
        }
        return;
      }

      const hasOrganizerRole = isOrganizerRole(user?.role);
      let isOrganizer = hasOrganizerRole;

      if (!isOrganizer) {
        try {
          await getOrganizerStats();
          isOrganizer = true;
          if (user && !hasOrganizerRole) {
            refreshUser({ ...user, role: 'organizer' });
          }
        } catch {
          isOrganizer = false;
        }
      }

      const userOnlyRoutes = new Set(['saved', 'myevents']);
      const adminRoutes = new Set(['admin-moderation', 'admin-users', 'admin-broadcast']);

      if (isOnAuthScreen) {
        router.replace(defaultHome);
      } else if (isOrganizer && userOnlyRoutes.has(currentRoute)) {
        // Prevent organizer users from opening user-only routes.
        router.replace(organizerHome);
      } else if (!isOrganizer && currentRoute !== undefined && adminRoutes.has(currentRoute)) {
        // Prevent non-admin users from opening admin-only routes.
        router.replace(defaultHome);
      }
    };

    resolveAndRoute();
  }, [currentRoute, isAuthenticated, isIntentionalAuthScreen, isLoading, isOnAuthScreen, isOrganizerProfileRoute, isPublicRoute, refreshUser, router, user]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated && !isOnAuthScreen && !isPublicRoute) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const activeEventId = currentRoute === 'event' && typeof params.id === 'string' ? params.id : undefined;

  return (
    <>
      <Stack
        initialRouteName="index"
        screenOptions={{
          headerShown: false,
          ...pushTransition,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={tabTransition} />
        <Stack.Screen name="for-you" options={tabTransition} />
        <Stack.Screen name="login" options={modalTransition} />
        <Stack.Screen name="register" options={modalTransition} />
        <Stack.Screen name="saved" options={tabTransition} />
        <Stack.Screen name="scan-qr" options={tabTransition} />
        <Stack.Screen name="myevents" options={tabTransition} />
        <Stack.Screen name="organizer" options={tabTransition} />
        <Stack.Screen name="organizer-overview" options={tabTransition} />
        <Stack.Screen name="organizer-manage" options={tabTransition} />
        <Stack.Screen name="organizer-notifications" options={tabTransition} />
        <Stack.Screen name="organizer/[id]" />
        <Stack.Screen name="admin-moderation" options={tabTransition} />
        <Stack.Screen name="admin-users" options={tabTransition} />
        <Stack.Screen name="admin-broadcast" options={tabTransition} />
        <Stack.Screen name="profile" options={tabTransition} />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="map" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="edit-preferences" />
      </Stack>
      {isAuthenticated && !isOnAuthScreen ? <AIChatWidget eventId={activeEventId} /> : null}
    </>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const navigationTheme = {
    ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      text: colors.textPrimary,
    },
  };

  useEffect(() => {
    initializePushNotifications().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <AuthProvider>
        <AuthGate />
        <AuthRequiredModalHost />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
