import { describe, expect, it } from 'vitest';

import { paginate, seasonBounds } from './RatingService.js';

describe('seasonBounds', () => {
  it('starts every season on Sunday at Berlin midnight', () => {
    const first = seasonBounds(new Date('2026-09-13T00:00:00.000Z'), '2026-09-13');
    const second = seasonBounds(new Date('2026-11-08T00:00:00.000Z'), '2026-09-13');

    expect(first.sequence).toBe(1);
    expect(first.startsAt.toISOString()).toBe('2026-09-12T22:00:00.000Z');
    expect(first.endsAt.toISOString()).toBe('2026-11-07T23:00:00.000Z');
    expect(second.sequence).toBe(2);
    expect(second.startsAt.toISOString()).toBe('2026-11-07T23:00:00.000Z');
  });

  it('uses the next season at the exact end instant', () => {
    const atBoundary = seasonBounds(new Date('2026-11-07T23:00:00.000Z'), '2026-09-13');
    expect(atBoundary.sequence).toBe(2);
  });
});

describe('paginate', () => {
  it('keeps global order and reports the next page', () => {
    expect(paginate(['a', 'b', 'c'], 2, 2)).toEqual({
      entries: ['c'],
      page: 2,
      pageSize: 2,
      total: 3,
      hasNext: false,
      currentUserEntry: null,
    });
  });
});
