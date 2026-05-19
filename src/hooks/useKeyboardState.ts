import { useEffect, useState } from 'react';
import { Dimensions, Keyboard, Platform, type KeyboardEvent } from 'react-native';

type KeyboardState = {
  isVisible: boolean;
  height: number;
};

const hiddenKeyboardState: KeyboardState = {
  isVisible: false,
  height: 0,
};

function resolveKeyboardHeight(event: KeyboardEvent): number {
  const { endCoordinates } = event;
  const screenHeight = Dimensions.get('screen').height;
  const heightFromEvent = Math.max(0, endCoordinates.height);
  const heightFromScreenY = Math.max(0, screenHeight - endCoordinates.screenY);

  return Math.round(heightFromEvent || heightFromScreenY);
}

export function useKeyboardState(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>(hiddenKeyboardState);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardState({
        isVisible: true,
        height: resolveKeyboardHeight(event),
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      Keyboard.scheduleLayoutAnimation(event);
      setKeyboardState(hiddenKeyboardState);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardState;
}
