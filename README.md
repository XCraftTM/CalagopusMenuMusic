# CalagopusMenuMusic

A [Calagopus Panel](https://calagopus.com) extension (`dev.xcrafttm.menumusic`) that plays background music which changes with the page the visitor is on. Admins configure it under **Admin → Extensions → Menu Music → Configure**.

## Features

- **A track per page.** Login, Register, Password Reset & Email Verification, Server List, Account Settings, Server Pages (console, files, settings, allocations and every other server sub-page), and the Admin Area. Each page shows the URLs it covers, e.g. `/auth/login/*`.
- **Custom pages by URL.** Add your own pages with a name and a URL pattern where `*` is a wildcard, e.g. `/server/*/files*` for every server's file manager. A matching custom page wins over a built-in one, and the most specific pattern wins when several match.
- **A Default track.** It plays on every page that has no track of its own.
- **Three playback modes for every track.** *Always play*, *Play when idle* (starts after the user has been inactive for a set time and fades out on the next input), and *Silent*.
- **Direct links or panel assets.** The track URL field autocompletes audio files from the panel's **Admin → Assets** tab, the same way the Application icon field does. You can also paste any direct `https://…` audio link, or use **Upload** to send a file straight into `assets/menu-music/`.
- **Preview and per-track volume** on the configuration page.
- **Crossfades between pages.** When you move to a page with a different track, the old track fades out while the new one fades in, over the configured crossfade duration. When two pages use the same track, it keeps playing across navigation instead of restarting. Looping uses the same crossfade: when a track reaches its end, it fades into its own beginning instead of jumping back. Tracks shorter than two crossfades use the browser's normal seamless loop. Music also fades in and out when it starts, stops, is muted, or reaches the idle delay.
- **User controls.** Each user gets a **Menu Music** card on their **Account** page with an on/off switch and a volume slider. These settings sync to the account and are remembered on the login screen too. Logged-out visitors get a **Menu music** switch under the login form. Turning it off fades the music out and pauses it, and turning it back on resumes where it stopped. The choice is remembered on that device.
- **Interface sounds.** Play a short sound when a button is pressed, a checkbox or switch is turned on or off, or a select menu is opened, closed or an option is picked. While a sound plays, the music quickly fades out (250 ms by default, overridable per sound) and pauses, then fades back in from the same spot. Each sound can be limited to:
  - **targets**, picked from a search over the panel's own texts (in your language, English or by translation key) and icons for icon-only buttons;
  - for select menus, **options**;
  - a **page** URL pattern.

  Targets are stored as translation keys, so a sound set up on "Save" also plays for a German user clicking "Speichern". When several sounds match, one with targets beats one without, then the more specific page pattern wins. Users can turn interface sounds off separately from the music on their Account page.
- **Autoplay handling.** Browsers block audio until the visitor interacts with the page. Nothing is shown on screen for this: the music simply starts with whatever the current page should play on the first click, tap or key press anywhere.

## Configuration page

| Left: **Configured** | Right: **Using Default Track** |
| --- | --- |
| The **Default** track is always first. Below it are the pages you gave their own track, each with playback mode, URL (asset autocomplete, upload, preview) and volume. They are shown in two columns when there is room. **Use default** moves a built-in page back to the right, and **Remove** deletes a custom page. | Every built-in page without its own track. These pages play the Default track. **Add** moves a page to the left so you can configure it. Below the list, **Add Custom Page** creates a page from a name and a URL pattern. |

**Save** sits at the top of the page. Like the panel's own settings pages, **Ctrl+S** (**Cmd+S** on macOS) saves too, or whatever the user bound *Save* to under **Account → Shortcuts**.

General options:

- master on/off switch
- idle delay in seconds, used by tracks set to *Play when idle*
- crossfade duration
- the volume new users start with
- interface sound fade

Below the page tracks, **Interface Sounds** lists the sounds, each with its trigger, targets, page, sound file (asset autocomplete, upload, preview), volume and optional fade override.

## Installing

1. Build the extension archive (needs Python 3.11+):

   ```bash
   python3 scripts/package.py   # writes dist/dev_xcrafttm_menumusic.c7s.zip
   ```

2. Install `dev_xcrafttm_menumusic.c7s.zip` on a panel running the `:heavy` image. You can upload it in **Admin → Extensions**, or use `panel-rs extensions add`. See [Installing Extensions](https://calagopus.com/docs/panel/extensions/installing-extensions).

Requires Panel `>=1.2.3`.

### GitHub Actions

`.github/workflows/build.yml` runs on every push, on pull requests, and manually from the **Actions** tab. It builds the `.c7s.zip` and uploads it to the run. Open the run and download `dev_xcrafttm_menumusic.c7s.zip` under **Artifacts**. The download is the installable archive itself, so you don't need to unzip anything.

Pushing a tag like `v1.0.0` also attaches the archive to a GitHub release. The tag must match `version` in `Cargo.toml`.

### Developing

Install the archive into a [development environment](https://calagopus.com/docs/panel/extensions/dev-environment) with `panel-rs extensions add dist/dev_xcrafttm_menumusic.c7s.zip`. That command creates the links and `frontend/tsconfig.json` the panel build needs. Then run the [pre-export checks](https://calagopus.com/docs/panel/extensions/getting-your-extension-ready): `cargo clippy`, `cargo test -p dev_xcrafttm_menumusic`, `pnpm biome:fix-unsafe` and `pnpm build:ci`.

## Layout

```
Cargo.toml / Metadata.toml   extension metadata
src/
  lib.rs                     route + settings registration
  settings.rs                stored settings, validation, defaults
  routes/public.rs           GET /api/extensions/dev.xcrafttm.menumusic/config  (no auth, for the login page)
  routes/admin/settings.rs   GET/PUT /api/admin/extensions/dev.xcrafttm.menumusic/settings
frontend/src/
  index.tsx                  mounts the player globally + the account card
  elements/MenuMusic.tsx     picks the track for the current URL
  elements/AccountMusicCard.tsx
  elements/InterfaceSounds.tsx  plays interface sounds for button/checkbox/select interactions
  pages/ConfigurationPage.tsx, pages/TrackEditor.tsx, pages/SoundEditor.tsx, pages/TargetPicker.tsx
  lib/player.ts              two audio decks, crossfades, ducking, autoplay unlock
  lib/sfx.ts                 interface sound playback
  lib/interactions.ts        page-wide detection of button presses, toggles and select menus
  lib/targets.ts             visible text -> translation keys (any language), icons
  lib/pages.ts               URL -> page mapping
frontend/public/dev.xcrafttm.menumusic/icons.json
                             icon list for the target picker, regenerate with
                             `node scripts/generate-icons.mjs <panel>/frontend`
```

The icon list is a static file on purpose: the settings page only downloads it when it is opened, while importing the icon packages directly would put every icon into the panel bundle all visitors load.

Uploading needs the `assets.upload` admin permission and asset autocomplete needs `assets.read`. Reading the settings needs `extensions.read`, and saving them needs `extensions.manage`.
