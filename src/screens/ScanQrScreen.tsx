import React, { useCallback, useState } from 'react';
import { Pressable, ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Camera, CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { BottomTabBar } from '@/components/features';
import { useAuth } from '@/contexts/AuthContext';
import { colors, fontWeights, spacing, typography } from '@/theme';
import { isOrganizerRole } from '@/utils/role';
import { promptSignIn } from '@/utils/authPrompt';

function extractEventIdFromQr(rawData: string): string | null {
  const value = rawData.trim();
  if (!value) return null;

  const deepLinkMatch = value.match(/^nearhub:\/\/(?:[^/]+\/)?event\/([^/?#]+)/i);
  if (deepLinkMatch?.[1]) return decodeURIComponent(deepLinkMatch[1]);

  try {
    const parsed = new URL(value);
    const eventFromPath = parsed.pathname.match(/\/event\/([^/?#]+)/i)?.[1];
    if (eventFromPath) return decodeURIComponent(eventFromPath);
    const eventFromQuery = parsed.searchParams.get('eventId');
    if (eventFromQuery) return eventFromQuery;
  } catch {
    // Non-url payload.
  }

  if (/^[a-zA-Z0-9_-]{6,}$/.test(value)) {
    return value;
  }
  return null;
}

export function ScanQrScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);

  const openEventFromRawValue = useCallback(
    (rawData: string) => {
      if (isNavigating) return;
      const eventId = extractEventIdFromQr(rawData);
      if (!eventId) {
        Alert.alert('Invalid QR', 'No event code found in the QR code.');
        return;
      }
      setIsNavigating(true);
      router.push(`/event/${eventId}` as never);
      setTimeout(() => setIsNavigating(false), 1200);
    },
    [isNavigating, router],
  );

  const handleTabPress = useCallback(
    (tab: string) => {
      if (tab === 'explore') router.navigate('/' as never);
      else if (tab === 'for-you') router.navigate('/?tab=for-you' as never);
      else if (!isAuthenticated && (tab === 'saved' || tab === 'myevents' || tab === 'profile')) {
        promptSignIn(() => router.push('/login?entry=required' as never));
      }
      else if (tab === 'saved') router.navigate('/saved' as never);
      else if (tab === 'myevents') {
        router.navigate(
          (isAuthenticated && isOrganizerRole(user?.role) ? '/organizer-overview' : '/myevents') as never,
        );
      } else if (tab === 'profile') router.navigate('/profile' as never);
    },
    [isAuthenticated, router, user?.role],
  );

  const handlePickQrFromLibrary = useCallback(async () => {
    if (isPickingImage || isNavigating) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Please allow photo library access to choose a QR image.');
      return;
    }

    setIsPickingImage(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const scannedResults = await Camera.scanFromURLAsync(result.assets[0].uri, ['qr']);
      const qrValue = scannedResults[0]?.data;

      if (!qrValue) {
        Alert.alert('No QR found', 'The selected image does not contain a readable QR code.');
        return;
      }

      openEventFromRawValue(qrValue);
    } catch (error) {
      Alert.alert('Cannot scan image', error instanceof Error ? error.message : 'Please try another image.');
    } finally {
      setIsPickingImage(false);
    }
  }, [isNavigating, isPickingImage, openEventFromRawValue]);

  const handleToggleCameraFacing = useCallback(() => {
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  }, []);

  if (!permission) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.lg }]}>
        <Text style={styles.headerTitle}>Scan QR</Text>
        <Text style={styles.headerSubtitle}>Scan an event QR to open the details page.</Text>
      </View>

      {permission.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={styles.camera}
            facing={facing}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={isNavigating ? undefined : ({ data }) => openEventFromRawValue(data)}
          />
          <View pointerEvents="box-none" style={styles.overlay}>
            <View pointerEvents="none" style={styles.overlayCenter}>
              <View style={styles.scanFrame} />
              <Text style={styles.overlayHint}>Place the QR in the frame to scan</Text>
            </View>

            <View style={styles.overlayControls}>
              <Pressable
                style={[styles.overlayButton, isPickingImage && styles.overlayButtonDisabled]}
                onPress={handlePickQrFromLibrary}
                disabled={isPickingImage}
              >
                {isPickingImage ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Feather name="image" size={18} color="#FFFFFF" />
                )}
                <Text style={styles.overlayButtonText}>
                  {isPickingImage ? 'Scanning...' : 'Library'}
                </Text>
              </Pressable>

              <Pressable style={styles.overlayButton} onPress={handleToggleCameraFacing}>
                <Feather name="refresh-ccw" size={18} color="#FFFFFF" />
                <Text style={styles.overlayButtonText}>Rotate</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.permissionCard}>
          <Feather name="camera-off" size={30} color={colors.textTertiary} />
          <Text style={styles.permissionTitle}>Camera access required</Text>
          <Text style={styles.permissionText}>
            Allow camera access to scan event QR codes and open details faster.
          </Text>
          <Pressable style={styles.allowButton} onPress={() => requestPermission()}>
            <Text style={styles.allowButtonText}>Allow camera</Text>
          </Pressable>
        </View>
      )}

      <BottomTabBar activeTab="scan-qr" onTabPress={handleTabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: typography.hero,
    fontWeight: fontWeights.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.9,
    lineHeight: 40,
  },
  headerSubtitle: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: spacing.xl,
    marginBottom: 108,
    borderRadius: 18,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.16)',
    gap: spacing.md,
  },
  scanFrame: {
    width: 220,
    height: 220,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  overlayHint: {
    color: '#FFFFFF',
    fontWeight: fontWeights.semibold,
    fontSize: typography.bodySmall,
  },
  overlayControls: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    gap: spacing.sm,
  },
  overlayButton: {
    minWidth: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  overlayButtonDisabled: {
    opacity: 0.72,
  },
  overlayButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
  },
  permissionCard: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
    borderRadius: 16,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    gap: spacing.md,
  },
  permissionTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: typography.bodySmall,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  allowButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  allowButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
  },
});
