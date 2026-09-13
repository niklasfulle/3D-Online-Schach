import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('move sound', () => {
  it('does nothing when audio playback is unavailable', async () => {
    vi.stubGlobal('Audio', undefined);
    const { playMoveSound, primeMoveSound } = await import('./moveSound');

    expect(() => primeMoveSound()).not.toThrow();
    expect(() => playMoveSound()).not.toThrow();
  });

  it('preloads and plays the recorded chess piece sound', async () => {
    const sound = { preload: '', volume: 1, currentTime: 5, play: vi.fn().mockResolvedValue(undefined) };
    const Audio = vi.fn(() => sound);
    vi.stubGlobal('Audio', Audio);
    const { playMoveSound, primeMoveSound } = await import('./moveSound');

    primeMoveSound();
    playMoveSound();

    expect(Audio).toHaveBeenCalledExactlyOnceWith('/sounds/chess-move.wav');
    expect(sound.preload).toBe('auto');
    expect(sound.volume).toBe(0.18);
    expect(sound.currentTime).toBe(0);
    expect(sound.play).toHaveBeenCalledOnce();
  });
});
