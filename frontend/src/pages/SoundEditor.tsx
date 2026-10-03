import { faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Text } from '@mantine/core';
import Button from '@/elements/buttons/Button.tsx';
import Card from '@/elements/data-display/Card.tsx';
import NumberInput from '@/elements/input/NumberInput.tsx';
import Switch from '@/elements/input/Switch.tsx';
import TextInput from '@/elements/input/TextInput.tsx';
import Group from '@/elements/layout/Group.tsx';
import SegmentedControl from '@/elements/layout/SegmentedControl.tsx';
import Stack from '@/elements/layout/Stack.tsx';
import {
  checkboxStateSchema,
  MAX_SOUND_NAME_LENGTH,
  type SoundConfig,
  selectEventSchema,
  soundTriggerSchema,
} from '../lib/schemas.ts';
import { useExtTranslations } from '../translations.ts';
import AudioSourceFields from './AudioSourceFields.tsx';
import TargetPicker from './TargetPicker.tsx';

export type SoundErrors = Partial<Record<'name' | 'targets' | 'optionTargets' | 'path' | 'url' | 'fadeMs', string>>;

interface Props {
  sound: SoundConfig;
  errors: SoundErrors;
  defaultFadeMs: number;
  assetUrls: string[];
  canUpload: boolean;
  onChange: (sound: SoundConfig) => void;
  onRemove: () => void;
  onUploaded: () => void;
}

export default function SoundEditor({
  sound,
  errors,
  defaultFadeMs,
  assetUrls,
  canUpload,
  onChange,
  onRemove,
  onUploaded,
}: Props) {
  const { t: tExt } = useExtTranslations();
  const update = (change: Partial<SoundConfig>) => onChange({ ...sound, ...change });

  const targetsDescription =
    sound.trigger === 'button'
      ? tExt('config.sounds.targetsButton', {})
      : sound.trigger === 'checkbox'
        ? tExt('config.sounds.targetsCheckbox', {})
        : tExt('config.sounds.targetsSelect', {});

  return (
    <Card withBorder radius='md' p='md' className='@container h-full'>
      <Stack gap='sm'>
        <Group align='flex-start' gap='xs' wrap='nowrap'>
          <TextInput
            className='flex-1'
            label={tExt('config.sounds.name', {})}
            placeholder={tExt('config.sounds.namePlaceholder', {})}
            value={sound.name}
            onChange={(e) => update({ name: e.currentTarget.value })}
            error={errors.name}
            maxLength={MAX_SOUND_NAME_LENGTH}
          />
          <Button
            size='xs'
            variant='subtle'
            color='red'
            className='shrink-0 mt-6'
            leftSection={<FontAwesomeIcon icon={faTrash} />}
            onClick={onRemove}
          >
            {tExt('config.tracks.delete', {})}
          </Button>
        </Group>

        <Switch
          label={tExt('config.sounds.enabled', {})}
          checked={sound.enabled}
          onChange={(e) => update({ enabled: e.currentTarget.checked })}
        />

        <div>
          <Text size='sm' fw={500} mb={4}>
            {tExt('config.sounds.trigger', {})}
          </Text>
          <SegmentedControl
            fullWidth
            size='xs'
            value={sound.trigger}
            onChange={(trigger) => update({ trigger: trigger as SoundConfig['trigger'] })}
            data={soundTriggerSchema.options.map((trigger) => ({
              value: trigger,
              label: tExt(`config.sounds.triggers.${trigger}`, {}),
            }))}
          />
        </div>

        {sound.trigger === 'checkbox' && (
          <SegmentedControl
            fullWidth
            size='xs'
            value={sound.checkboxState}
            onChange={(state) => update({ checkboxState: state as SoundConfig['checkboxState'] })}
            data={checkboxStateSchema.options.map((state) => ({
              value: state,
              label: tExt(`config.sounds.checkboxStates.${state}`, {}),
            }))}
          />
        )}

        {sound.trigger === 'select' && (
          <SegmentedControl
            fullWidth
            size='xs'
            value={sound.selectEvent}
            onChange={(event) => update({ selectEvent: event as SoundConfig['selectEvent'] })}
            data={selectEventSchema.options.map((event) => ({
              value: event,
              label: tExt(`config.sounds.selectEvents.${event}`, {}),
            }))}
          />
        )}

        <TargetPicker
          label={tExt('config.sounds.targets', {})}
          description={targetsDescription}
          value={sound.targets}
          error={errors.targets}
          onChange={(targets) => update({ targets })}
        />

        {sound.trigger === 'select' && sound.selectEvent === 'selected' && (
          <TargetPicker
            label={tExt('config.sounds.optionTargets', {})}
            description={tExt('config.sounds.optionTargetsDescription', {})}
            value={sound.optionTargets}
            error={errors.optionTargets}
            onChange={(optionTargets) => update({ optionTargets })}
          />
        )}

        <TextInput
          label={tExt('config.sounds.path', {})}
          description={tExt('config.sounds.pathDescription', {})}
          placeholder={tExt('config.custom.pathPlaceholder', {})}
          value={sound.path}
          onChange={(e) => update({ path: e.currentTarget.value })}
          error={errors.path}
          maxLength={256}
          classNames={{ input: 'font-mono' }}
        />

        <AudioSourceFields
          url={sound.url}
          volume={sound.volume}
          urlError={errors.url}
          urlLabel={tExt('config.sounds.url', {})}
          urlDescription={tExt('config.sounds.urlDescription', {})}
          volumeLabel={tExt('config.sounds.volume', {})}
          assetUrls={assetUrls}
          canUpload={canUpload}
          previewMode='sound'
          soundFadeMs={sound.fadeMs ?? defaultFadeMs}
          onChange={(change) => update(change)}
          onUploaded={onUploaded}
        />

        <NumberInput
          label={tExt('config.sounds.fadeOverride', {})}
          description={tExt('config.sounds.fadeOverrideDescription', {})}
          placeholder={tExt('config.sounds.fadeDefault', { ms: defaultFadeMs })}
          value={sound.fadeMs ?? ''}
          onChange={(value) => update({ fadeMs: typeof value === 'number' ? value : null })}
          error={errors.fadeMs}
          min={0}
          max={30000}
          step={50}
          allowDecimal={false}
          allowNegative={false}
        />
      </Stack>
    </Card>
  );
}
