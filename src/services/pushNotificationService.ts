import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { colors } from '@/theme';
import { saveFcmToken } from './notificationService';

const DEVICE_ID_KEY = 'nearhub_device_id';
const DEFAULT_NOTIFICATION_CHANNEL_ID = 'default';
let notificationHandlerInitialized = false;
let notificationChannelInitialized = false;

type NotificationPermissionResult = {
  granted?: boolean;
  status?: string;
};

function canUseRemotePush(): boolean {
  // Expo Go no longer supports Android remote push notification token APIs.
  if (Constants.appOwnership === 'expo') return false;
  if (Platform.OS === 'web') return false;
  return true;
}

function canUseNotificationsModule(): boolean {
  if (Platform.OS === 'web') return false;
  // In Expo Go, remote push APIs are not supported on Android SDK 53+.
  if (!canUseRemotePush()) return false;
  return true;
}

async function getNotificationsModule() {
  if (!canUseNotificationsModule()) return null;
  const Notifications = await import('expo-notifications');
  if (!notificationHandlerInitialized) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    notificationHandlerInitialized = true;
  }
  return Notifications;
}

async function ensureAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android' || notificationChannelInitialized) return;
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await Notifications.setNotificationChannelAsync(DEFAULT_NOTIFICATION_CHANNEL_ID, {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: colors.primary,
  });
  notificationChannelInitialized = true;
}

export async function initializePushNotifications(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;
  await ensureAndroidNotificationChannel();
}

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;
  const next = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, next);
  return next;
}

function isNotificationPermissionGranted(permission: NotificationPermissionResult): boolean {
  return permission.granted === true || permission.status === 'granted';
}

export async function getPushRegistrationContext(): Promise<{ deviceId: string; fcmToken?: string }> {
  const deviceId = await getOrCreateDeviceId();
  await initializePushNotifications();
  if (!Device.isDevice || !canUseRemotePush()) return { deviceId };

  const Notifications = await getNotificationsModule();
  if (!Notifications) return { deviceId };

  const existingPermission = await Notifications.getPermissionsAsync() as NotificationPermissionResult;
  let isGranted = isNotificationPermissionGranted(existingPermission);
  if (!isGranted) {
    const requestedPermission = await Notifications.requestPermissionsAsync() as NotificationPermissionResult;
    isGranted = isNotificationPermissionGranted(requestedPermission);
  }

  if (!isGranted) {
    return { deviceId };
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  const token = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );

  return { deviceId, fcmToken: token.data };
}

export async function syncPushTokenWithBackend(): Promise<void> {
  if (!canUseRemotePush()) return;
  const context = await getPushRegistrationContext();
  if (!context.fcmToken) return;
  await saveFcmToken(context.deviceId, context.fcmToken);
}

