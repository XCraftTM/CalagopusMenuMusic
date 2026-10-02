# CalagopusMenuMusic

A [Calagopus Panel](https://calagopus.com) extension (`dev.xcrafttm.menumusic`) that plays background music which changes with the page the visitor is on. Admins configure it under **Admin → Extensions → Menu Music → Configure**.

## Features

- **A track per page.** Login, Register, Password Reset & Email Verification, Server List, Account Settings, Server Pages (console, files, settings, allocations and every other server sub-page), and the Admin Area.
- **A Default track.** It plays on every page that has no track of its own.
- **Three playback modes for every track.** *Always play*, *Play when idle* (starts after the user has been inactive for a set time and fades out on the next input), and *Silent*.
- **Direct links or panel assets.** The track URL field autocompletes audio files from the panel's **Admin → Assets** tab, the same way the Application icon field does. You can also paste any direct `https://…` audio link, or use **Upload** to send a file straight into `assets/menu-music/`.
- **Preview and per-track volume** on the configuration page.
- **Crossfades between pages.** When you move to a page with a different track, the old track fades out while the new one fades in, over the configured crossfade duration. When two pages use the same track, it keeps playing across navigation instead of restarting. Music also fades in and out when it starts, stops, is muted, or reaches the idle delay.
- **User controls.** Each user gets a **Menu Music** card on their **Account** page with an on/off switch and a volume slider. These settings sync to the account and are remembered on the login screen too.
- **Autoplay handling.** Browsers block audio until the visitor interacts with the page. Nothing is shown on screen for this: the music simply starts with whatever the current page should play on the first click, tap or key press anywhere.

## Configuration page

| Left: **Configured** | Right: **Using Default Track** |
| --- | --- |
| The **Default** track is always first. Below it are the pages you gave their own track, each with playback mode, URL (asset autocomplete, upload, preview) and volume. **Use default** moves a page back to the right. | Every page without its own track. These pages play the Default track. **Add** moves a page to the left so you can configure it. |

General options:

- master on/off switch
- idle delay in seconds, used by tracks set to *Play when idle*
- crossfade duration
- the volume new users start with

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
  pages/ConfigurationPage.tsx, pages/TrackEditor.tsx
  lib/player.ts              two audio decks, crossfades, autoplay unlock
  lib/pages.ts               URL -> page mapping
```

Uploading needs the `assets.upload` admin permission and asset autocomplete needs `assets.read`. Reading the settings needs `extensions.read`, and saving them needs `extensions.manage`.
