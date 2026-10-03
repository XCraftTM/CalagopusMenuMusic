import { type Identity, identityOf, mergeIdentities, visibleText } from './targets.ts';

export type Interaction =
  | { trigger: 'button'; identity: Identity }
  | { trigger: 'checkbox'; checked: boolean; identity: Identity }
  | { trigger: 'select'; event: 'selected'; identity: Identity; option: Identity }
  | { trigger: 'select'; event: 'opened' | 'closed'; identity: Identity };

const SELECT_ROOTS = '.mantine-Select-root, .mantine-MultiSelect-root';
const BUTTONS = 'button, [role="button"], input[type="submit"], input[type="button"], a.mantine-Button-root';
// custom toggles that are not real checkboxes, e.g. this extension's own login switch
const ARIA_TOGGLES = '[role="switch"]:not(input), [role="checkbox"]:not(input)';

/** Select and multi select inputs (not autocompletes or tag inputs, which also open a listbox). */
function isSelectInput(element: Element): element is HTMLElement {
  return element.matches('[aria-haspopup="listbox"]') && element.closest(SELECT_ROOTS) !== null;
}

function isDisabled(element: Element): boolean {
  return element.matches(':disabled, [aria-disabled="true"], [data-disabled="true"], [data-disabled=""]');
}

function attributeTexts(element: Element): string[] {
  const texts = [element.getAttribute('aria-label'), element.getAttribute('title')];

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    for (const id of labelledBy.split(/\s+/)) texts.push(visibleText(document.getElementById(id)));
  }

  return texts.filter((text): text is string => Boolean(text));
}

/** Label texts of a form input: the Mantine label of its component, its <label>s and aria labels. */
function inputLabelTexts(input: HTMLElement): string[] {
  const texts: string[] = [];

  const root = input.closest(
    '.mantine-Switch-root, .mantine-Checkbox-root, .mantine-Chip-root, .mantine-InputWrapper-root',
  );
  const componentLabel = root?.querySelector(
    '.mantine-Switch-label, .mantine-Checkbox-label, .mantine-Chip-label, .mantine-InputWrapper-label',
  );
  if (componentLabel) texts.push(visibleText(componentLabel));

  if (input instanceof HTMLInputElement && input.labels) {
    for (const label of input.labels) texts.push(visibleText(label));
  }

  return [...texts, ...attributeTexts(input)];
}

/**
 * Watches the whole page for button presses, checkbox/switch toggles and select menu activity.
 * Returns a function that stops watching.
 */
function buttonIdentity(button: Element): Identity {
  return identityOf(
    [button instanceof HTMLInputElement ? button.value : visibleText(button), ...attributeTexts(button)],
    button,
  );
}

export function watchInteractions(onInteraction: (interaction: Interaction) => void): () => void {
  let lastOpenedSelect: HTMLElement | null = null;
  // what the pressed button looked like on mouse/touch down: some change on press, before the click
  // (the password field's eye icon turns into eye-slash, "Copy" turns into "Copied", ...)
  let pressed: { button: Element; identity: Identity } | null = null;

  const onPointerDown = (event: PointerEvent) => {
    const button = event.target instanceof Element ? event.target.closest(BUTTONS) : null;
    pressed = button ? { button, identity: buttonIdentity(button) } : null;
  };

  const selectForListbox = (listbox: Element | null): HTMLElement | null => {
    if (listbox?.id) {
      const target = document.querySelector(`[aria-controls="${CSS.escape(listbox.id)}"]`);
      if (target && isSelectInput(target)) return target;
    }
    return lastOpenedSelect;
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    // picking a select option (a click, or Enter, which Mantine turns into a click on the option)
    const option = target.closest('[role="option"]');
    if (option) {
      const select = selectForListbox(option.closest('[role="listbox"]'));
      if (select && !isDisabled(option)) {
        onInteraction({
          trigger: 'select',
          event: 'selected',
          identity: identityOf(inputLabelTexts(select)),
          option: identityOf([visibleText(option)], option),
        });
      }
      return;
    }

    const toggle = target.closest(ARIA_TOGGLES);
    if (toggle) {
      if (isDisabled(toggle)) return;
      // read the new state once the click has been handled
      setTimeout(() => {
        onInteraction({
          trigger: 'checkbox',
          checked: toggle.getAttribute('aria-checked') === 'true',
          identity: identityOf([visibleText(toggle), ...attributeTexts(toggle)], toggle),
        });
      });
      return;
    }

    const button = target.closest(BUTTONS);
    if (!button || isDisabled(button) || button.closest('[aria-haspopup="listbox"]')) return;

    const identity = buttonIdentity(button);
    onInteraction({
      trigger: 'button',
      identity: pressed?.button === button ? mergeIdentities(pressed.identity, identity) : identity,
    });
    pressed = null;
  };

  const onChange = (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;

    onInteraction({ trigger: 'checkbox', checked: input.checked, identity: identityOf(inputLabelTexts(input)) });
  };

  // Mantine sets `data-expanded` on a select's input while its dropdown is open
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const element = record.target;
      if (!(element instanceof Element) || !isSelectInput(element)) continue;

      const opened = element.hasAttribute('data-expanded');
      if (opened === (record.oldValue !== null)) continue;
      if (opened) lastOpenedSelect = element;

      onInteraction({
        trigger: 'select',
        event: opened ? 'opened' : 'closed',
        identity: identityOf(inputLabelTexts(element)),
      });
    }
  });

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('change', onChange, true);
  observer.observe(document.body, {
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ['data-expanded'],
    subtree: true,
  });

  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('change', onChange, true);
    observer.disconnect();
  };
}
