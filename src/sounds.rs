use compact_str::CompactString;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::settings::{
    MAX_FADE_DURATION_MS, MAX_URL_LENGTH, is_allowed_url, is_valid_path_pattern,
};

/// Interface sound ids start with this, followed by a short random id.
pub const SOUND_ID_PREFIX: &str = "sound-";
pub const MAX_SOUNDS: usize = 100;
pub const MAX_SOUND_NAME_LENGTH: usize = 64;
pub const MAX_TARGETS: usize = 50;
pub const MAX_TARGET_LENGTH: usize = 256;

/// A target names the element a sound reacts to, independent of the visitor's language:
/// `key:<translation key>` (e.g. `key:common.button.save`) or `icon:<icon name>` (e.g. `icon:trash`).
pub const TARGET_PREFIXES: &[&str] = &["key:", "icon:"];

pub const DEFAULT_SOUND_FADE_MS: u32 = 250;

#[derive(ToSchema, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SoundTrigger {
    /// Clicking a button.
    #[default]
    Button,
    /// Toggling a checkbox or switch.
    Checkbox,
    /// Using a select menu.
    Select,
}

#[derive(ToSchema, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum CheckboxState {
    On,
    Off,
    #[default]
    Both,
}

#[derive(ToSchema, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum SelectEvent {
    /// An option was picked.
    #[default]
    Selected,
    /// The dropdown was opened.
    Opened,
    /// The dropdown was closed.
    Closed,
    OpenedOrClosed,
}

#[derive(ToSchema, Serialize, Deserialize, Clone)]
pub struct SoundConfig {
    /// `sound-<id>`
    pub id: CompactString,
    pub name: CompactString,
    pub enabled: bool,
    pub trigger: SoundTrigger,
    /// Only used by [`SoundTrigger::Checkbox`].
    #[serde(default)]
    pub checkbox_state: CheckboxState,
    /// Only used by [`SoundTrigger::Select`].
    #[serde(default)]
    pub select_event: SelectEvent,
    /// The element(s) this sound reacts to, empty means any element of the trigger type.
    #[serde(default)]
    pub targets: Vec<CompactString>,
    /// For selected select options: the option(s) this sound reacts to, empty means any.
    #[serde(default)]
    pub option_targets: Vec<CompactString>,
    /// URL path pattern (`*` matches anything), empty means every page.
    #[serde(default)]
    pub path: CompactString,
    /// Absolute `http(s)://` URL or a panel relative `/path`.
    pub url: CompactString,
    /// Volume in percent, multiplied with the user's own volume.
    pub volume: u8,
    /// Overrides the global sound fade, `None` uses it.
    #[serde(default)]
    pub fade_ms: Option<u32>,
}

fn is_valid_sound_id(id: &str) -> bool {
    id.strip_prefix(SOUND_ID_PREFIX).is_some_and(|rest| {
        (1..=32).contains(&rest.len())
            && rest
                .chars()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit())
    })
}

fn is_valid_target(target: &str) -> bool {
    target.len() <= MAX_TARGET_LENGTH
        && TARGET_PREFIXES.iter().any(|prefix| {
            target.strip_prefix(prefix).is_some_and(|value| {
                !value.is_empty() && !value.chars().any(|c| c.is_whitespace() || c.is_control())
            })
        })
}

/// Validates sounds coming from the admin API, one message per problem.
pub fn validate(sounds: &[SoundConfig], sound_fade_ms: u32) -> Vec<String> {
    let mut errors = Vec::new();

    if sounds.len() > MAX_SOUNDS {
        errors.push(format!("sounds: at most {MAX_SOUNDS} sounds are allowed"));
    }
    if sound_fade_ms > MAX_FADE_DURATION_MS {
        errors.push(format!(
            "sound_fade_ms: must be at most {MAX_FADE_DURATION_MS}"
        ));
    }

    for (i, sound) in sounds.iter().enumerate() {
        if !is_valid_sound_id(&sound.id) {
            errors.push(format!("sounds.{i}.id: invalid id `{}`", sound.id));
        } else if sounds[..i].iter().any(|s| s.id == sound.id) {
            errors.push(format!("sounds.{i}.id: id `{}` is used twice", sound.id));
        }

        let name = sound.name.trim();
        if name.is_empty() || name.chars().count() > MAX_SOUND_NAME_LENGTH {
            errors.push(format!(
                "sounds.{i}.name: must be between 1 and {MAX_SOUND_NAME_LENGTH} characters"
            ));
        }

        for (field, targets) in [
            ("targets", &sound.targets),
            ("option_targets", &sound.option_targets),
        ] {
            if targets.len() > MAX_TARGETS {
                errors.push(format!(
                    "sounds.{i}.{field}: at most {MAX_TARGETS} targets are allowed"
                ));
            }
            if let Some(bad) = targets.iter().find(|t| !is_valid_target(t)) {
                errors.push(format!(
                    "sounds.{i}.{field}: invalid target `{bad}`, expected key:<translation key> or icon:<icon name>"
                ));
            }
        }

        if !sound.path.is_empty() && !is_valid_path_pattern(&sound.path) {
            errors.push(format!(
                "sounds.{i}.path: must be empty or start with / and contain no spaces"
            ));
        }
        if sound.url.len() > MAX_URL_LENGTH {
            errors.push(format!(
                "sounds.{i}.url: must be at most {MAX_URL_LENGTH} characters"
            ));
        }
        if !is_allowed_url(&sound.url) {
            errors.push(format!(
                "sounds.{i}.url: must start with http://, https:// or /"
            ));
        }
        if sound.volume > 100 {
            errors.push(format!("sounds.{i}.volume: must be between 0 and 100"));
        }
        if sound.fade_ms.is_some_and(|ms| ms > MAX_FADE_DURATION_MS) {
            errors.push(format!(
                "sounds.{i}.fade_ms: must be at most {MAX_FADE_DURATION_MS}"
            ));
        }
    }

    errors
}

