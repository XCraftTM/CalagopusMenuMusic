use compact_str::{CompactString, ToCompactString};
use serde::{Deserialize, Serialize};
use shared::extensions::settings::{
    ExtensionSettings, SettingsDeserializeExt, SettingsDeserializer, SettingsSerializeExt,
    SettingsSerializer,
};
use utoipa::ToSchema;

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
    /// One of [`DEFAULT_PAGE`] or [`PAGES`].
    pub page: CompactString,
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
}

impl Default for ExtensionSettingsData {
    fn default() -> Self {
        Self {
            enabled: true,
            tracks: vec![TrackConfig::default_track()],
            idle_timeout_seconds: 60,
            fade_duration_ms: 1500,
            default_volume: 50,
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

        for (i, track) in self.tracks.iter().enumerate() {
            if track.page != DEFAULT_PAGE && !PAGES.contains(&track.page.as_str()) {
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

        errors
    }

    /// Drops unknown and duplicate pages, clamps values and makes sure the
    /// default track exists and comes first.
    pub fn normalize(&mut self) {
        let mut tracks: Vec<TrackConfig> = Vec::with_capacity(self.tracks.len() + 1);

        for mut track in std::mem::take(&mut self.tracks) {
            let known = track.page == DEFAULT_PAGE || PAGES.contains(&track.page.as_str());
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
    }
}

fn is_allowed_url(url: &str) -> bool {
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
            .write_raw_setting("default_volume", self.default_volume.to_compact_string()))
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
