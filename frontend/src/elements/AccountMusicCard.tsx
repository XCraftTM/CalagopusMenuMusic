import { faMusic } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Slider, Text } from '@mantine/core';
import classNames from 'classnames';
import { useEffect, useState } from 'react';
import TitleCard from '@/elements/data-display/TitleCard.tsx';
import Switch from '@/elements/input/Switch.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import type { AccountCardProps } from '@/pages/dashboard/account/DashboardAccount.tsx';
import { player } from '../lib/player.ts';
import { useMenuMusicConfig } from '../lib/useMenuMusicConfig.ts';
import { useMusicPrefs } from '../lib/userPrefs.ts';
import { useExtTranslations } from '../translations.ts';

/** "Menu Music" card on the account page, lets every user turn the music off or change its volume. */
export default function AccountMusicCard({ requireTwoFactorActivation }: AccountCardProps) {
  const { t: tExt } = useExtTranslations();
  const { data: config } = useMenuMusicConfig();
  const { muted, volume, setMuted, setVolume } = useMusicPrefs(config?.defaultVolume ?? 50);

  // only sync the slider once it is released, the setting is persisted to the account
  const [sliderVolume, setSliderVolume] = useState(volume);
  useEffect(() => setSliderVolume(volume), [volume]);

  if (!config) return null;

  return (
    <TitleCard
      title={tExt('account.title', {})}
      icon={<FontAwesomeIcon icon={faMusic} />}
      className={classNames('h-full order-56', requireTwoFactorActivation && 'blur-xs pointer-events-none select-none')}
    >
      <Stack>
        {config.enabled ? (
          <>
            <Switch
              label={tExt('account.enabled', {})}
              description={tExt('account.enabledDescription', {})}
              checked={!muted}
              onChange={(e) => {
                setMuted(!e.target.checked);
                if (e.target.checked) player.resume();
              }}
            />
            <div>
              <Text size='sm' fw={500} mb={4}>
                {tExt('account.volume', {})}
              </Text>
              <Slider
                value={sliderVolume}
                onChange={setSliderVolume}
                onChangeEnd={setVolume}
                min={0}
                max={100}
                step={1}
                label={(value) => `${value}%`}
                disabled={muted}
              />
            </div>
          </>
        ) : (
          <Text size='sm' c='dimmed'>
            {tExt('account.disabledByAdmin', {})}
          </Text>
        )}
      </Stack>
    </TitleCard>
  );
}
