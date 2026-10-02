import { faGear, faListUl, faPlus, faRoute } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useQueryClient } from '@tanstack/react-query';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { useEffect, useMemo, useState } from 'react';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import Card from '@/elements/data-display/Card.tsx';
import TitleCard from '@/elements/data-display/TitleCard.tsx';
import NumberInput from '@/elements/input/NumberInput.tsx';
import Select from '@/elements/input/Select.tsx';
import Switch from '@/elements/input/Switch.tsx';
import Group from '@/elements/layout/Group.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import { useResource } from '@/plugins/resource/useResource.ts';
import { useAdminCan } from '@/plugins/usePermissions.ts';
import { useToast } from '@/providers/ToastProvider.tsx';
import getAudioAssets from '../api/getAudioAssets.ts';
import getSettings from '../api/getSettings.ts';
import updateSettings from '../api/updateSettings.ts';
import { setPreview } from '../lib/preview.ts';
import {
  buttonPositionSchema,
  configQueryKey,
  DEFAULT_PAGE,
  type MenuMusicConfig,
  menuMusicConfigSchema,
  PACKAGE_NAME,
  PAGES,
  type PageKey,
  type TrackConfig,
} from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';
import TrackEditor from './TrackEditor.tsx';

const PAGE_ORDER: PageKey[] = [DEFAULT_PAGE, ...PAGES];

function sortTracks(tracks: TrackConfig[]): TrackConfig[] {
  return [...tracks].sort((a, b) => PAGE_ORDER.indexOf(a.page) - PAGE_ORDER.indexOf(b.page));
}

const emptyConfig: MenuMusicConfig = {
  enabled: true,
  tracks: [{ page: DEFAULT_PAGE, mode: 'always', url: '', volume: 100 }],
  idleTimeoutSeconds: 60,
  fadeDurationMs: 1500,
  defaultVolume: 50,
  showFloatingButton: true,
  floatingButtonPosition: 'bottom_left',
};

