import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';

import { colors } from '@/theme';

const REFRESH_SETTLE_MS = 450;

function waitForRefreshSettle() {
  return new Promise((resolve) => {
    setTimeout(resolve, REFRESH_SETTLE_MS);
  });
}

export function usePullToRefresh(onRefresh?: () => Promise<void> | void) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await waitForRefreshSettle();
      }
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={handleRefresh}
        tintColor={colors.primary}
        colors={[colors.primary, colors.accent]}
        progressBackgroundColor={colors.surface}
      />
    ),
    [handleRefresh, refreshing],
  );

  return {
    refreshing,
    onRefresh: handleRefresh,
    refreshControl,
  };
}
