// any of these counts as the "first interaction" browsers require before audio may play
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'mousedown', 'click', 'keydown', 'touchend'] as const;

/** Equal-power curve, keeps the perceived loudness steady while two tracks overlap. */
function ease(progress: number, rising: boolean): number {
  return rising ? Math.sin((progress * Math.PI) / 2) : 1 - Math.cos((progress * Math.PI) / 2);
}

/** One audio element with its own volume fade. */
class Deck {
  public readonly audio: HTMLAudioElement;
  private fadeTimer: ReturnType<typeof setInterval> | null = null;

  constructor(onTimeUpdate: (deck: Deck) => void, onEnded: (deck: Deck) => void) {
    this.audio = new Audio();
    this.audio.loop = true;
    this.audio.preload = 'auto';
    this.audio.volume = 0;
    this.audio.addEventListener('error', () => {
      if (this.audio.src) console.warn('[menu music] failed to load track', this.audio.src, this.audio.error);
    });
    this.audio.addEventListener('timeupdate', () => onTimeUpdate(this));
    this.audio.addEventListener('ended', () => onEnded(this));
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
 * Looping works the same way: shortly before a track ends, a fresh copy of it fades in on the
 * other deck while the ending one fades out, so the loop point is a crossfade instead of a jump.
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
    if (!this.decks) {
      const onTimeUpdate = (deck: Deck) => this.maybeCrossfadeLoop(deck);
      const onEnded = (deck: Deck) => this.restartEnded(deck);
      this.decks = [new Deck(onTimeUpdate, onEnded), new Deck(onTimeUpdate, onEnded)];
    }
    return this.active === 0 ? [this.decks[0], this.decks[1]] : [this.decks[1], this.decks[0]];
  }

  /**
   * Tracks long enough to hold two fades loop by crossfading into themselves, everything else
   * (no fade, very short tracks, streams without a duration) uses the browser's own seamless loop.
   */
  private maybeCrossfadeLoop(deck: Deck) {
    const { audio } = deck;
    const fadeSeconds = this.fadeMs / 1000;
    const crossfade = fadeSeconds > 0 && Number.isFinite(audio.duration) && audio.duration > fadeSeconds * 2;
    audio.loop = !crossfade;

    const [current, other] = this.getDecks();
    if (!crossfade || deck !== current || audio.paused || !this.targetUrl || deck.url !== this.targetUrl) return;

    const remaining = audio.duration - audio.currentTime;
    if (remaining > fadeSeconds) return;

    // start the same track from the beginning on the other deck and crossfade into it
    this.active = 1 - this.active;
    other.cancelFade();
    other.audio.pause();
    other.audio.volume = 0;
    if (other.url !== deck.url) other.audio.src = deck.url;
    other.audio.currentTime = 0;

    current.fadeOutAndPause(Math.max(remaining * 1000, 50));
    this.play(other);
  }

  /** Safety net if the end was reached before the crossfade could start (e.g. a throttled background tab). */
  private restartEnded(deck: Deck) {
    if (deck !== this.getDecks()[0] || !this.targetUrl || deck.url !== this.targetUrl) return;

    deck.audio.currentTime = 0;
    this.play(deck);
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
