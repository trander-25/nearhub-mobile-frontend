import { useKeyboardState } from './useKeyboardState';

export function useKeyboardVisible(): boolean {
  return useKeyboardState().isVisible;
}
