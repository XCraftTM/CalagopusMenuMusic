use compact_str::{CompactString, ToCompactString};
use serde::{Deserialize, Serialize};
use shared::extensions::settings::{
    ExtensionSettings, SettingsDeserializeExt, SettingsDeserializer, SettingsSerializeExt,
    SettingsSerializer,
};
use utoipa::ToSchema;

use crate::sounds::{self, DEFAULT_SOUND_FADE_MS, SoundConfig};

/// The page key of the fallback track, used for every page that has no track of its own.
pub const DEFAULT_PAGE: &str = "default";

/// Every page key a track can be configured for, besides [`DEFAULT_PAGE`].
/// The frontend maps the current URL onto one of these.
pub const PAGES: &[&str] = &[
    "login",
    "register",
    "password_reset",
    "server_list",
    "account",
    "server",
    "admin",
];

/// Page keys of admin-defined pages start with this, followed by a short random id.
pub const CUSTOM_PAGE_PREFIX: &str = "custom-";
pub const MAX_CUSTOM_PAGES: usize = 50;
pub const MAX_CUSTOM_NAME_LENGTH: usize = 64;
pub const MAX_CUSTOM_PATH_LENGTH: usize = 256;

pub const MAX_URL_LENGTH: usize = 2048;
pub const MAX_IDLE_TIMEOUT_SECONDS: u32 = 24 * 60 * 60;
pub const MAX_FADE_DURATION_MS: u32 = 30_000;

#[derive(ToSchema, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum PlayMode {
    /// Play as soon as the page is opened.
    #[default]
    Always,
    /// Only start playing once the user has been idle for `idle_timeout_seconds`.
    Idle,
    /// Never play anything on this page.
    Off,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct TrackConfig {
    /// One of [`DEFAULT_PAGE`], [`PAGES`] or a custom page (`custom-<id>`).
    pub page: CompactString,
    /// Display name of a custom page, empty for built-in pages.
    #[serde(default)]
    pub name: CompactString,
    /// URL path pattern of a custom page (`*` matches anything), empty for built-in pages.
    #[serde(default)]
    pub path: CompactString,
    pub mode: PlayMode,
    /// Absolute `http(s)://` URL or a panel relative `/path`, empty means silence.
    pub url: CompactString,
    /// Track volume in percent, multiplied with the user's own volume.
    pub volume: u8,
}

