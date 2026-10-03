# Changelog

## [1.0.0] - 2026-10-03

The first release of Menu Music: background music and interface sounds for the Calagopus panel.

### 🎶 Background music

- A track for every page: login, register, password reset, server list, account, every server page and the
  admin area, plus custom pages from any URL pattern (`*` as wildcard). Pages without their own track play the
  Default track.
- Three playback modes per track: *Always play*, *Play when idle* (after a configurable delay) and *Silent*.
- Smooth crossfades between pages and seamless looping that fades a track into its own beginning.
- Upload audio from the settings page, pick files from the panel's Assets, or paste any link.

### 🔊 Interface sounds

- Sounds for button presses, checkboxes and switches (on, off or both), and select menus (option picked,
  opened, closed).
- Targets are picked from a search over the panel's own texts and icons, and work in every panel language.
- Each sound can be limited to specific options and pages, and has its own volume and fade time.
- The music briefly fades out for a sound and continues where it left off.

### 🎧 For your users

- A Menu Music card on the Account page to turn music and sounds on or off and change the volume.
- A Menu music switch below the login form for visitors who aren't logged in.
- Music starts on the first interaction, since browsers block sound before that.

### ⚙️ Settings page

- Separate tabs for Background Music and Interface Sounds, remembered in the URL (`?tab=sounds`).
- Save with the button at the top or <kbd>Ctrl</kbd>+<kbd>S</kbd>.

**Requires** Calagopus panel 1.2.3 or newer on the `:heavy` image.
