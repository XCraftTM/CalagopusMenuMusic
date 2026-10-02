import { defineTranslations } from 'shared';

const translations = defineTranslations({
  items: {},
  translations: {
    pages: {
      default: 'Default',
      login: 'Login',
      register: 'Register',
      password_reset: 'Password Reset & Email Verification',
      server_list: 'Server List',
      account: 'Account Settings',
      server: 'Server Pages',
      admin: 'Admin Area',
    },
    pageDescriptions: {
      default: 'Plays on every page that has no track of its own.',
      login: 'The login screen, including two-factor and OAuth steps.',
      register: 'The account registration screen.',
      password_reset: 'Forgot password, reset password and email verification screens.',
      server_list: 'The dashboard listing all servers.',
      account: 'Account settings, API keys, SSH keys, sessions and activity.',
      server: 'Every page of a server: console, files, settings, allocations, backups and more.',
      admin: 'The whole admin area, including themes and extension settings.',
    },
    playModes: {
      always: 'Always play',
      idle: 'Play when idle',
      off: 'Silent',
    },
    account: {
      title: 'Menu Music',
      enabled: 'Play menu music',
      enabledDescription: 'Background music that changes depending on the page you are on.',
      volume: 'Volume',
      disabledByAdmin: 'Menu music has been turned off by an administrator.',
    },
    config: {
      general: {
        title: 'General',
        enabled: 'Enable menu music',
        enabledDescription: 'Master switch for the whole extension. When off, no page plays music.',
        idleTimeout: 'Idle delay (seconds)',
        idleTimeoutDescription: 'How long a user has to be inactive before tracks set to "Play when idle" start.',
        fadeDuration: 'Crossfade duration (ms)',
        fadeDurationDescription:
          'When you switch to a page with a different track, the old track fades out while the new one fades in over this time. Also used when music starts or stops.',
        defaultVolume: 'Default user volume',
        defaultVolumeDescription: 'Volume users start with until they pick their own on the account page.',
      },
      tracks: {
        configured: 'Configured',
        configuredDescription:
          'The Default track plays on every page without its own entry. Each entry here plays its own track instead.',
        available: 'Using Default Track',
        availableDescription: 'These pages play the Default track. Add one to give it its own track.',
        allConfigured: 'Every page has its own track.',
        add: 'Add',
        remove: 'Use default',
        mode: 'Playback',
        url: 'Track URL',
        urlPlaceholder: 'https://example.com/music/theme.mp3',
        urlDescription: 'Link to an audio file (mp3, ogg, wav, ...). Leave empty for silence.',
        volume: 'Track volume',
        upload: 'Upload',
        preview: 'Preview',
        stopPreview: 'Stop',
      },
      save: 'Save',
      saved: 'Menu music settings saved.',
      uploaded: 'Uploaded {name}.',
    },
  },
});

export const useExtTranslations = translations.useTranslations.bind(translations);
export const getExtTranslations = translations.getTranslations.bind(translations);

export default translations;
