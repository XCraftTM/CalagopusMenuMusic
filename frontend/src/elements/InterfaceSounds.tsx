import { useEffect, useRef } from 'react';
import { watchInteractions } from '../lib/interactions.ts';
import { sfx } from '../lib/sfx.ts';
import { findSound } from '../lib/soundMatch.ts';
import { useMenuMusicConfig } from '../lib/useMenuMusicConfig.ts';
import { useMusicPrefs } from '../lib/userPrefs.ts';

/**
 * Mounted once on every page: plays the configured interface sound when a button is pressed,
 * a checkbox/switch is toggled or a select menu is used.
 */
export default function InterfaceSounds() {
  const { data: config } = useMenuMusicConfig();
  const { volume, soundsMuted } = useMusicPrefs(config?.defaultVolume ?? 50);

  // the listeners are installed once, they read the latest values from here
  const latest = useRef({ config, volume, soundsMuted });
  latest.current = { config, volume, soundsMuted };

  useEffect(() => {
    if (!config?.enabled) return;
    sfx.preload(config.sounds.filter((sound) => sound.enabled && sound.url).map((sound) => sound.url));
  }, [config?.enabled, config?.sounds]);

  useEffect(
    () =>
      watchInteractions((interaction) => {
        const { config, volume, soundsMuted } = latest.current;
        if (!config?.enabled || soundsMuted || config.sounds.length === 0) return;

        // the interaction happens before any navigation it causes, so this is the page it happened on
        const sound = findSound(config.sounds, interaction, window.location.pathname);
        if (!sound) return;

        sfx.play(sound.url, (sound.volume / 100) * (volume / 100), sound.fadeMs ?? config.soundFadeMs);
      }),
    [],
  );

  return null;
}
