import type { Interaction } from './interactions.ts';
import { pathMatchesPattern, patternSpecificity } from './pages.ts';
import type { SoundConfig } from './schemas.ts';
import { matchesTargets } from './targets.ts';

function matchesTrigger(sound: SoundConfig, interaction: Interaction): boolean {
  if (sound.trigger !== interaction.trigger) return false;

  if (interaction.trigger === 'checkbox') {
    return sound.checkboxState === 'both' || sound.checkboxState === (interaction.checked ? 'on' : 'off');
  }

  if (interaction.trigger === 'select') {
    switch (sound.selectEvent) {
      case 'selected':
        return interaction.event === 'selected';
      case 'opened':
        return interaction.event === 'opened';
      case 'closed':
        return interaction.event === 'closed';
      case 'opened_or_closed':
        return interaction.event === 'opened' || interaction.event === 'closed';
    }
  }

  return true;
}

/**
 * The sound to play for an interaction, if any. When several match, the most specific one wins:
 * one with targets beats one without, then the more specific page pattern, then list order.
 */
export function findSound(sounds: SoundConfig[], interaction: Interaction, pathname: string): SoundConfig | null {
  let best: SoundConfig | null = null;
  let bestScore = -1;

  for (const sound of sounds) {
    if (!sound.enabled || !sound.url || !matchesTrigger(sound, interaction)) continue;
    if (sound.path && !pathMatchesPattern(pathname, sound.path)) continue;
    if (!matchesTargets(sound.targets, interaction.identity)) continue;

    // option targets only apply when an option was picked
    const option = interaction.trigger === 'select' && interaction.event === 'selected' ? interaction.option : null;
    const optionTargets = option ? sound.optionTargets : [];
    if (option && !matchesTargets(optionTargets, option)) continue;

    const score =
      (sound.targets.length > 0 ? 100_000 : 0) +
      (optionTargets.length > 0 ? 100_000 : 0) +
      (sound.path ? 1 + patternSpecificity(sound.path) : 0);

    if (score > bestScore) {
      best = sound;
      bestScore = score;
    }
  }

  return best;
}
