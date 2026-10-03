import { faPlay, faStop, faUpload } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FileButton, Slider, Text } from '@mantine/core';
import { useState } from 'react';
import { httpErrorToHuman } from '@/api/axios.ts';
import Button from '@/elements/buttons/Button.tsx';
import Autocomplete from '@/elements/input/Autocomplete.tsx';
import Group from '@/elements/layout/Group.tsx';
import { useToast } from '@/providers/ToastProvider.tsx';
import uploadTrack from '../api/uploadTrack.ts';
import { setPreview, usePreview } from '../lib/preview.ts';
import { sfx } from '../lib/sfx.ts';
import { useExtTranslations } from '../translations.ts';

interface Props {
  url: string;
  volume: number;
  urlError?: string;
  urlLabel: string;
  urlDescription: string;
  volumeLabel: string;
  assetUrls: string[];
  canUpload: boolean;
  /**
   * `music` previews loop through the music player until stopped,
   * `sound` previews play once through the interface sound player (ducking any music).
   */
  previewMode: 'music' | 'sound';
  /** Fade used by `sound` previews. */
  soundFadeMs?: number;
  onChange: (change: { url?: string; volume?: number }) => void;
  onUploaded: () => void;
}

/** Audio URL (asset autocomplete, upload, preview) and volume, shared by page tracks and interface sounds. */
export default function AudioSourceFields({
  url,
  volume,
  urlError,
  urlLabel,
  urlDescription,
  volumeLabel,
  assetUrls,
  canUpload,
  previewMode,
  soundFadeMs = 250,
  onChange,
  onUploaded,
}: Props) {
  const { t: tExt } = useExtTranslations();
  const { addToast } = useToast();
  const preview = usePreview();

  const [uploading, setUploading] = useState(false);

  const previewing = previewMode === 'music' && preview !== null && preview.url === url;

  const doUpload = (file: File | null) => {
    if (!file) return;

    setUploading(true);
    uploadTrack(file)
      .then((uploadedUrl) => {
        onChange({ url: uploadedUrl });
        onUploaded();
        addToast(tExt('config.uploaded', { name: file.name }), 'success');
      })
      .catch((err) => addToast(httpErrorToHuman(err), 'error'))
      .finally(() => setUploading(false));
  };

  const doPreview = () => {
    if (previewMode === 'sound') {
      if (url) sfx.play(url, volume / 100, soundFadeMs);
      return;
    }
    setPreview(previewing || !url ? null : { url, volume: volume / 100 });
  };

  return (
    <>
      <Group align='flex-end' gap='xs'>
        <Autocomplete
          className='flex-1 min-w-56'
          label={urlLabel}
          placeholder={tExt('config.tracks.urlPlaceholder', {})}
          description={urlDescription}
          data={assetUrls}
          value={url}
          onChange={(next) => onChange({ url: next })}
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
                loading={uploading}
                leftSection={<FontAwesomeIcon icon={faUpload} />}
              >
                {tExt('config.tracks.upload', {})}
              </Button>
            )}
          </FileButton>
        )}
        <Button
          variant='default'
          disabled={!url}
          onClick={doPreview}
          leftSection={<FontAwesomeIcon icon={previewing ? faStop : faPlay} />}
        >
          {previewing ? tExt('config.tracks.stopPreview', {}) : tExt('config.tracks.preview', {})}
        </Button>
      </Group>

      <div>
        <Text size='sm' fw={500} mb={4}>
          {volumeLabel}
        </Text>
        <Slider
          value={volume}
          onChange={(next) => {
            onChange({ volume: next });
            if (previewing) setPreview({ url, volume: next / 100 });
          }}
          min={0}
          max={100}
          step={1}
          label={(value) => `${value}%`}
        />
      </div>
    </>
  );
}
