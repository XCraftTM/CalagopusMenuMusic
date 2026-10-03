import { player } from './player.ts';

/**
 * Plays interface sounds. While one plays, the music is ducked (faded out and paused) and it fades
 * back in once the sound has finished. A new sound replaces one that is still playing, and the music
 * waits for the last one.
 */
class InterfaceSoundPlayer {
  private cache = new Map<string, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;
  private releaseFadeMs = 250;
  private safetyTimer: ReturnType<typeof setTimeout> | null = null;

  /** Loads sounds ahead of time so a click plays them without delay. */
  public preload(urls: string[]) {
    for (const url of urls) this.audioFor(url);
  }

  public play(url: string, volume: number, fadeMs: number) {
    const audio = this.audioFor(url);

    if (this.current && this.current !== audio) {
      this.current.pause();
      this.current.currentTime = 0;
    }
    this.current = audio;
    this.releaseFadeMs = fadeMs;
    this.clearSafetyTimer();

    // the sound starts right away while the music fades out underneath it
    player.duck(fadeMs);

    const finish = () => {
      if (this.current !== audio) return;
      this.current = null;
      this.clearSafetyTimer();
      player.unduck(this.releaseFadeMs);
    };
    audio.onended = finish;
    audio.onerror = finish;

    audio.volume = Math.min(1, Math.max(0, volume));
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        if (this.current !== audio) return;
        // in case `ended` never fires (e.g. the tab got suspended), release the music anyway
        const remaining = Number.isFinite(audio.duration) ? audio.duration - audio.currentTime : 15;
        this.safetyTimer = setTimeout(finish, Math.max(remaining, 0) * 1000 + 1000);
      })
      .catch((err: unknown) => {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          console.warn('[menu music] failed to play interface sound', url, err);
        }
        finish();
      });
  }

  private audioFor(url: string): HTMLAudioElement {
    const resolved = new URL(url, window.location.origin).href;
    let audio = this.cache.get(resolved);
    if (!audio) {
      audio = new Audio(resolved);
      audio.preload = 'auto';
      this.cache.set(resolved, audio);
    }
    return audio;
  }

  private clearSafetyTimer() {
    if (this.safetyTimer) {
      clearTimeout(this.safetyTimer);
      this.safetyTimer = null;
    }
  }
}

export const sfx = new InterfaceSoundPlayer();
