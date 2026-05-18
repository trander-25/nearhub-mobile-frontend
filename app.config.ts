import type { ExpoConfig } from 'expo/config';

const androidGoogleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  process.env.GOOGLE_MAPS_ANDROID_API_KEY;

const config: ExpoConfig = {
  name: 'nearhub',
  slug: 'nearhub',
  owner: 'trander25',
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
        backgroundColor: '#208AEF',
        android: {
          image: './assets/images/nearhub-app-icon.png',
          imageWidth: 76,
        },
        ios: {
          image: './assets/images/nearhub-app-icon.png',
          imageWidth: 76,
        },
      },
    ],
    '@react-native-community/datetimepicker',
    'expo-image',
    'expo-secure-store',
    'expo-notifications',
    'expo-web-browser',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: '2845b080-7d6d-4c0c-95cb-d05fa68df084',
    },
  },
};

export default config;
