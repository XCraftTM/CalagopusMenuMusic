// any of these counts as the "first interaction" browsers require before audio may play
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchend'] as const;

/** Equal-power curve, keeps the perceived loudness steady while two tracks overlap. */
function ease(progress: number, rising: boolean): number {
  return rising ? Math.sin((progress * Math.PI) / 2) : 1 - Math.cos((progress * Math.PI) / 2);
}

/** One looping audio element with its own volume fade. */
class Deck {
  public readonly audio: HTMLAudioElement;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = 0;
    this.audio.addEventListener('error', () => {
      if (this.audio.src) console.warn('[menu music] failed to load track', this.audio.src, this.audio.error);
    });
  }

  public get url(): string {
    return this.audio.src;
  }

  /** Fades to `volume`, `done` only runs if the fade is not interrupted by another one. */
  public fadeTo(volume: number, fullDuration: number, done?: () => void) {
    this.cancelFade();

    const from = this.audio.volume;
    // a small volume tweak should not take as long as a full fade in
    const duration = fullDuration * Math.min(1, Math.abs(volume - from) / Math.max(volume, from, 0.01));

    if (duration < 16 || from === volume) {
      this.audio.volume = volume;
      done?.();
      return;
    }

    const rising = volume > from;
    const start = performance.now();

    this.fadeTimer = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      this.audio.volume = Math.min(1, Math.max(0, from + (volume - from) * ease(progress, rising)));

      if (progress >= 1) {
        this.cancelFade();
        done?.();
      }
    }, 20);
  }

  public fadeOutAndPause(duration: number) {
    this.fadeTo(0, duration, () => this.audio.pause());
  }

  public cancelFade() {
    if (this.fadeTimer) {
      clearInterval(this.fadeTimer);
      this.fadeTimer = null;
    }
  }
}

/**
 * Plays the menu music. Callers only describe what *should* be heard via `setTarget`.
 *
 * Two decks alternate so a new track fades in while the previous one fades out (crossfade).
 * Pausing keeps the position, so a track that comes back (e.g. idle music) resumes where it was.
 * If the browser blocks autoplay, playback starts on the first click or key press anywhere.
 */
class MenuMusicPlayer {
  private decks: [Deck, Deck] | null = null;
  private active = 0;

  private targetUrl: string | null = null;
  private targetVolume = 0;
  private fadeMs = 1500;

  private unlockListening = false;

  public setFadeDuration(ms: number) {
    this.fadeMs = Math.max(0, ms);
  }

  /**
   * @param url track to play, `null` to fade out and pause
   * @param volume 0..1
   */
  public setTarget(url: string | null, volume: number) {
    const resolvedUrl = url ? new URL(url, window.location.origin).href : null;
    const clampedVolume = Math.min(1, Math.max(0, volume));

    if (resolvedUrl === this.targetUrl && clampedVolume === this.targetVolume) return;
    this.targetUrl = resolvedUrl;
    this.targetVolume = clampedVolume;

    const [current, other] = this.getDecks();

    if (!resolvedUrl || clampedVolume === 0) {
      current.fadeOutAndPause(this.fadeMs);
      other.fadeOutAndPause(this.fadeMs);
      return;
    }

    if (current.url === resolvedUrl) {
      other.fadeOutAndPause(this.fadeMs);
      this.play(current);
      return;
    }

    // crossfade: the old track fades out while the new one fades in on the other deck
    current.fadeOutAndPause(this.fadeMs);
    this.active = 1 - this.active;

    if (other.url !== resolvedUrl) {
      other.cancelFade();
      other.audio.pause();
      other.audio.volume = 0;
      other.audio.src = resolvedUrl;
    }
    this.play(other);
  }

  /** Start whatever should be playing right now, call it from a user gesture to bypass autoplay blocking. */
  public resume() {
    if (this.targetUrl && this.targetVolume > 0) {
      this.play(this.getDecks()[0]);
    }
  }

  public stop() {
    this.setTarget(null, 0);
  }

  /** `[active, inactive]` */
  private getDecks(): [Deck, Deck] {
    if (!this.decks) this.decks = [new Deck(), new Deck()];
    return this.active === 0 ? [this.decks[0], this.decks[1]] : [this.decks[1], this.decks[0]];
  }

  private play(deck: Deck) {
    if (!deck.audio.paused) {
      deck.fadeTo(this.targetVolume, this.fadeMs);
      return;
    }

    deck.cancelFade();
    deck.audio.volume = 0;
    deck.audio
      .play()
      .then(() => {
        if (deck !== this.getDecks()[0] || !this.targetUrl) return;
        this.stopWaitingForUnlock();
        deck.fadeTo(this.targetVolume, this.fadeMs);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          this.waitForUnlock();
        } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.warn('[menu music] failed to play track', deck.url, err);
        }
      });
  }

  private onUnlockGesture = () => this.resume();

  private waitForUnlock() {
    if (this.unlockListening) return;
    this.unlockListening = true;

    for (const event of UNLOCK_EVENTS) document.addEventListener(event, this.onUnlockGesture, true);
  }

  private stopWaitingForUnlock() {
    if (!this.unlockListening) return;
    this.unlockListening = false;

    for (const event of UNLOCK_EVENTS) document.removeEventListener(event, this.onUnlockGesture, true);
  }
}

export const player = new MenuMusicPlayer();