export default function ConfigurationPage() {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const canReadAssets = useAdminCan('assets.read');
  const canUploadAssets = useAdminCan('assets.upload');

  const [loading, setLoading] = useState(false);

  const form = useForm<MenuMusicConfig>({
    initialValues: emptyConfig,
    validateInputOnBlur: true,
    validate: zod4Resolver(menuMusicConfigSchema),
  });

  const settings = useResource({
    queryKey: ['extensions', PACKAGE_NAME, 'admin', 'settings'],
    queryFn: getSettings,
  });

  const assets = useResource({
    queryKey: ['extensions', PACKAGE_NAME, 'admin', 'assets'],
    queryFn: getAudioAssets,
    enabled: canReadAssets,
    silent: true,
  });
  const assetUrls = useMemo(() => (assets.data ?? []).map((asset) => asset.url), [assets.data]);

  useEffect(() => {
    if (settings.data) {
      form.setValues({ ...settings.data, tracks: sortTracks(settings.data.tracks) });
      form.resetDirty();
    }
  }, [settings.data]);

  // never leave a preview playing after leaving the page
  useEffect(() => () => setPreview(null), []);

  const tracks = form.values.tracks;
  const unconfiguredPages = PAGES.filter((page) => !tracks.some((track) => track.page === page));

  const addPage = (page: PageKey) => {
    const fallback = tracks.find((track) => track.page === DEFAULT_PAGE);
    form.setFieldValue(
      'tracks',
      sortTracks([...tracks, { page, mode: fallback?.mode ?? 'always', url: '', volume: fallback?.volume ?? 100 }]),
    );
  };

  const removePage = (page: PageKey) => {
    form.setFieldValue(
      'tracks',
      tracks.filter((track) => track.page !== page),
    );
  };

  const doSave = () => {
    setLoading(true);

    updateSettings(form.values)
      .then((saved) => {
        form.setValues({ ...saved, tracks: sortTracks(saved.tracks) });
        form.resetDirty();
        // the global player picks up the new tracks right away
        queryClient.setQueryData(configQueryKey, saved);
        addToast(tExt('config.saved', {}), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setLoading(false));
  };

  return (
    <form onSubmit={form.onSubmit(doSave)}>
      <Stack>
        <TitleCard title={tExt('config.general.title', {})} icon={<FontAwesomeIcon icon={faGear} />}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Switch
              label={tExt('config.general.enabled', {})}
              description={tExt('config.general.enabledDescription', {})}
              {...form.getInputProps('enabled', { type: 'checkbox' })}
            />
            <Switch
              label={tExt('config.general.showFloatingButton', {})}
              description={tExt('config.general.showFloatingButtonDescription', {})}
              {...form.getInputProps('showFloatingButton', { type: 'checkbox' })}
            />
            <NumberInput
              label={tExt('config.general.idleTimeout', {})}
              description={tExt('config.general.idleTimeoutDescription', {})}
              min={1}
              max={86400}
              allowDecimal={false}
              {...form.getInputProps('idleTimeoutSeconds')}
            />
            <NumberInput
              label={tExt('config.general.fadeDuration', {})}
              description={tExt('config.general.fadeDurationDescription', {})}
              min={0}
              max={30000}
              step={100}
              allowDecimal={false}
              {...form.getInputProps('fadeDurationMs')}
            />
            <NumberInput
              label={tExt('config.general.defaultVolume', {})}
              description={tExt('config.general.defaultVolumeDescription', {})}
              min={0}
              max={100}
              suffix='%'
              allowDecimal={false}
              {...form.getInputProps('defaultVolume')}
            />
            <Select
              label={tExt('config.general.floatingButtonPosition', {})}
              data={buttonPositionSchema.options.map((position) => ({
                value: position,
                label: tExt(`buttonPositions.${position}`, {}),
              }))}
              disabled={!form.values.showFloatingButton}
              {...form.getInputProps('floatingButtonPosition')}
            />
          </div>
        </TitleCard>

        <div className='grid grid-cols-1 xl:grid-cols-3 gap-4 items-start'>
          <TitleCard
            className='xl:col-span-2'
            title={tExt('config.tracks.configured', {})}
            icon={<FontAwesomeIcon icon={faListUl} />}
          >
            <Stack>
              <Text size='sm' c='dimmed'>
                {tExt('config.tracks.configuredDescription', {})}
              </Text>
              {tracks.map((track, index) => (
                <TrackEditor
                  key={track.page}
                  track={track}
                  urlError={form.errors[`tracks.${index}.url`] as string | undefined}
                  assetUrls={assetUrls}
                  canUpload={canUploadAssets}
                  onChange={(next) => form.setFieldValue(`tracks.${index}`, next)}
                  onRemove={() => removePage(track.page)}
                  onUploaded={() => assets.invalidate()}
                />
              ))}
            </Stack>
          </TitleCard>

          <TitleCard title={tExt('config.tracks.available', {})} icon={<FontAwesomeIcon icon={faRoute} />}>
            <Stack gap='sm'>
              <Text size='sm' c='dimmed'>
                {tExt('config.tracks.availableDescription', {})}
              </Text>
              {unconfiguredPages.length === 0 && (
                <Text size='sm' fs='italic'>
                  {tExt('config.tracks.allConfigured', {})}
                </Text>
              )}
              {unconfiguredPages.map((page) => (
                <Card key={page} withBorder radius='md' p='sm'>
                  <Group justify='space-between' wrap='nowrap'>
                    <div>
                      <Text fw={600} size='sm'>
                        {tExt(`pages.${page}`, {})}
                      </Text>
                      <Text size='xs' c='dimmed'>
                        {tExt(`pageDescriptions.${page}`, {})}
                      </Text>
                    </div>
                    <Button
                      size='xs'
                      variant='light'
                      leftSection={<FontAwesomeIcon icon={faPlus} />}
                      onClick={() => addPage(page)}
                    >
                      {tExt('config.tracks.add', {})}
                    </Button>
                  </Group>
                </Card>
              ))}
            </Stack>
          </TitleCard>
        </div>

        <Group>
          <Button type='submit' loading={loading} disabled={!settings.data}>
            {tExt('config.save', {})}
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
