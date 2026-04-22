import React, { useEffect, useMemo, useState } from 'react';
import { Feather } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { searchEvents } from '@/services';
import { colors, fontWeights, spacing, typography } from '@/theme';
import type { EventData } from '@/types';

interface MapPinEvent {
  id: string;
  title: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  startLabel: string;
  endLabel: string;
}

const DEFAULT_CENTER = {
  lat: 10.7769,
  lng: 106.7009,
};

function toMapEvent(event: EventData): MapPinEvent | null {
  if (typeof event.lat !== 'number' || typeof event.lng !== 'number') return null;

  const startLabel = event.startAt
    ? new Date(event.startAt).toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : event.dateLabel || 'Dang cap nhat';
  const endLabel = event.endAt
    ? new Date(event.endAt).toLocaleString('vi-VN', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Dang cap nhat';

  return {
    id: event.id,
    title: event.title,
    address: event.address,
    city: event.city,
    lat: event.lat,
    lng: event.lng,
    startLabel,
    endLabel,
  };
}

export function MapEventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ eventId?: string; lat?: string; lng?: string; city?: string }>();
  const [events, setEvents] = useState<MapPinEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const focusEventId = params.eventId;
  const focusLat = Number(params.lat);
  const focusLng = Number(params.lng);
  const focusCity = params.city;

  useEffect(() => {
    let mounted = true;

    async function loadEventsForMap() {
      setIsLoading(true);
      try {
        const response = await searchEvents({
          city: focusCity || undefined,
          page: 1,
          limit: 100,
          sortBy: 'distance',
          lat: Number.isFinite(focusLat) ? focusLat : undefined,
          lng: Number.isFinite(focusLng) ? focusLng : undefined,
        });

        if (!mounted) return;
        const mapped = response.events
          .map(toMapEvent)
          .filter((value): value is MapPinEvent => value !== null);
        setEvents(mapped);
        setError(null);
      } catch {
        if (!mounted) return;
        setError('Khong tai duoc du lieu su kien tren ban do.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadEventsForMap();
    return () => {
      mounted = false;
    };
  }, [focusCity, focusLat, focusLng]);

  const center = useMemo(() => {
    if (Number.isFinite(focusLat) && Number.isFinite(focusLng)) {
      return { lat: focusLat, lng: focusLng };
    }
    const focusedEvent = events.find((event) => event.id === focusEventId);
    if (focusedEvent) {
      return { lat: focusedEvent.lat, lng: focusedEvent.lng };
    }
    if (events.length > 0) {
      return { lat: events[0].lat, lng: events[0].lng };
    }
    return DEFAULT_CENTER;
  }, [events, focusEventId, focusLat, focusLng]);

  const mapHtml = useMemo(() => {
    const eventJson = JSON.stringify(events);
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
      }
      body {
        font-family: Arial, sans-serif;
      }
      .popup-title {
        font-weight: 700;
        margin-bottom: 4px;
      }
      .popup-location {
        color: #555;
        font-size: 12px;
      }
      .popup-date {
        color: #444;
        font-size: 12px;
        margin-top: 4px;
      }
      .open-button {
        margin-top: 8px;
        display: inline-block;
        color: #003d9b;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
    <script>
      const events = ${eventJson};
      const map = L.map('map').setView([${center.lat}, ${center.lng}], events.length ? 13 : 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      const focusedId = ${JSON.stringify(focusEventId ?? '')};
      const hasFocusedCoordinates = ${String(Number.isFinite(focusLat) && Number.isFinite(focusLng))};
      const bounds = [];

      events.forEach((event) => {
        const marker = L.marker([event.lat, event.lng]).addTo(map);
        const popupHtml = '<div class="popup-title">' + event.title + '</div>' +
          '<div class="popup-location">' + event.address + ', ' + event.city + '</div>' +
          '<div class="popup-date"><b>Bat dau:</b> ' + event.startLabel + '</div>' +
          '<div class="popup-date"><b>Ket thuc:</b> ' + event.endLabel + '</div>' +
          '<div class="open-button" data-event-id="' + event.id + '">Xem chi tiet</div>';
        marker.bindPopup(popupHtml);
        bounds.push([event.lat, event.lng]);

        if (focusedId && focusedId === event.id) {
          marker.openPopup();
        }
      });

      map.on('popupopen', (popupEvent) => {
        const popupNode = popupEvent.popup.getElement();
        if (!popupNode) return;
        const button = popupNode.querySelector('.open-button');
        if (!button) return;
        button.addEventListener('click', () => {
          const eventId = button.getAttribute('data-event-id');
          if (!eventId) return;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'open_event', eventId }));
        });
      });

      const focusedEvent = focusedId ? events.find((event) => event.id === focusedId) : null;
      if (focusedEvent) {
        map.setView([focusedEvent.lat, focusedEvent.lng], 16);
      } else if (hasFocusedCoordinates) {
        map.setView([${center.lat}, ${center.lng}], 16);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    </script>
  </body>
</html>`;
  }, [center.lat, center.lng, events, focusEventId]);

  function handleWebViewMessage(event: WebViewMessageEvent) {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as { type?: string; eventId?: string };
      if (payload.type === 'open_event' && payload.eventId) {
        router.push(`/event/${payload.eventId}` as never);
      }
    } catch {
      // Ignore invalid bridge messages.
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.md) }]}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Feather name="arrow-left" size={18} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Event Map</Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <WebView
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          onMessage={handleWebViewMessage}
          style={styles.map}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.chipBg,
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.heading,
    fontWeight: fontWeights.bold,
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: typography.caption,
    color: colors.textTertiary,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
    fontSize: typography.bodySmall,
    fontWeight: fontWeights.semibold,
  },
  map: {
    flex: 1,
  },
});
