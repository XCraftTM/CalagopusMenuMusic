import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { resolveTrack } from '../lib/pages.ts';
import { player } from '../lib/player.ts';
import { usePreview } from '../lib/preview.ts';
import { useIdle } from '../lib/useIdle.ts';
import { useMenuMusicConfig } from '../lib/useMenuMusicConfig.ts';
import { useMusicPrefs } from '../lib/userPrefs.ts';

/**
 * Mounted once on every page of the panel (including login and register),
 * decides which track should be heard and hands that to the shared player,
 * which crossfades between tracks when the page changes.
 */
export default function MenuMusic() {
  const { pathname } = useLocation();
  const { data: config } = useMenuMusicConfig();
  const preview = usePreview();

  const track = config ? resolveTrack(config, pathname) : null;
  const playable = Boolean(config?.enabled && track && track.url && track.mode !== 'off');

  const { muted, volume } = useMusicPrefs(config?.defaultVolume ?? 50);
  const idle = useIdle(playable && track?.mode === 'idle' && config ? config.idleTimeoutSeconds * 1000 : null);

  useEffect(() => {
    player.setFadeDuration(config?.fadeDurationMs ?? 1500);
  }, [config?.fadeDurationMs]);

  useEffect(() => {
    if (preview) {
      player.setTarget(preview.url, preview.volume);
      return;
    }

    const shouldPlay = playable && !muted && (track?.mode === 'always' || idle);
    player.setTarget(shouldPlay && track ? track.url : null, ((track?.volume ?? 100) / 100) * (volume / 100));
  }, [preview, playable, muted, idle, track?.mode, track?.url, track?.volume, volume]);

  useEffect(() => () => player.stop(), []);

  return null;
}
