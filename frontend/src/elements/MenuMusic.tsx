import { faMusic, faVolumeHigh, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { useEffect } from 'react';
import { useLocation } from 'react-router';
import ActionIcon from '@/elements/buttons/ActionIcon.tsx';
import Tooltip from '@/elements/overlays/Tooltip.tsx';
import { pageFromPath, resolveTrack } from '../lib/pages.ts';
import { player } from '../lib/player.ts';
import { usePreview } from '../lib/preview.ts';
import type { ButtonPosition } from '../lib/schemas.ts';
import { useIdle } from '../lib/useIdle.ts';
import { useMenuMusicConfig } from '../lib/useMenuMusicConfig.ts';
import { usePlayerState } from '../lib/usePlayerState.ts';
import { useMusicPrefs } from '../lib/userPrefs.ts';
import { useExtTranslations } from '../translations.ts';

const POSITION_CLASSES: Record<ButtonPosition, string> = {
  top_left: 'top-4 left-4',
  top_right: 'top-4 right-4',
  bottom_left: 'bottom-4 left-4',
  bottom_right: 'bottom-4 right-4',
};

/**
 * Mounted once on every page of the panel (including login and register),
 * decides which track should be heard and hands that to the shared player.
 */
export default function MenuMusic() {
  const { pathname } = useLocation();
  const { data: config } = useMenuMusicConfig();
  const preview = usePreview();

  const track = config ? resolveTrack(config, pageFromPath(pathname)) : null;
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

  if (!config?.enabled || !config.showFloatingButton || !playable) {
    return null;
  }

  return <FloatingButton position={config.floatingButtonPosition} defaultVolume={config.defaultVolume} />;
}

function FloatingButton({ position, defaultVolume }: { position: ButtonPosition; defaultVolume: number }) {
  const { t: tExt } = useExtTranslations();
  const { muted, setMuted } = useMusicPrefs(defaultVolume);
  const { blocked, playing } = usePlayerState();

  const onClick = () => {
    if (muted) {
      setMuted(false);
      // still inside the click, so the browser lets the audio start
      player.resume();
    } else if (blocked) {
      player.resume();
    } else {
      setMuted(true);
    }
  };

  const label = muted ? tExt('player.play', {}) : blocked ? tExt('player.blocked', {}) : tExt('player.mute', {});

  return (
    <div className={classNames('fixed z-[400]', POSITION_CLASSES[position])}>
      <Tooltip label={label} position={position.startsWith('top') ? 'bottom' : 'top'} withArrow>
        <ActionIcon
          size='lg'
          radius='xl'
          variant={muted || !playing ? 'default' : 'filled'}
          aria-label={label}
          onClick={onClick}
          className={classNames('shadow-md', blocked && !muted && 'animate-pulse')}
        >
          <FontAwesomeIcon icon={muted ? faVolumeXmark : blocked ? faMusic : faVolumeHigh} />
        </ActionIcon>
      </Tooltip>
    </div>
  );
}
