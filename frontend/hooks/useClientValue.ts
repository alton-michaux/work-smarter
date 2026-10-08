import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

/**
 * `read()` in the browser, `null` during SSR and hydration. For values that
 * only exist client-side (today's date, localStorage, media queries) and would
 * otherwise cause a hydration mismatch.
 *
 * `read` runs on every render, so it must return a primitive (or the same
 * object each time); a fresh object per call would re-render forever.
 */
export function useClientValue<T>(read: () => T): T | null {
  return useSyncExternalStore(noopSubscribe, read, () => null);
}
