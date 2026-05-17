import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors, spacing, typography } from '@/theme';

type Coordinate = {
  latitude: number;
  longitude: number;
};

interface OpenStreetMapPickerProps {
  coordinate: Coordinate;
  onCoordinateChange: (coordinate: Coordinate) => void;
}

export function OpenStreetMapPicker({ coordinate, onCoordinateChange }: OpenStreetMapPickerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const html = useMemo(() => {
    const lat = Number.isFinite(coordinate.latitude) ? coordinate.latitude : 10.7769;
    const lng = Number.isFinite(coordinate.longitude) ? coordinate.longitude : 106.7009;

    return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
      .leaflet-control-attribution { font-size: 10px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var initialLat = ${lat};
      var initialLng = ${lng};
      var map = L.map('map').setView([initialLat, initialLng], 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      var marker = L.marker([initialLat, initialLng], { draggable: true }).addTo(map);

      function postCoordinate(lat, lng) {
        if (!window.ReactNativeWebView) return;
        window.ReactNativeWebView.postMessage(JSON.stringify({ latitude: lat, longitude: lng }));
      }

      map.on('click', function(e) {
        var lat = e.latlng.lat;
        var lng = e.latlng.lng;
        marker.setLatLng([lat, lng]);
        postCoordinate(lat, lng);
      });

      marker.on('dragend', function(e) {
        var pos = e.target.getLatLng();
        postCoordinate(pos.lat, pos.lng);
      });

      // Modal open animation can cause zero-size initialization on Android.
      function ensureMapVisible() {
        try { map.invalidateSize(); } catch (e) {}
      }
      setTimeout(ensureMapVisible, 120);
      setTimeout(ensureMapVisible, 300);
      setTimeout(ensureMapVisible, 600);
      window.addEventListener('resize', ensureMapVisible);
    </script>
  </body>
</html>`;
  }, [coordinate.latitude, coordinate.longitude]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Map picker is not available on web.</Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Cannot load map. Check internet and try again.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://nearhub.local' }}
        style={styles.map}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        startInLoadingState
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onHttpError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onMessage={(event) => {
          try {
            const parsed = JSON.parse(event.nativeEvent.data) as Coordinate;
            if (!Number.isFinite(parsed.latitude) || !Number.isFinite(parsed.longitude)) return;
            onCoordinateChange(parsed);
          } catch {
            // Ignore malformed messages from web content.
          }
        }}
      />
      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  fallback: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginTop: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  fallbackText: {
    color: colors.textSecondary,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
});
