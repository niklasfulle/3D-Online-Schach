let moveSound: HTMLAudioElement | undefined;

function getMoveSound(): HTMLAudioElement | undefined {
  if (globalThis.Audio === undefined) return undefined;
  if (!moveSound) {
    moveSound = new Audio('/sounds/chess-move.wav');
    moveSound.preload = 'auto';
    moveSound.volume = 0.18;
  }
  return moveSound;
}

export function primeMoveSound(): void {
  getMoveSound();
}

export function playMoveSound(): void {
  const sound = getMoveSound();
  if (!sound) return;
  sound.currentTime = 0;
  void sound.play().catch(() => undefined);
}