impl TrackConfig {
    pub fn default_track() -> Self {
        Self {
            page: DEFAULT_PAGE.into(),
            name: CompactString::default(),
            path: CompactString::default(),
            mode: PlayMode::Always,
            url: CompactString::default(),
            volume: 100,
        }
    }
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct ExtensionSettingsData {
    /// Master switch for the whole extension.
    pub enabled: bool,
    /// Always contains the [`DEFAULT_PAGE`] track as the first entry,
    /// followed by the pages that have their own configuration.
    pub tracks: Vec<TrackConfig>,
    /// Seconds without input before tracks in [`PlayMode::Idle`] start playing.
    pub idle_timeout_seconds: u32,
    /// Crossfade duration when the track changes, also used to fade in and out.
    pub fade_duration_ms: u32,
    /// Volume in percent users start with before they pick their own.
    pub default_volume: u8,
    /// Interface sounds played on button presses, checkbox toggles and select menus.
    pub sounds: Vec<SoundConfig>,
    /// How fast the music fades out before and back in after an interface sound.
    pub sound_fade_ms: u32,
}

impl Default for ExtensionSettingsData {
    fn default() -> Self {
        Self {
            enabled: true,
            tracks: vec![TrackConfig::default_track()],
            idle_timeout_seconds: 60,
            fade_duration_ms: 1500,
            default_volume: 50,
            sounds: Vec::new(),
            sound_fade_ms: DEFAULT_SOUND_FADE_MS,
        }
    }
}

impl ExtensionSettingsData {
    /// Validates data coming from the admin API, returns one message per problem.
    pub fn validate(&self) -> Vec<String> {
        let mut errors = Vec::new();

        if !self.tracks.iter().any(|t| t.page == DEFAULT_PAGE) {
            errors.push("tracks: the default track is missing".to_string());
        }

        if self
            .tracks
            .iter()
            .filter(|t| is_custom_page(&t.page))
            .count()
            > MAX_CUSTOM_PAGES
        {
            errors.push(format!(
                "tracks: at most {MAX_CUSTOM_PAGES} custom pages are allowed"
            ));
        }

        for (i, track) in self.tracks.iter().enumerate() {
            if is_custom_page(&track.page) {
                let name = track.name.trim();
                if name.is_empty() || name.chars().count() > MAX_CUSTOM_NAME_LENGTH {
                    errors.push(format!(
                        "tracks.{i}.name: must be between 1 and {MAX_CUSTOM_NAME_LENGTH} characters"
                    ));
                }
                if !is_valid_path_pattern(&track.path) {
                    errors.push(format!(
                        "tracks.{i}.path: must start with / and contain no spaces (at most {MAX_CUSTOM_PATH_LENGTH} characters)"
                    ));
                }
            } else if !is_builtin_page(&track.page) {
                errors.push(format!("tracks.{i}.page: unknown page `{}`", track.page));
            }
            if self.tracks[..i].iter().any(|t| t.page == track.page) {
                errors.push(format!(
                    "tracks.{i}.page: page `{}` is listed twice",
                    track.page
                ));
            }
            if track.url.len() > MAX_URL_LENGTH {
                errors.push(format!(
                    "tracks.{i}.url: must be at most {MAX_URL_LENGTH} characters"
                ));
            }
            if !is_allowed_url(&track.url) {
                errors.push(format!(
                    "tracks.{i}.url: must start with http://, https:// or /"
                ));
            }
            if track.volume > 100 {
                errors.push(format!("tracks.{i}.volume: must be between 0 and 100"));
            }
        }

        if !(1..=MAX_IDLE_TIMEOUT_SECONDS).contains(&self.idle_timeout_seconds) {
            errors.push(format!(
                "idle_timeout_seconds: must be between 1 and {MAX_IDLE_TIMEOUT_SECONDS}"
            ));
        }
        if self.fade_duration_ms > MAX_FADE_DURATION_MS {
            errors.push(format!(
                "fade_duration_ms: must be at most {MAX_FADE_DURATION_MS}"
            ));
        }
        if self.default_volume > 100 {
            errors.push("default_volume: must be between 0 and 100".to_string());
        }

        errors.extend(sounds::validate(&self.sounds, self.sound_fade_ms));

        errors
    }