/// Drops invalid sounds and targets and clamps values, used when reading stored settings.
pub fn normalize(sounds: Vec<SoundConfig>) -> Vec<SoundConfig> {
    let mut result: Vec<SoundConfig> = Vec::with_capacity(sounds.len());

    for mut sound in sounds {
        if result.len() >= MAX_SOUNDS
            || !is_valid_sound_id(&sound.id)
            || result.iter().any(|s| s.id == sound.id)
        {
            continue;
        }

        sound.name = sound.name.trim().into();
        if sound.name.is_empty() {
            continue;
        }
        if !sound.path.is_empty() && !is_valid_path_pattern(&sound.path) {
            sound.path = CompactString::default();
        }

        sound.targets.retain(|t| is_valid_target(t));
        sound.targets.truncate(MAX_TARGETS);
        sound.option_targets.retain(|t| is_valid_target(t));
        sound.option_targets.truncate(MAX_TARGETS);

        sound.volume = sound.volume.min(100);
        sound.fade_ms = sound.fade_ms.map(|ms| ms.min(MAX_FADE_DURATION_MS));

        result.push(sound);
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sound(id: &str) -> SoundConfig {
        SoundConfig {
            id: id.into(),
            name: "Click".into(),
            enabled: true,
            trigger: SoundTrigger::Button,
            checkbox_state: CheckboxState::Both,
            select_event: SelectEvent::Selected,
            targets: vec!["key:common.button.save".into(), "icon:trash".into()],
            option_targets: Vec::new(),
            path: CompactString::default(),
            url: "/assets/menu-music/click.ogg".into(),
            volume: 80,
            fade_ms: None,
        }
    }

    #[test]
    fn accepts_a_valid_sound() {
        assert!(validate(&[sound("sound-abc123")], DEFAULT_SOUND_FADE_MS).is_empty());
    }

    #[test]
    fn rejects_bad_sounds() {
        let mut bad_target = sound("sound-b");
        bad_target.targets = vec!["Save".into()];
        let mut bad_name = sound("sound-c");
        bad_name.name = " ".into();
        let mut bad_fade = sound("sound-d");
        bad_fade.fade_ms = Some(MAX_FADE_DURATION_MS + 1);
        let mut bad_path = sound("sound-e");
        bad_path.path = "server/*".into();

        let errors = validate(
            &[
                sound("sound-a"),
                sound("sound-a"),
                sound("BAD"),
                bad_target,
                bad_name,
                bad_fade,
                bad_path,
            ],
            DEFAULT_SOUND_FADE_MS,
        );

        assert!(errors.iter().any(|e| e.starts_with("sounds.1.id")));
        assert!(errors.iter().any(|e| e.starts_with("sounds.2.id")));
        assert!(errors.iter().any(|e| e.starts_with("sounds.3.targets")));
        assert!(errors.iter().any(|e| e.starts_with("sounds.4.name")));
        assert!(errors.iter().any(|e| e.starts_with("sounds.5.fade_ms")));
        assert!(errors.iter().any(|e| e.starts_with("sounds.6.path")));
        assert!(!validate(&[], MAX_FADE_DURATION_MS + 1).is_empty());
    }

    #[test]
    fn normalize_drops_invalid_entries() {
        let mut bad_target = sound("sound-b");
        bad_target.targets.push("nope".into());

        let result = normalize(vec![
            sound("sound-a"),
            sound("sound-a"),
            sound("BAD"),
            bad_target,
        ]);

        let ids: Vec<&str> = result.iter().map(|s| s.id.as_str()).collect();
        assert_eq!(ids, vec!["sound-a", "sound-b"]);
        assert_eq!(result[1].targets.len(), 2);
    }

    #[test]
    fn deserializes_minimal_sound() {
        let sound: SoundConfig = serde_json::from_str(
            r#"{"id":"sound-a","name":"x","enabled":true,"trigger":"checkbox","url":"","volume":50}"#,
        )
        .unwrap();
        assert!(sound.trigger == SoundTrigger::Checkbox);
        assert!(sound.checkbox_state == CheckboxState::Both);
        assert!(sound.targets.is_empty());
        assert!(sound.fade_ms.is_none());
    }
}
