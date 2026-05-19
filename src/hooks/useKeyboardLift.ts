import { useEffect, useRef } from 'react';
import { Animated, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeyboardState } from './useKeyboardState';

export function useKeyboardLift(enabled = true) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const keyboard = useKeyboardState();
  const keyboardLift = useRef(new Animated.Value(0)).current;
  const baselineWindowHeightRef = useRef(height);

  useEffect(() => {
    if (!keyboard.isVisible) {
      baselineWindowHeightRef.current = Math.max(baselineWindowHeightRef.current, height);
    }
  }, [height, keyboard.isVisible]);

  const nativeResizeDelta = baselineWindowHeightRef.current - height;
  const androidWindowAlreadyResized =
    Platform.OS === 'android' &&
    keyboard.isVisible &&
    keyboard.height > 0 &&
    nativeResizeDelta > Math.min(120, keyboard.height * 0.45);
  const keyboardLiftTarget = enabled && keyboard.isVisible
    ? Math.max(0, keyboard.height - (Platform.OS === 'ios' ? insets.bottom : 0))
    : 0;
  const effectiveKeyboardLift = androidWindowAlreadyResized ? 0 : keyboardLiftTarget;

  useEffect(() => {
    Animated.timing(keyboardLift, {
      toValue: effectiveKeyboardLift,
      duration: keyboard.isVisible ? 220 : 180,
      useNativeDriver: false,
    }).start();
  }, [effectiveKeyboardLift, keyboard.isVisible, keyboardLift]);

  return {
    effectiveKeyboardLift,
    keyboard,
    keyboardLift,
    windowHeight: height,
  };
}
