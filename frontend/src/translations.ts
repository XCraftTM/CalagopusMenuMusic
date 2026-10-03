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
    login: {
      toggle: 'Menu music',
    },
    account: {
      title: 'Menu Music',
      enabled: 'Play menu music',
      enabledDescription: 'Background music that changes depending on the page you are on.',
      sounds: 'Play interface sounds',
      soundsDescription: 'Short sounds when you press buttons, toggle switches or use select menus.',
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
          'When you switch to a page with a different track, the old track fades out while the new one fades in over this time. A track that reaches its end also crossfades into its own beginning, and music fades in and out over this time when it starts or stops.',
        defaultVolume: 'Default user volume',
        defaultVolumeDescription: 'Volume users start with until they pick their own on the account page.',
        soundFade: 'Interface sound fade (ms)',
        soundFadeDescription:
          'When an interface sound plays, the music fades out over this time and pauses, then fades back in from the same spot once the sound has finished. Sounds can override it.',
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
        delete: 'Remove',
        mode: 'Playback',
        url: 'Track URL',
        urlPlaceholder: 'https://example.com/music/theme.mp3',
        urlDescription: 'Link to an audio file (mp3, ogg, wav, ...). Leave empty for silence.',
        volume: 'Track volume',
        upload: 'Upload',
        preview: 'Preview',
        stopPreview: 'Stop',
      },
      custom: {
        title: 'Add Custom Page',
        description:
          'Give any URL its own track. Use * as a wildcard, e.g. /server/*/files* for every server file manager. When several pages match, a custom page wins over a built-in one, and the most specific pattern wins.',
        name: 'Name',
        namePlaceholder: 'Server Files',
        path: 'URL pattern',
        pathPlaceholder: '/server/*/files*',
        add: 'Add custom page',
        untitled: 'Untitled page',
      },
      sounds: {
        title: 'Interface Sounds',
        description:
          'Play a short sound when a button is pressed, a checkbox or switch is toggled, or a select menu is used. The music pauses while it plays. When several sounds match, the one with targets wins over one without, then the more specific page pattern.',
        add: 'Add sound',
        none: 'No interface sounds yet.',
        newName: 'Sound {number}',
        name: 'Name',
        namePlaceholder: 'Save click',
        enabled: 'Enabled',
        trigger: 'Plays on',
        triggers: {
          button: 'Button press',
          checkbox: 'Checkbox / switch',
          select: 'Select menu',
        },
        checkboxStates: {
          on: 'Turned on',
          off: 'Turned off',
          both: 'Both',
        },
        selectEvents: {
          selected: 'Option selected',
          opened: 'Opened',
          closed: 'Closed',
          opened_or_closed: 'Opened or closed',
        },
        targets: 'Targets',
        targetsButton:
          'Which buttons: search the panel texts (in your language, English or by key) or icons for icon-only buttons. Works in every language. Empty means any button.',
        targetsCheckbox:
          'Which checkboxes or switches, by their label. Works in every language. Empty means any checkbox or switch.',
        targetsSelect: 'Which select menus, by their label. Works in every language. Empty means any select menu.',
        targetsPlaceholder: 'Search texts or icons',
        optionTargets: 'Options',
        optionTargetsDescription: 'Which options. Empty means any option.',
        iconLabel: 'Icon: {name}',
        path: 'Page',
        pathDescription: 'URL pattern like for custom pages, * is a wildcard. Empty means every page.',
        url: 'Sound URL',
        urlDescription: 'Link to a short audio file (mp3, ogg, wav, ...).',
        volume: 'Sound volume',
        fadeOverride: 'Fade override (ms)',
        fadeOverrideDescription:
          'How fast the music fades out and back in for this sound. Leave empty for the default.',
        fadeDefault: 'Default ({ms} ms)',
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
