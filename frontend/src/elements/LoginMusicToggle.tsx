import { faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useLocation } from 'react-router';
import Switch from '@/elements/input/Switch.tsx';
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
 */
export default function LoginMusicToggle() {
  const { t: tExt } = useExtTranslations();
  const { pathname } = useLocation();
  const { data: config } = useMenuMusicConfig();
  const { muted, setMuted } = useMusicPrefs(config?.defaultVolume ?? 50);

  const track = config ? resolveTrack(config, pathname) : null;
  if (!config?.enabled || !track?.url || track.mode === 'off') return null;

  return (
    <div className='mt-4 flex justify-center'>
      <Switch
        size='sm'
        checked={!muted}
        onChange={(e) => {
          setMuted(!e.currentTarget.checked);
          // still inside the click, so the browser lets the audio start
          if (e.currentTarget.checked) player.resume();
        }}
        label={
          <span className='inline-flex items-center gap-2'>
            <FontAwesomeIcon icon={faMusic} />
            {tExt('login.toggle', {})}
          </span>
        }
      />
    </div>
  );
}
