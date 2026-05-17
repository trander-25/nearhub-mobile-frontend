type AuthPromptState = {
  visible: boolean;
  onSignIn?: () => void;
};

type AuthPromptListener = (state: AuthPromptState) => void;

let currentState: AuthPromptState = { visible: false };
const listeners = new Set<AuthPromptListener>();

function notify() {
  listeners.forEach((listener) => listener(currentState));
}

export function subscribeAuthPrompt(listener: AuthPromptListener) {
  listeners.add(listener);
  listener(currentState);

  return () => {
    listeners.delete(listener);
  };
}

export function promptSignIn(onSignIn: () => void) {
  currentState = { visible: true, onSignIn };
  notify();
}

export function dismissSignInPrompt() {
  currentState = { visible: false };
  notify();
}
