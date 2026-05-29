# NearHub Frontend

NearHub is a mobile event discovery app built with Expo, React Native, and TypeScript. It helps users find nearby events, save favorites, RSVP, scan event QR codes, follow organizers, and receive notifications. The app also includes dedicated organizer and admin workflows for publishing, managing, moderating, and broadcasting event updates.

## Features

- Event discovery with search, category filters, pagination, pull-to-refresh, and location-aware sorting.
- Personalized "For You" feed based on user interests and current location.
- Event detail pages with image galleries, organizer profiles, reviews, likes, RSVP actions, and map navigation.
- QR code scanning for event check-in or event lookup flows.
- Saved and RSVP event management for authenticated users.
- User profile editing, avatar upload, and preference onboarding.
- Organizer dashboard with event statistics, event creation, event editing, image uploads, map coordinate selection, attendee lists, and event deletion.
- Admin console for event moderation, user role/block management, and broadcast notifications.
- Push notification registration on supported development/production builds.
- AI chat widget connected to the backend realtime chat endpoint.
- Expo Updates support for over-the-air updates in release builds.

## Tech Stack

- Expo SDK 55
- React 19 and React Native 0.83
- Expo Router for file-based navigation
- TypeScript with strict mode
- Axios for API requests
- Expo SecureStore for persisted auth tokens
- Expo Location, Camera, Image Picker, Notifications, Updates, and Web Browser
- React Native WebView with Leaflet/OpenStreetMap for the event map
- EAS Build configuration for development, preview, and production channels

## Requirements

- Node.js and npm
- Expo CLI through `npx expo`
- Android Studio and an Android emulator, or a physical Android device
- Xcode and an iOS simulator for iOS development on macOS
- Expo Go for basic development, or an Expo development build for native features that Expo Go does not fully support

Remote push notification token APIs require a physical device and a development/production build. Expo Go is not enough for Android remote push registration.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm run start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

Lint the project:

```bash
npm run lint
```

## Configuration

### Backend API

The API client appends `/api` to the configured backend host. In the current codebase, the mobile app points to:

```text
https://nearhub-afbaz.ondigitalocean.app/api
```

This value is set in `src/services/apiClient.ts`. If you want to target another backend, update `getApiBaseUrl()` there. The file also contains a local fallback that uses port `8020` with `10.0.2.2` on Android emulators and `localhost` elsewhere.

There is also a `.env` file with `EXPO_PUBLIC_API_BASE_URL`, but the current `apiClient.ts` implementation does not read it.

### Google Maps

`app.config.ts` reads the Android Google Maps API key from either:

```text
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
GOOGLE_MAPS_ANDROID_API_KEY
```

Set one of these variables before building if the native Google Maps configuration is needed.

### Firebase / Android

Android configuration uses:

```text
google-services.json
```

The Android package is:

```text
com.baxin.nearhub
```

### Expo Updates

OTA updates are enabled in `app.config.ts` and linked to the EAS project ID:

```text
dfd8fa93-2bd5-4782-b884-ec3f981df827
```

Updates use the `appVersion` runtime policy.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the Expo dev server. |
| `npm run android` | Start Expo and open the Android target. |
| `npm run ios` | Start Expo and open the iOS target. |
| `npm run web` | Start Expo for web. |
| `npm run lint` | Run Expo ESLint. |
| `npm run reset-project` | Run the local reset script from `scripts/reset-project.js`. |

## Project Structure

```text
nearhub-frontend/
  app.config.ts              Expo config used for builds and native plugins
  app.json                   Static Expo app metadata
  eas.json                   EAS build profiles
  src/
    app/                     Expo Router routes
    components/common/       Shared reusable UI components
    components/features/     Feature-level UI components
    contexts/                React context providers
    hooks/                   Shared React Native hooks
    screens/                 Screen implementations used by routes
    services/                Backend API clients and service functions
    theme/                   Colors, spacing, typography, and theme exports
    types/                   Shared TypeScript API/domain types
    utils/                   Small app utilities
  assets/                    App icons, images, splash assets, and tab icons
  scripts/                   Local maintenance scripts
```

## Routing Overview

The app uses Expo Router with route files under `src/app`.

Public or guest-friendly routes include:

- `/`
- `/for-you`
- `/event/[id]`
- `/organizer/[id]`
- `/map`
- `/scan-qr`

Authenticated user routes include:

- `/saved`
- `/myevents`
- `/profile`
- `/notifications`
- `/edit-profile`
- `/edit-preferences`

Organizer routes include:

- `/organizer-overview`
- `/organizer-manage`
- `/organizer-notifications`

Admin routes include:

- `/admin-moderation`
- `/admin-users`
- `/admin-broadcast`

The auth gate in `src/app/_layout.tsx` redirects users based on authentication state and role. Admin users are routed toward the admin console, organizer users toward organizer screens, and unauthenticated users are prompted to sign in before opening protected routes.

## Authentication

Authentication state is managed in `src/contexts/AuthContext.tsx`.

- Access tokens, refresh tokens, and user profile data are persisted with Expo SecureStore.
- The Axios API client receives the current access token through `setAuthToken()`.
- Sign-in and sign-up requests include push registration context when available.
- The app attempts to infer organizer permissions if the stored user role is stale.

## API Services

Backend access is organized by domain under `src/services`.

- `authService.ts` handles sign-in, registration, token refresh, and logout.
- `eventService.ts` handles event discovery, search, detail, likes, RSVP, categories, and reviews.
- `userService.ts` handles profile updates, avatar upload, saved events, RSVP events, and followed organizers.
- `organizerService.ts` handles organizer stats, event CRUD, image uploads, attendee lists, profiles, and follows.
- `adminService.ts` handles moderation, user management, and admin broadcasts.
- `notificationService.ts` and `pushNotificationService.ts` handle device IDs, FCM token registration, and notification sync.
- `chatService.ts` sends messages to the AI chat endpoint.

## Building With EAS

The project includes three EAS build profiles:

```bash
eas build --profile development
eas build --profile preview
eas build --profile production
```

The production profile enables auto-incrementing app versions and uses the `production` update channel. The development profile creates an internal development client.

## Development Notes

- TypeScript path aliases are configured in `tsconfig.json`:
  - `@/*` maps to `src/*`
  - `@/assets/*` maps to `assets/*`
- ESLint uses `eslint-config-expo` and ignores `dist/*`.
- The app is portrait-only and uses automatic light/dark user interface style.
- The primary app config is `app.config.ts`; keep it in sync with `app.json` if static config consumers are used.
- Location features request foreground location permission at runtime.
- Camera and photo library permissions are configured through Expo plugins in `app.config.ts`.

## Troubleshooting

If the app cannot connect to the backend, confirm that `src/services/apiClient.ts` points to the correct backend host and that the backend exposes routes under `/api`.

If Android emulator networking cannot reach a local backend, use `10.0.2.2` instead of `localhost`. The existing local fallback already does this.

If push notifications do not register, use a physical Android device and an Expo development or production build. Expo Go does not support the Android remote push token flow used here.

If maps or location-dependent feeds are empty, verify device location permission, emulator location settings, and backend event coordinates.
