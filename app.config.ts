import type { ExpoConfig } from 'expo/config';

const androidGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_ANDROID_API_KEY;

const config: ExpoConfig = {
  name: 'nearhub',
  slug: 'nearhub',
  owner: 'trander03',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/nearhub-app-icon.png',
  scheme: 'nearhub',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/images/nearhub-app-icon.png',
  },
  android: {
    package: 'com.baxin.nearhub',
    googleServicesFile: './google-services.json',
    softwareKeyboardLayoutMode: 'resize',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/nearhub-app-icon.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    config: androidGoogleMapsApiKey
      ? {
          googleMaps: {
            apiKey: androidGoogleMapsApiKey,
          },
        }
      : undefined,
  },
  web: {
    output: 'static',
    favicon: './assets/images/nearhub-app-icon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFFFF',
        android: {
          image: './assets/images/nearhub-app-icon-rounded.png',
          imageWidth: 76,
        },
        ios: {
          image: './assets/images/nearhub-app-icon-rounded.png',
          imageWidth: 76,
        },
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-image',
    [
      'expo-image-picker',
      {
        photosPermission: 'Allow NearHub to access your photos so you can upload avatars, event images, and scan QR codes from your library.',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow NearHub to access your camera to scan event QR codes.',
      },
    ],
    'expo-secure-store',
    'expo-notifications',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  updates: {
    enabled: true,
    url: 'https://u.expo.dev/dfd8fa93-2bd5-4782-b884-ec3f981df827',
    checkAutomatically: 'ON_LOAD',
    fallbackToCacheTimeout: 5000,
  },
  runtimeVersion: {
    policy: 'appVersion',
  },
  extra: {
    eas: {
      projectId: 'dfd8fa93-2bd5-4782-b884-ec3f981df827',
    },
  },
};

export default config;
