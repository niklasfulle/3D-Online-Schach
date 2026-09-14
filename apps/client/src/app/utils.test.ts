import { describe, expect, it } from 'vitest';

import {
  pathForView,
  seasonLeaderboardIdFromPath,
  seasonLeaderboardPath,
  viewFromPath,
} from './utils';

describe('season leaderboard navigation', () => {
  it('supports direct links to an archived season', () => {
    const path = seasonLeaderboardPath('season/2026');

    expect(path).toBe('/leaderboard/seasons/season%2F2026');
    expect(seasonLeaderboardIdFromPath(path)).toBe('season/2026');
    expect(viewFromPath(path)).toBe('leaderboard');
    expect(pathForView('leaderboard')).toBe('/leaderboard');
  });
});
