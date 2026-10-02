import { faFloppyDisk, faGear, faLink, faListUl, faPlus, faRoute } from '@fortawesome/free-solid-svg-icons';
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
import Switch from '@/elements/input/Switch.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
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
  configQueryKey,
  DEFAULT_PAGE,
  isValidPathPattern,
  MAX_CUSTOM_NAME_LENGTH,
  MAX_CUSTOM_PATH_LENGTH,
  type MenuMusicConfig,
  menuMusicConfigSchema,
  newCustomPageKey,
  PACKAGE_NAME,
  PAGES,
  type TrackConfig,
} from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';
import PageHeading from './PageHeading.tsx';
import TrackEditor from './TrackEditor.tsx';

const PAGE_ORDER: string[] = [DEFAULT_PAGE, ...PAGES];

// default first, built-in pages in their usual order, custom pages last in the order they were added
function sortTracks(tracks: TrackConfig[]): TrackConfig[] {
  const order = (page: string) => {
    const index = PAGE_ORDER.indexOf(page);
    return index === -1 ? PAGE_ORDER.length : index;
  };

  return [...tracks].sort((a, b) => order(a.page) - order(b.page));
}

const emptyConfig: MenuMusicConfig = {
  enabled: true,
  tracks: [{ page: DEFAULT_PAGE, name: '', path: '', mode: 'always', url: '', volume: 100 }],
  idleTimeoutSeconds: 60,
  fadeDurationMs: 1500,
  defaultVolume: 50,
};

export default function ConfigurationPage() {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const canReadAssets = useAdminCan('assets.read');
  const canUploadAssets = useAdminCan('assets.upload');

  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customPath, setCustomPath] = useState('');

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

  const addTrack = (page: string, name = '', path = '') => {
    const fallback = tracks.find((track) => track.page === DEFAULT_PAGE);
    form.setFieldValue(
      'tracks',
      sortTracks([
        ...tracks,
        { page, name, path, mode: fallback?.mode ?? 'always', url: '', volume: fallback?.volume ?? 100 },
      ]),
    );
  };

  const customValid =
    customName.trim().length > 0 &&
    customName.trim().length <= MAX_CUSTOM_NAME_LENGTH &&
    isValidPathPattern(customPath);

  const addCustomPage = () => {
    if (!customValid) return;

    addTrack(newCustomPageKey(), customName.trim(), customPath.trim());
    setCustomName('');
    setCustomPath('');
  };

  const removePage = (page: string) => {
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
        <Group justify='flex-end'>
          <Button
            type='submit'
            loading={loading}
            disabled={!settings.data}
            leftSection={<FontAwesomeIcon icon={faFloppyDisk} />}
          >
            {tExt('config.save', {})}
          </Button>
        </Group>

        <TitleCard title={tExt('config.general.title', {})} icon={<FontAwesomeIcon icon={faGear} />}>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <Switch
              label={tExt('config.general.enabled', {})}
              description={tExt('config.general.enabledDescription', {})}
              {...form.getInputProps('enabled', { type: 'checkbox' })}
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
              {/* two columns once the card itself is wide enough, whatever the window size */}
              <div className='@container'>
                <div className='grid grid-cols-1 @4xl:grid-cols-2 gap-4'>
                  {tracks.map((track, index) => (
                    <TrackEditor
                      key={track.page}
                      track={track}
                      errors={{
                        name: form.errors[`tracks.${index}.name`] as string | undefined,
                        path: form.errors[`tracks.${index}.path`] as string | undefined,
                        url: form.errors[`tracks.${index}.url`] as string | undefined,
                      }}
                      assetUrls={assetUrls}
                      canUpload={canUploadAssets}
                      onChange={(next) => form.setFieldValue(`tracks.${index}`, next)}
                      onRemove={() => removePage(track.page)}
                      onUploaded={() => assets.invalidate()}
                    />
                  ))}
                </div>
              </div>
            </Stack>
          </TitleCard>

          <Stack>
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
                    <Group justify='space-between' align='flex-start' wrap='nowrap'>
                      <PageHeading page={page} name='' path='' />
                      <Button
                        size='xs'
                        variant='light'
                        className='shrink-0'
                        leftSection={<FontAwesomeIcon icon={faPlus} />}
                        onClick={() => addTrack(page)}
                      >
                        {tExt('config.tracks.add', {})}
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
            </TitleCard>

            <TitleCard title={tExt('config.custom.title', {})} icon={<FontAwesomeIcon icon={faLink} />}>
              <Stack gap='sm'>
                <Text size='sm' c='dimmed'>
                  {tExt('config.custom.description', {})}
                </Text>
                <TextInput
                  label={tExt('config.custom.name', {})}
                  placeholder={tExt('config.custom.namePlaceholder', {})}
                  value={customName}
                  onChange={(e) => setCustomName(e.currentTarget.value)}
                  maxLength={MAX_CUSTOM_NAME_LENGTH}
                />
                <TextInput
                  label={tExt('config.custom.path', {})}
                  placeholder={tExt('config.custom.pathPlaceholder', {})}
                  value={customPath}
                  onChange={(e) => setCustomPath(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    // Enter adds the page instead of submitting the whole settings form
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomPage();
                    }
                  }}
                  maxLength={MAX_CUSTOM_PATH_LENGTH}
                  classNames={{ input: 'font-mono' }}
                />
                <Button
                  variant='light'
                  disabled={!customValid}
                  leftSection={<FontAwesomeIcon icon={faPlus} />}
                  onClick={addCustomPage}
                  className='w-fit!'
                >
                  {tExt('config.custom.add', {})}
                </Button>
              </Stack>
            </TitleCard>
          </Stack>
        </div>
      </Stack>
    </form>
  );
}
