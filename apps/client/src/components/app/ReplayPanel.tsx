import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';

import { ChessGame, STARTING_FEN, type Move } from '@chess3d/chess-core';

import { formatClock } from '../../app/utils';
import type { HistoryGame, HistoryMove } from '../../app/types';
import type { Translator } from '../../i18n';
import { ChessScene } from '../../board/ChessScene';

const REPLAY_SPEEDS = [0.25, 0.5, 1, 2, 4, 8] as const;

function buildPositions(moves: HistoryMove[], initialFen = STARTING_FEN): string[] {
  const chess = new ChessGame(initialFen);
  const positions = [initialFen];

  for (const move of moves) {
    try {
      chess.move({
        from: move.from as Move['from'],
        to: move.to as Move['to'],
        ...(move.promotion ? { promotion: move.promotion as Move['promotion'] } : {}),
      });
      positions.push(chess.getState().fen);
    } catch {
      positions.push(move.fenAfterMove);
    }
  }

  return positions;
}

function replayDelay(moves: HistoryMove[], position: number, speed: number): number {
  const nextMove = moves[position];
  if (!nextMove) return 0;
  const previousElapsed = position === 0 ? 0 : (moves[position - 1]?.elapsedMs ?? 0);
  return Math.max(120, nextMove.elapsedMs - previousElapsed) / speed;
}

export function ReplayPanel({
  game,
  userId,
  t,
}: Readonly<{ game: HistoryGame & { initialFen?: string }; userId: string; t: Translator }>) {
  const positions = useMemo(
    () => buildPositions(game.moves, game.initialFen),
    [game.initialFen, game.moves],
  );
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof REPLAY_SPEEDS)[number]>(1);
  const boardColor = game.whitePlayer?.id === userId ? 'white' : 'black';
  const currentMove = position > 0 ? game.moves[position - 1] : undefined;
  const currentFen = positions[position] ?? game.initialFen ?? STARTING_FEN;

  useEffect(() => {
    setPosition(0);
    setPlaying(false);
    setSpeed(1);
  }, [game.id]);

  useEffect(() => {
    if (!playing) return;
    if (position >= game.moves.length) {
      setPlaying(false);
      return;
    }

    const timer = globalThis.setTimeout(
      () => setPosition((current) => current + 1),
      replayDelay(game.moves, position, speed),
    );
    return () => globalThis.clearTimeout(timer);
  }, [game.moves, playing, position, speed]);

  function togglePlaying() {
    if (position >= game.moves.length) setPosition(0);
    setPlaying((current) => !current);
  }

  function stepTo(nextPosition: number) {
    setPlaying(false);
    setPosition(Math.min(game.moves.length, Math.max(0, nextPosition)));
  }

  const lastMove: Move | undefined = currentMove
    ? {
        from: currentMove.from as Move['from'],
        to: currentMove.to as Move['to'],
        ...(currentMove.promotion ? { promotion: currentMove.promotion as Move['promotion'] } : {}),
      }
    : undefined;

  return (
    <section className="grid min-w-0 content-start gap-3" aria-label={t('replay.title')}>
      <div className="flex items-start justify-between gap-4 max-[620px]:flex-col">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.12em] text-app-accent">
            {t('replay.label')}
          </span>
          <h3 className="mt-1 text-xl font-semibold text-app-text-strong">{t('replay.title')}</h3>
        </div>
        <span className="rounded-full border border-app-border bg-app-muted px-2.5 py-1 text-xs font-semibold text-app-text-muted">
          {position} / {game.moves.length} {t('replay.moves')}
        </span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-app-border bg-[radial-gradient(circle_at_50%_20%,rgb(71_112_153_/_16%),transparent_55%),var(--game-canvas)] p-1.5 shadow-[0_14px_32px_rgb(18_37_59_/_12%)]">
        <div className="h-[clamp(18rem,34vw,30rem)] w-full overflow-hidden rounded-[.85rem]">
          <Canvas
            className="!block !h-full !min-h-0 !w-full"
  camera={{ position: [0, 9.3, boardColor === 'black' ? -10.8 : 10.8], fov: 29 }}
            shadows
          >
            <ChessScene
              autoOrient={false}
              boardColor={boardColor}
              fen={currentFen}
              highlightedSquares={[]}
              interactive={false}
              lastMove={lastMove}
              selectedSquare={null}
              onSelectSquare={() => undefined}
            />
          </Canvas>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-app-border bg-app-muted p-3.5">
        <input
          className="h-1.5 w-full cursor-pointer accent-[var(--accent)]"
          type="range"
          min="0"
          max={game.moves.length}
          step="1"
          value={position}
          aria-label={t('replay.position')}
          onChange={(event) => stepTo(Number(event.target.value))}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              className="grid size-10 cursor-pointer place-items-center rounded-lg border border-app-border-strong bg-app-surface text-app-text transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              aria-label={t('replay.restart')}
              onClick={() => stepTo(0)}
              disabled={position === 0}
            >
              «
            </button>
            <button
              className="grid size-10 cursor-pointer place-items-center rounded-lg border border-app-border-strong bg-app-surface text-app-text transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              aria-label={t('replay.previous')}
              onClick={() => stepTo(position - 1)}
              disabled={position === 0}
            >
              ‹
            </button>
            <button
              className="inline-flex min-h-10 min-w-24 cursor-pointer items-center justify-center rounded-lg border border-app-accent bg-app-accent px-3 text-sm font-bold text-white transition hover:brightness-110"
              type="button"
              onClick={togglePlaying}
            >
              {playing ? t('replay.pause') : t('replay.play')}
            </button>
            <button
              className="grid size-10 cursor-pointer place-items-center rounded-lg border border-app-border-strong bg-app-surface text-app-text transition hover:border-app-accent hover:text-app-accent disabled:cursor-not-allowed disabled:opacity-40"
              type="button"
              aria-label={t('replay.next')}
              onClick={() => stepTo(position + 1)}
              disabled={position >= game.moves.length}
            >
              ›
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-app-text-muted">
            <span>{t('replay.speed')}</span>
            <select
              className="rounded-lg border border-app-border-strong bg-app-surface px-2 py-1.5 text-app-text outline-none focus:border-app-accent"
              value={speed}
              onChange={(event) =>
                setSpeed(Number(event.target.value) as (typeof REPLAY_SPEEDS)[number])
              }
            >
              {REPLAY_SPEEDS.map((value) => (
                <option key={value} value={value}>
                  {value}×{value === 1 ? ` · ${t('replay.realtime')}` : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex items-center justify-between gap-3 text-xs text-app-text-muted">
          <span>
            {currentMove
              ? `${currentMove.san} · ${formatClock(currentMove.elapsedMs)}`
              : t('replay.start')}
          </span>
          <span>{game.moves.length ? t('replay.ready') : t('replay.noMoves')}</span>
        </div>
      </div>
    </section>
  );
}
