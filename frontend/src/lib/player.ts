export interface PlayerState {
  /** Playback was refused by the browser's autoplay policy and waits for a user gesture. */
  blocked: boolean;
  /** Something is audible (or fading in) right now. */
  playing: boolean;
  /** The URL the player is trying to play, `null` while silent. */
  url: string | null;
}

const UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchend'] as const;

/**
 * A single looping audio element with volume fades.
 *
 * Callers only describe what *should* be heard via `setTarget`; the player
 * takes care of fading out the old track, switching sources, fading in, and
 * retrying after the first user interaction when autoplay is blocked.
 */
class MenuMusicPlayer {
  private audio: HTMLAudioElement | null = null;
  private targetUrl: string | null = null;
  private targetVolume = 0;
  private fadeMs = 1500;

  private fadeFrame: ReturnType<typeof setInterval> | null = null;
  private switchToken = 0;
  private unlockListening = false;

  private state: PlayerState = { blocked: false, playing: false, url: null };
  private listeners = new Set<(state: PlayerState) => void>();

  public getState(): PlayerState {
    return this.state;
  }

  public subscribe(listener: (state: PlayerState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

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

    const urlChanged = resolvedUrl !== this.targetUrl;
    this.targetUrl = resolvedUrl;
    this.targetVolume = clampedVolume;

    if (!resolvedUrl || clampedVolume === 0) {
      this.fadeOutAndPause();
      return;
    }

    if (urlChanged && this.audio && this.audio.src !== resolvedUrl) {
      this.switchTrack(resolvedUrl);
      return;
    }

    this.ensurePlaying(resolvedUrl);
  }

  /** Retry playback right now, must be called from a user gesture to bypass autoplay blocking. */
  public resume() {
    if (this.targetUrl && this.targetVolume > 0) {
      this.ensurePlaying(this.targetUrl);
    }
  }

  public stop() {
    this.targetUrl = null;
    this.targetVolume = 0;
    this.fadeOutAndPause();
  }

  private getAudio(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio();
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = 0;
      audio.addEventListener('error', () => {
        if (!audio.src) return;
        console.warn('[menu music] failed to load track', audio.src, audio.error);
        this.update({ playing: false });
      });

      this.audio = audio;
    }

    return this.audio;
  }

  private update(state: Partial<PlayerState>) {
    const next = { ...this.state, ...state };
    if (next.blocked === this.state.blocked && next.playing === this.state.playing && next.url === this.state.url) {
      return;
    }

    this.state = next;
    for (const listener of this.listeners) listener(next);
  }

  private fadeTo(volume: number, duration: number, done?: () => void) {
    const audio = this.getAudio();

    if (this.fadeFrame) {
      clearInterval(this.fadeFrame);
      this.fadeFrame = null;
    }

    const from = audio.volume;
    if (duration <= 0 || from === volume) {
      audio.volume = volume;
      done?.();
      return;
    }

    // scale the fade by the distance so a short volume tweak is not as slow as a full fade
    const total = duration * Math.min(1, Math.abs(volume - from) / Math.max(this.targetVolume, from, 0.01));
    const start = performance.now();

    this.fadeFrame = setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / Math.max(total, 1));
      audio.volume = Math.min(1, Math.max(0, from + (volume - from) * progress));

      if (progress >= 1) {
        if (this.fadeFrame) clearInterval(this.fadeFrame);
        this.fadeFrame = null;
        done?.();
      }
    }, 25);
  }

  private fadeOutAndPause() {
    const token = ++this.switchToken;
    if (!this.audio || this.audio.paused) {
      this.update({ playing: false, url: null, blocked: false });
      return;
    }

    this.update({ playing: false, url: null });
    this.fadeTo(0, this.fadeMs, () => {
      if (token === this.switchToken) this.audio?.pause();
    });
  }

  private switchTrack(url: string) {
    const token = ++this.switchToken;
    const audio = this.getAudio();

    const start = () => {
      if (token !== this.switchToken) return;
      audio.pause();
      audio.src = url;
      audio.currentTime = 0;
      this.ensurePlaying(url);
    };

    if (audio.paused || audio.volume === 0) {
      start();
    } else {
      this.fadeTo(0, this.fadeMs / 2, start);
    }
  }

  private ensurePlaying(url: string) {
    const token = ++this.switchToken;
    const audio = this.getAudio();

    if (audio.src !== url) {
      audio.src = url;
    }

    this.update({ url, playing: true });

    if (!audio.paused) {
      this.fadeTo(this.targetVolume, this.fadeMs);
      return;
    }

    audio.volume = 0;
    audio
      .play()
      .then(() => {
        if (token !== this.switchToken) return;
        this.update({ blocked: false, playing: true });
        this.fadeTo(this.targetVolume, this.fadeMs);
      })
      .catch((err: unknown) => {
        if (token !== this.switchToken) return;

        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          this.update({ blocked: true, playing: false });
          this.waitForUnlock();
        } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.warn('[menu music] failed to play track', url, err);
          this.update({ playing: false });
        }
      });
  }

  private waitForUnlock() {
    if (this.unlockListening) return;
    this.unlockListening = true;

    const unlock = () => {
      for (const event of UNLOCK_EVENTS) document.removeEventListener(event, unlock, true);
      this.unlockListening = false;
      this.resume();
    };

    for (const event of UNLOCK_EVENTS) document.addEventListener(event, unlock, true);
  }
}

export const player = new MenuMusicPlayer();
