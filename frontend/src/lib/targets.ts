import { globalTranslationHandle } from 'shared';
import baseTranslations from '@/translations.ts';

/**
 * Sounds target elements by what the panel calls them internally, not by their visible text, so one
 * target works in every language:
 * - `key:<translation key>`, e.g. `key:common.button.save` ("Save", "Speichern", ...)
 * - `icon:<icon name>`, e.g. `icon:trash`, for icon-only buttons
 */
export type Target = `key:${string}` | `icon:${string}`;

/** What a clicked/toggled element can be identified by. */
export interface Identity {
  keys: Set<string>;
  icons: Set<string>;
}

export function allTranslationKeys(): string[] {
  return Object.keys(baseTranslations.mapping);
}

export function englishText(key: string): string | undefined {
  return (baseTranslations.mapping as Record<string, string>)[key];
}

/** The text of a key in the language the panel currently shows, falls back to English. */
export function currentText(key: string): string | undefined {
  try {
    return globalTranslationHandle ? globalTranslationHandle.t(key, {}) : englishText(key);
  } catch {
    return englishText(key);
  }
}

function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

interface ReverseIndex {
  handle: unknown;
  exact: Map<string, string[]>;
  patterns: { regex: RegExp; key: string }[];
}

let reverseIndex: ReverseIndex | null = null;

/**
 * Maps visible text back to translation keys in the current language. Rebuilt whenever the panel's
 * translation handle changes (language switch, or the language file finishing loading).
 */
function getReverseIndex(): ReverseIndex {
  if (reverseIndex && reverseIndex.handle === globalTranslationHandle) return reverseIndex;

  const exact = new Map<string, string[]>();
  const patterns: ReverseIndex['patterns'] = [];

  for (const key of allTranslationKeys()) {
    const text = currentText(key);
    if (!text) continue;

    if (/\{\w+\}/.test(text)) {
      // "Delete {name}" matches "Delete my-server"
      const source = normalize(text)
        .split(/\{\w+\}/)
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.+');
      patterns.push({ regex: new RegExp(`^${source}$`), key });
    } else {
      const normalized = normalize(text);
      const keys = exact.get(normalized);
      if (keys) keys.push(key);
      else exact.set(normalized, [key]);
    }
  }

  reverseIndex = { handle: globalTranslationHandle, exact, patterns };
  return reverseIndex;
}

/** Every translation key whose current-language text is exactly this text. */
export function keysForText(text: string): string[] {
  const normalized = normalize(text);
  if (!normalized) return [];

  const index = getReverseIndex();
  const exact = index.exact.get(normalized);
  if (exact) return exact;

  return index.patterns.filter(({ regex }) => regex.test(normalized)).map(({ key }) => key);
}

/** Visible text of an element, without the text of nested icons or hidden helpers. */
export function visibleText(element: Element | null | undefined): string {
  if (!element) return '';
  const text = element instanceof HTMLElement ? element.innerText : element.textContent;
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function identityOf(texts: (string | null | undefined)[], iconRoot?: Element | null): Identity {
  const keys = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    // required field labels end with a " *" marker
    for (const key of keysForText(text.replace(/\s*\*$/, ''))) keys.add(key);
  }

  const icons = new Set<string>();
  if (iconRoot) {
    for (const svg of iconRoot.querySelectorAll('svg[data-icon]')) {
      const name = svg.getAttribute('data-icon');
      if (name) icons.add(name);
    }
  }

  return { keys, icons };
}

export function mergeIdentities(a: Identity, b: Identity): Identity {
  return { keys: new Set([...a.keys, ...b.keys]), icons: new Set([...a.icons, ...b.icons]) };
}

/** Empty targets match anything. */
export function matchesTargets(targets: string[], identity: Identity): boolean {
  if (targets.length === 0) return true;

  return targets.some((target) => {
    if (target.startsWith('key:')) return identity.keys.has(target.slice(4));
    if (target.startsWith('icon:')) return identity.icons.has(target.slice(5));
    return false;
  });
}
