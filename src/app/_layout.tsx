import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { getOrganizerStats } from '@/services/organizerService';
import { initializePushNotifications } from '@/services/pushNotificationService';
import { colors } from '@/theme';
import { isAdminRole, isOrganizerRole } from '@/utils/role';

function AuthGate() {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const isOnAuthScreen = segments[0] === 'login' || segments[0] === 'register';

    const adminHome = '/admin-moderation';
    const organizerHome = '/organizer-overview';
    const defaultHome = '/';
    const currentRoute = segments[0];

    if (!isAuthenticated && !isOnAuthScreen) {
      router.replace('/login');
      return;
    }

    if (!isAuthenticated) return;

    const resolveAndRoute = async () => {
      const hasAdminRole = isAdminRole(user?.role);
      if (hasAdminRole) {
        if (isOnAuthScreen) {
          router.replace(adminHome);
          return;
        }

        const nonAdminRoutes = new Set([
          'index',
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

      const homeRoute = isOrganizer ? organizerHome : defaultHome;
      const userOnlyRoutes = new Set(['index', 'saved', 'myevents']);
      const adminRoutes = new Set(['admin-moderation', 'admin-users', 'admin-broadcast']);

      if (isOnAuthScreen) {
        router.replace(homeRoute);
      } else if (isOrganizer && (currentRoute === undefined || userOnlyRoutes.has(currentRoute))) {
        // Prevent organizer users from opening user-only routes.
        router.replace(organizerHome);
      } else if (!isOrganizer && currentRoute !== undefined && adminRoutes.has(currentRoute)) {
        // Prevent non-admin users from opening admin-only routes.
        router.replace(defaultHome);
      }
    };

    resolveAndRoute();
  }, [isAuthenticated, isLoading, refreshUser, router, segments, user]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="index" />
      <Stack.Screen name="saved" options={{ animation: 'none' }} />
      <Stack.Screen name="myevents" options={{ animation: 'none' }} />
      <Stack.Screen name="organizer" options={{ animation: 'none' }} />
      <Stack.Screen name="organizer-overview" options={{ animation: 'none' }} />
      <Stack.Screen name="organizer-manage" options={{ animation: 'none' }} />
      <Stack.Screen name="organizer-notifications" options={{ animation: 'none' }} />
      <Stack.Screen name="admin-moderation" options={{ animation: 'none' }} />
      <Stack.Screen name="admin-users" options={{ animation: 'none' }} />
      <Stack.Screen name="admin-broadcast" options={{ animation: 'none' }} />
      <Stack.Screen name="profile" options={{ animation: 'none' }} />
      <Stack.Screen name="event/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="manual-location" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-profile" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="edit-preferences" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initializePushNotifications().catch(() => {});
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGate />
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
