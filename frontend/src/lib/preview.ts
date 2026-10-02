import { useSyncExternalStore } from 'react';

export interface Preview {
  url: string;
  /** 0..1 */
  volume: number;
}

let current: Preview | null = null;
const listeners = new Set<() => void>();

/** Lets the admin configuration page audition a track through the shared player. */
export function setPreview(preview: Preview | null) {
  current = preview;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function usePreview(): Preview | null {
  return useSyncExternalStore(subscribe, () => current);
}
