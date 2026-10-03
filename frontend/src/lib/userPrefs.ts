import { useCallback } from 'react';
import { z } from 'zod';
import { setUserSetting, useUserSetting } from '@/lib/userSettings.ts';
import { PACKAGE_NAME } from './schemas.ts';

export const MUTED_KEY = `${PACKAGE_NAME}::muted`;
export const VOLUME_KEY = `${PACKAGE_NAME}::volume`;
export const SOUNDS_MUTED_KEY = `${PACKAGE_NAME}::sounds_muted`;

// user settings only exist while logged in, this mirror keeps the choice on the login page too
const LOCAL_MIRROR_KEY = `${PACKAGE_NAME}::prefs`;

const mutedSchema = z.boolean();
const volumeSchema = z.number().int().min(0).max(100);

const localMirrorSchema = z.object({
  muted: mutedSchema.optional(),
  volume: volumeSchema.optional(),
  soundsMuted: mutedSchema.optional(),
});

function readLocalMirror(): z.infer<typeof localMirrorSchema> {
  try {
    const parsed = localMirrorSchema.safeParse(JSON.parse(localStorage.getItem(LOCAL_MIRROR_KEY) ?? '{}'));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

function writeLocalMirror(value: z.infer<typeof localMirrorSchema>) {
  try {
    localStorage.setItem(LOCAL_MIRROR_KEY, JSON.stringify({ ...readLocalMirror(), ...value }));
  } catch {
    // storage can be unavailable (private mode, quota), the synced setting still applies
  }
}

/** Per-user music and interface sound switches and volume (0-100), synced to the account and mirrored locally. */
export function useMusicPrefs(defaultVolume: number) {
  const mirror = readLocalMirror();

  const [muted] = useUserSetting(MUTED_KEY, mutedSchema, mirror.muted ?? false);
  const [volume] = useUserSetting(VOLUME_KEY, volumeSchema, mirror.volume ?? defaultVolume);
  const [soundsMuted] = useUserSetting(SOUNDS_MUTED_KEY, mutedSchema, mirror.soundsMuted ?? false);

  const setMuted = useCallback((value: boolean) => {
    writeLocalMirror({ muted: value });
    setUserSetting(MUTED_KEY, value);
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.round(Math.min(100, Math.max(0, value)));
    writeLocalMirror({ volume: clamped });
    setUserSetting(VOLUME_KEY, clamped);
  }, []);

  const setSoundsMuted = useCallback((value: boolean) => {
    writeLocalMirror({ soundsMuted: value });
    setUserSetting(SOUNDS_MUTED_KEY, value);
  }, []);

  return { muted, volume, soundsMuted, setMuted, setVolume, setSoundsMuted };
}
