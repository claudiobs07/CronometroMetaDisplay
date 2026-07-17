export const INPUT_LOCK_MS = 200;

let inputLockedUntil = 0;

export function executeWithInputLock(action: () => void, now = performance.now()): void {
  if (now < inputLockedUntil) {
    return;
  }

  inputLockedUntil = now + INPUT_LOCK_MS;
  action();
}
