import { useSyncExternalStore } from 'react';
import { type PlayerState, player } from './player.ts';

export function usePlayerState(): PlayerState {
  return useSyncExternalStore(
    (listener) => player.subscribe(listener),
    () => player.getState(),
  );
}
