import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { ChessGame } from '@chess3d/chess-core';
import type { GameSummary } from '@chess3d/shared';

vi.mock('@react-three/fiber', () => ({ Canvas: () => null }));
vi.mock('../../board/ChessScene', () => ({ ChessScene: () => null }));

import { GameBoardPanel } from './GameViewParts';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

it("counts down the active player's clock while the opponent clock stays still", () => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  const selectedGame: GameSummary = {
    id: 'game-1',
    code: 'CLOCK1',
    status: 'active',
    whitePlayerId: 'white',
    blackPlayerId: 'black',
    timeControl: { initialMs: 15 * 60_000, incrementMs: 0 },
    whiteRemainingMs: 15 * 60_000,
    blackRemainingMs: 15 * 60_000,
    turnStartedAt: 1_000_000,
  };

  const panel = (game: GameSummary) => (
    <GameBoardPanel
      user={{ id: 'white', username: 'White', email: 'white@example.com', rating: 1200 }}
      selectedGame={game}
      gameState={new ChessGame().getState()}
      boardColor="white"
      legalTargets={[]}
      selectedSquare={null}
      moveHistory={[]}
      spectatorMode={false}
      turnLabel="White"
      t={(key) => key}
      onSelectSquare={() => undefined}
    />
  );
  const { rerender } = render(panel(selectedGame));

  expect(screen.getAllByText('15:00')).toHaveLength(2);
  act(() => vi.advanceTimersByTime(1_100));
  expect(screen.getByText('14:59')).toBeTruthy();
  expect(screen.getAllByText('15:00')).toHaveLength(1);

  rerender(panel({ ...selectedGame, whiteRemainingMs: 14 * 60_000 + 59_000 }));
  expect(screen.getByText('14:59')).toBeTruthy();
  act(() => vi.advanceTimersByTime(1_300));
  expect(screen.getByText('14:58')).toBeTruthy();
});
