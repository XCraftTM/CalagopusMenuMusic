import { faRotateLeft, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Button from '@/elements/buttons/Button.tsx';
import Card from '@/elements/data-display/Card.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Group from '@/elements/layout/Group.tsx';
import SegmentedControl from '@/elements/layout/SegmentedControl.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import { DEFAULT_PAGE, isCustomPage, type PlayMode, playModeSchema, type TrackConfig } from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';
import AudioSourceFields from './AudioSourceFields.tsx';
import PageHeading from './PageHeading.tsx';

interface Props {
  track: TrackConfig;
  errors: Partial<Record<'name' | 'path' | 'url', string>>;
  assetUrls: string[];
  canUpload: boolean;
  onChange: (track: TrackConfig) => void;
  onRemove: () => void;
  onUploaded: () => void;
}

export default function TrackEditor({ track, errors, assetUrls, canUpload, onChange, onRemove, onUploaded }: Props) {
  const { t: tExt } = useExtTranslations();
  const isDefault = track.page === DEFAULT_PAGE;
  const isCustom = isCustomPage(track.page);

  return (
    <Card withBorder radius='md' p='md' className='@container h-full'>
      <Stack gap='sm'>
        <Group justify='space-between' align='flex-start' wrap='nowrap'>
          <PageHeading page={track.page} name={track.name} path={track.path} />
          {!isDefault && (
            <Button
              size='xs'
              variant='subtle'
              color={isCustom ? 'red' : 'gray'}
              className='shrink-0'
              leftSection={<FontAwesomeIcon icon={isCustom ? faTrash : faRotateLeft} />}
              onClick={onRemove}
            >
              {isCustom ? tExt('config.tracks.delete', {}) : tExt('config.tracks.remove', {})}
            </Button>
          )}
        </Group>

        {isCustom && (
          <div className='grid grid-cols-1 @lg:grid-cols-2 gap-2'>
            <TextInput
              label={tExt('config.custom.name', {})}
              placeholder={tExt('config.custom.namePlaceholder', {})}
              value={track.name}
              onChange={(e) => onChange({ ...track, name: e.currentTarget.value })}
              error={errors.name}
              maxLength={64}
            />
            <TextInput
              label={tExt('config.custom.path', {})}
              placeholder={tExt('config.custom.pathPlaceholder', {})}
              value={track.path}
              onChange={(e) => onChange({ ...track, path: e.currentTarget.value })}
              error={errors.path}
              maxLength={256}
              classNames={{ input: 'font-mono' }}
            />
          </div>
        )}

        <SegmentedControl
          fullWidth
          size='xs'
          value={track.mode}
          onChange={(mode) => onChange({ ...track, mode: mode as PlayMode })}
          data={playModeSchema.options.map((mode) => ({ value: mode, label: tExt(`playModes.${mode}`, {}) }))}
        />

        {track.mode !== 'off' && (
          <AudioSourceFields
            url={track.url}
            volume={track.volume}
            urlError={errors.url}
            urlLabel={tExt('config.tracks.url', {})}
            urlDescription={tExt('config.tracks.urlDescription', {})}
            volumeLabel={tExt('config.tracks.volume', {})}
            assetUrls={assetUrls}
            canUpload={canUpload}
            previewMode='music'
            onChange={(change) => onChange({ ...track, ...change })}
            onUploaded={onUploaded}
          />
        )}
      </Stack>
    </Card>
  );
}