    /// Drops unknown and duplicate pages, clamps values and makes sure the
    /// default track exists and comes first.
    pub fn normalize(&mut self) {
        let mut tracks: Vec<TrackConfig> = Vec::with_capacity(self.tracks.len() + 1);

        for mut track in std::mem::take(&mut self.tracks) {
            let known = if is_custom_page(&track.page) {
                track.name = track.name.trim().into();
                !track.name.is_empty() && is_valid_path_pattern(&track.path)
            } else {
                track.name = CompactString::default();
                track.path = CompactString::default();
                is_builtin_page(&track.page)
            };
            if !known || tracks.iter().any(|t| t.page == track.page) {
                continue;
            }

            track.volume = track.volume.min(100);
            tracks.push(track);
        }

        match tracks.iter().position(|t| t.page == DEFAULT_PAGE) {
            Some(0) => {}
            Some(index) => {
                let default = tracks.remove(index);
                tracks.insert(0, default);
            }
            None => tracks.insert(0, TrackConfig::default_track()),
        }

        self.tracks = tracks;
        self.idle_timeout_seconds = self.idle_timeout_seconds.clamp(1, MAX_IDLE_TIMEOUT_SECONDS);
        self.fade_duration_ms = self.fade_duration_ms.min(MAX_FADE_DURATION_MS);
        self.default_volume = self.default_volume.min(100);
        self.sounds = sounds::normalize(std::mem::take(&mut self.sounds));
        self.sound_fade_ms = self.sound_fade_ms.min(MAX_FADE_DURATION_MS);
    }
}

fn is_builtin_page(page: &str) -> bool {
    page == DEFAULT_PAGE || PAGES.contains(&page)
}

fn is_custom_page(page: &str) -> bool {
    page.strip_prefix(CUSTOM_PAGE_PREFIX).is_some_and(|id| {
        (1..=32).contains(&id.len())
            && id
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
    })
}

pub(crate) fn is_valid_path_pattern(path: &str) -> bool {
    path.starts_with('/')
        && path.len() <= MAX_CUSTOM_PATH_LENGTH
        && !path.chars().any(|c| c.is_whitespace() || c.is_control())
}

pub(crate) fn is_allowed_url(url: &str) -> bool {
    url.is_empty()
        || url.starts_with("https://")
        || url.starts_with("http://")
        || (url.starts_with('/') && !url.starts_with("//"))
}

#[async_trait::async_trait]
impl SettingsSerializeExt for ExtensionSettingsData {
    async fn serialize(
        &self,
        serializer: SettingsSerializer,
    ) -> Result<SettingsSerializer, anyhow::Error> {
        Ok(serializer
            .write_raw_setting("enabled", self.enabled.to_compact_string())
            .write_serde_setting("tracks", &self.tracks)?
            .write_raw_setting(
                "idle_timeout_seconds",
                self.idle_timeout_seconds.to_compact_string(),
            )
            .write_raw_setting(
                "fade_duration_ms",
                self.fade_duration_ms.to_compact_string(),
            )
            .write_raw_setting("default_volume", self.default_volume.to_compact_string())
            .write_serde_setting("sounds", &self.sounds)?
            .write_raw_setting("sound_fade_ms", self.sound_fade_ms.to_compact_string()))
    }
}

pub struct ExtensionSettingsDataDeserializer;

#[async_trait::async_trait]
impl SettingsDeserializeExt for ExtensionSettingsDataDeserializer {
    async fn deserialize_boxed(
        &self,
        mut deserializer: SettingsDeserializer<'_>,
    ) -> Result<ExtensionSettings, anyhow::Error> {
        let defaults = ExtensionSettingsData::default();

        let mut data = ExtensionSettingsData {
            enabled: deserializer
                .take_raw_setting("enabled")
                .and_then(|s| s.parse().ok())
                .unwrap_or(defaults.enabled),
            tracks: deserializer
                .read_serde_setting("tracks")
                .unwrap_or(defaults.tracks),
            idle_timeout_seconds: deserializer
                .take_raw_setting("idle_timeout_seconds")
                .and_then(|s| s.parse().ok())
                .unwrap_or(defaults.idle_timeout_seconds),
            fade_duration_ms: deserializer
                .take_raw_setting("fade_duration_ms")
                .and_then(|s| s.parse().ok())
                .unwrap_or(defaults.fade_duration_ms),
            default_volume: deserializer
                .take_raw_setting("default_volume")
                .and_then(|s| s.parse().ok())
                .unwrap_or(defaults.default_volume),
            sounds: deserializer
                .read_serde_setting("sounds")
                .unwrap_or(defaults.sounds),
            sound_fade_ms: deserializer
                .take_raw_setting("sound_fade_ms")
                .and_then(|s| s.parse().ok())
                .unwrap_or(defaults.sound_fade_ms),
        };
        data.normalize();

        Ok(Box::new(data))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn track(page: &str, url: &str) -> TrackConfig {
        TrackConfig {
            page: page.into(),
            name: CompactString::default(),
            path: CompactString::default(),
            mode: PlayMode::Always,
            url: url.into(),
            volume: 100,
        }
    }

    #[test]
    fn validate_accepts_defaults() {
        assert!(ExtensionSettingsData::default().validate().is_empty());
    }

    #[test]
    fn validate_rejects_bad_tracks() {
        let data = ExtensionSettingsData {
            tracks: vec![
                track("login", "javascript:alert(1)"),
                track("login", "//evil.example/a.mp3"),
                track("nope", ""),
            ],
            ..Default::default()
        };
        let errors = data.validate();

        assert!(
            errors
                .iter()
                .any(|e| e.contains("default track is missing"))
        );
        assert!(errors.iter().any(|e| e.contains("listed twice")));
        assert!(errors.iter().any(|e| e.contains("unknown page")));
        assert_eq!(errors.iter().filter(|e| e.contains(".url:")).count(), 2);
    }

    #[test]
    fn validate_accepts_relative_and_absolute_urls() {
        let data = ExtensionSettingsData {
            tracks: vec![
                track(DEFAULT_PAGE, "https://cdn.example.com/theme.ogg"),
                track("admin", "/assets/menu-music/admin.mp3"),
                track("server", ""),
            ],
            ..Default::default()
        };
        assert!(data.validate().is_empty());
    }

    fn custom(id: &str, name: &str, path: &str) -> TrackConfig {
        TrackConfig {
            name: name.into(),
            path: path.into(),
            ..track(&format!("{CUSTOM_PAGE_PREFIX}{id}"), "/x.mp3")
        }
    }

    #[test]
    fn validate_custom_pages() {
        let ok = ExtensionSettingsData {
            tracks: vec![
                track(DEFAULT_PAGE, ""),
                custom("abc123", "Server Files", "/server/*/files*"),
            ],
            ..Default::default()
        };
        assert!(ok.validate().is_empty());

        let bad = ExtensionSettingsData {
            tracks: vec![
                track(DEFAULT_PAGE, ""),
                custom("abc", "  ", "/a"),
                custom("def", "No slash", "server/*"),
                custom("ghi", "Spaces", "/a b"),
                custom("UPPER", "Bad id", "/a"),
            ],
            ..Default::default()
        };
        let errors = bad.validate();
        assert!(errors.iter().any(|e| e.starts_with("tracks.1.name")));
        assert!(errors.iter().any(|e| e.starts_with("tracks.2.path")));
        assert!(errors.iter().any(|e| e.starts_with("tracks.3.path")));
        assert!(errors.iter().any(|e| e.starts_with("tracks.4.page")));
    }

    #[test]
    fn deserializes_tracks_saved_before_custom_pages() {
        let tracks: Vec<TrackConfig> = serde_json::from_str(
            r#"[{"page":"default","mode":"always","url":"/a.mp3","volume":80}]"#,
        )
        .unwrap();
        assert_eq!(tracks[0].name, "");
        assert_eq!(tracks[0].path, "");
    }

    #[test]
    fn normalize_keeps_custom_pages_and_clears_builtin_paths() {
        let mut login = track("login", "/l.mp3");
        login.path = "/should/be/cleared".into();

        let mut data = ExtensionSettingsData {
            tracks: vec![
                track(DEFAULT_PAGE, ""),
                login,
                custom("abc", "  Files  ", "/server/*/files*"),
                custom("bad", "", "/x"),
            ],
            ..Default::default()
        };
        data.normalize();

        let pages: Vec<&str> = data.tracks.iter().map(|t| t.page.as_str()).collect();
        assert_eq!(pages, vec![DEFAULT_PAGE, "login", "custom-abc"]);
        assert_eq!(data.tracks[1].path, "");
        assert_eq!(data.tracks[2].name, "Files");
    }

    #[test]
    fn normalize_restores_default_first_and_drops_junk() {
        let mut data = ExtensionSettingsData {
            tracks: vec![
                track("server", "/a.mp3"),
                track("unknown", "/b.mp3"),
                track(DEFAULT_PAGE, "/c.mp3"),
                track("server", "/d.mp3"),
            ],
            idle_timeout_seconds: 0,
            default_volume: 250,
            ..Default::default()
        };
        data.normalize();

        let pages: Vec<&str> = data.tracks.iter().map(|t| t.page.as_str()).collect();
        assert_eq!(pages, vec![DEFAULT_PAGE, "server"]);
        assert_eq!(data.tracks[1].url, "/a.mp3");
        assert_eq!(data.idle_timeout_seconds, 1);
        assert_eq!(data.default_volume, 100);

        let mut empty = ExtensionSettingsData {
            tracks: Vec::new(),
            ..Default::default()
        };
        empty.normalize();
        assert_eq!(empty.tracks.len(), 1);
        assert_eq!(empty.tracks[0].page, DEFAULT_PAGE);
    }
}
