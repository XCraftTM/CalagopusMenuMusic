import { faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import { useLocation } from 'react-router';
import { resolveTrack } from '../lib/pages.ts';
import { player } from '../lib/player.ts';
import { useMenuMusicConfig } from '../lib/useMenuMusicConfig.ts';
import { useMusicPrefs } from '../lib/userPrefs.ts';
import { useExtTranslations } from '../translations.ts';

/**
 * On/off switch under the login form, the login page is only shown while logged out.
 * Turning it off fades the music out and pauses it, turning it on resumes where it stopped.
 * The choice is remembered on this device (and becomes the account setting after logging in
 * until the user picks one on their account page).
 *
 * Built from a span and a button on purpose: login themes commonly restyle every `div` inside the
 * auth column (e.g. qunix_theme forces them into stretched columns) and every `label` (forced to
 * `display: block`), which pushed a regular Mantine Switch to the side and its text onto a new line.
 * Colors come from the Mantine theme variables so it still follows the active theme.
 */
export default function LoginMusicToggle() {
  const { t: tExt } = useExtTranslations();
  const { pathname } = useLocation();
  const { data: config } = useMenuMusicConfig();
  const { muted, setMuted } = useMusicPrefs(config?.defaultVolume ?? 50);

  const track = config ? resolveTrack(config, pathname) : null;
  if (!config?.enabled || !track?.url || track.mode === 'off') return null;

  const on = !muted;

  return (
    <span className='mt-4 flex w-full flex-row items-center justify-center'>
      <button
        type='button'
        role='switch'
        aria-checked={on}
        // keep focus where it is: taking it from the (autofocused) username field makes the login form
        // validate and show an error above, which shifts this button away between press and release
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setMuted(on);
          // still inside the click, so the browser lets the audio start
          if (!on) player.resume();
        }}
        className='inline-flex cursor-pointer select-none flex-row items-center gap-2 rounded-md border-0 bg-transparent p-1 text-sm text-(--mantine-color-text) focus-visible:outline-2 focus-visible:outline-(--mantine-primary-color-filled)'
      >
        <span
          aria-hidden='true'
          className='relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors duration-150'
          style={{
            backgroundColor: on ? 'var(--mantine-primary-color-filled)' : 'var(--mantine-color-default-border)',
          }}
        >
          <span
            className={classNames(
              'absolute top-0.5 left-0.5 inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150',
              on && 'translate-x-4',
            )}
          />
        </span>
        <FontAwesomeIcon icon={faMusic} />
        <span>{tExt('login.toggle', {})}</span>
      </button>
    </span>
  );
}
