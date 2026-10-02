import { faPlay, faRotateLeft, faStop, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileButton, Slider, Text } from '@mantine/core';
import { useState } from 'react';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import Card from '@/elements/data-display/Card.tsx';
import Autocomplete from '@/elements/input/Autocomplete.tsx';
import Group from '@/elements/layout/Group.tsx';
import SegmentedControl from '@/elements/layout/SegmentedControl.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import uploadTrack from '../api/uploadTrack.ts';
import { setPreview, usePreview } from '../lib/preview.ts';
import { DEFAULT_PAGE, type PlayMode, playModeSchema, type TrackConfig } from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';

interface Props {
  track: TrackConfig;
  urlError?: string;
  assetUrls: string[];
  canUpload: boolean;
  onChange: (track: TrackConfig) => void;
  onRemove: () => void;
  onUploaded: () => void;
}

export default function TrackEditor({ track, urlError, assetUrls, canUpload, onChange, onRemove, onUploaded }: Props) {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const preview = usePreview();

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const isDefault = track.page === DEFAULT_PAGE;
  const previewing = preview !== null && preview.url === track.url;

  const doUpload = (file: File | null) => {
    if (!file) return;

    setUploadProgress(0);
    uploadTrack(file, setUploadProgress)
      .then((url) => {
        onChange({ ...track, url });
        onUploaded();
        addToast(tExt('config.uploaded', { name: file.name }), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setUploadProgress(null));
  };

  const togglePreview = () => {
    setPreview(previewing || !track.url ? null : { url: track.url, volume: track.volume / 100 });
  };

  return (
    <Card withBorder radius='md' p='md'>
      <Stack gap='sm'>
        <Group justify='space-between' align='flex-start' wrap='nowrap'>
          <div>
            <Text fw={600}>{tExt(`pages.${track.page}`, {})}</Text>
            <Text size='xs' c='dimmed'>
              {tExt(`pageDescriptions.${track.page}`, {})}
            </Text>
          </div>
          {!isDefault && (
            <Button
              size='xs'
              variant='subtle'
              color='gray'
              leftSection={<FontAwesomeIcon icon={faRotateLeft} />}
              onClick={onRemove}
            >
              {tExt('config.tracks.remove', {})}
            </Button>
          )}
        </Group>

        <SegmentedControl
          fullWidth
          size='xs'
          value={track.mode}
          onChange={(mode) => onChange({ ...track, mode: mode as PlayMode })}
          data={playModeSchema.options.map((mode) => ({ value: mode, label: tExt(`playModes.${mode}`, {}) }))}
        />

        {track.mode !== 'off' && (
          <>
            <Group align='flex-end' gap='xs' wrap='nowrap'>
              <Autocomplete
                className='flex-1'
                label={tExt('config.tracks.url', {})}
                placeholder={tExt('config.tracks.urlPlaceholder', {})}
                description={tExt('config.tracks.urlDescription', {})}
                data={assetUrls}
                value={track.url}
                onChange={(url) => onChange({ ...track, url })}
                error={urlError}
                limit={50}
                maxDropdownHeight={240}
              />
              {canUpload && (
                <FileButton onChange={doUpload} accept='audio/*'>
                  {(props) => (
                    <Button
                      {...props}
                      variant='default'
                      loading={uploadProgress !== null}
                      leftSection={<FontAwesomeIcon icon={faUpload} />}
                    >
                      {tExt('config.tracks.upload', {})}
                    </Button>
                  )}
                </FileButton>
              )}
              <Button
                variant='default'
                disabled={!track.url}
                onClick={togglePreview}
                leftSection={<FontAwesomeIcon icon={previewing ? faStop : faPlay} />}
              >
                {previewing ? tExt('config.tracks.stopPreview', {}) : tExt('config.tracks.preview', {})}
              </Button>
            </Group>

            <div>
              <Text size='sm' fw={500} mb={4}>
                {tExt('config.tracks.volume', {})}
              </Text>
              <Slider
                value={track.volume}
                onChange={(volume) => {
                  onChange({ ...track, volume });
                  if (previewing) setPreview({ url: track.url, volume: volume / 100 });
                }}
                min={0}
                max={100}
                step={1}
                label={(value) => `${value}%`}
              />
            </div>
          </>
        )}
      </Stack>
    </Card>
  );
}
