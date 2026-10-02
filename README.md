# CalagopusMenuMusic

A [Calagopus Panel](https://calagopus.com) extension (`dev.xcrafttm.menumusic`) that plays background music which changes with the page the visitor is on. Admins configure it under **Admin → Extensions → Menu Music → Configure**.

## Features

- **A track per page.** Login, Register, Password Reset & Email Verification, Server List, Account Settings, Server Pages (console, files, settings, allocations and every other server sub-page), and the Admin Area.
- **A Default track.** It plays on every page that has no track of its own.
- **Three playback modes for every track.** *Always play*, *Play when idle* (starts after the user has been inactive for a set time and fades out on the next input), and *Silent*.
- **Direct links or panel assets.** The track URL field autocompletes audio files from the panel's **Admin → Assets** tab, the same way the Application icon field does. You can also paste any direct `https://…` audio link, or use **Upload** to send a file straight into `assets/menu-music/`.
- **Preview and per-track volume** on the configuration page.
- **Smooth transitions.** Tracks fade out and in when they change. When two pages use the same track, it keeps playing across navigation instead of restarting.
- **User controls.** Each user gets a **Menu Music** card on their **Account** page with an on/off switch and a volume slider. These settings sync to the account and are remembered on the login screen too. An optional floating play/mute button (shown in any corner you pick) appears on every page.
- **Autoplay handling.** Browsers block audio until the visitor interacts with the page. The music starts on the first click or keypress, and the floating button pulses while it waits.

## Configuration page

| Left: **Configured** | Right: **Using Default Track** |
| --- | --- |
| The **Default** track is always first. Below it are the pages you gave their own track, each with playback mode, URL (asset autocomplete, upload, preview) and volume. **Use default** moves a page back to the right. | Every page without its own track. These pages play the Default track. **Add** moves a page to the left so you can configure it. |

General options:

- master on/off switch
- idle delay in seconds, used by tracks set to *Play when idle*
- fade duration
- the volume new users start with
- whether the floating button is shown, and where

## Installing

1. Build the extension archive (needs Python 3.11+):

   ```bash
   python3 scripts/package.py   # writes dist/dev_xcrafttm_menumusic.c7s.zip
   ```

2. Install `dev_xcrafttm_menumusic.c7s.zip` on a panel running the `:heavy` image. You can upload it in **Admin → Extensions**, or use `panel-rs extensions add`. See [Installing Extensions](https://calagopus.com/docs/panel/extensions/installing-extensions).

Requires Panel `>=1.2.4`.

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
  elements/MenuMusic.tsx     picks the track for the current URL, floating button
  elements/AccountMusicCard.tsx
  pages/ConfigurationPage.tsx, pages/TrackEditor.tsx
  lib/player.ts              audio element, fades, autoplay unlock
  lib/pages.ts               URL -> page mapping
```

Uploading needs the `assets.upload` admin permission and asset autocomplete needs `assets.read`. Reading the settings needs `extensions.read`, and saving them needs `extensions.manage`.
