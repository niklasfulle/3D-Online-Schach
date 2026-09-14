import { useEffect, useState } from 'react';

import type { GameMode, UserRole } from '@chess3d/shared';

import { API_URL } from '../../app/config';
import type {
  AdminUser,
  CorrespondenceGame,
  FriendsOverview,
  HistoryGame,
  HistoryModeFilter,
  HistoryResultFilter,
  LeaderboardData,
  LobbyGame,
  ProfileBreakdown,
  ReplayGame,
  SocialUser,
  UserProfile,
  SeasonSummary,
} from '../../app/types';
import type { Language, Translator } from '../../i18n';
import {
  formatHistoryDate,
  formatClock,
  gameModeLabel,
  gameLabel,
  gameStatusLabel,
  historyOutcome,
  matchesHistoryFilter,
} from '../../app/utils';
import { ReplayPanel } from './ReplayPanel';

function historyResultMark(result: HistoryGame['result']): string {
  if (!result) return '—';
  if (result === 'draw') return '½';
  return result === 'white' ? '1' : '0';
}

function formatRatingDelta(delta: number | undefined, prefix = ''): string | undefined {
  if (delta === undefined) return undefined;
  const sign = delta > 0 ? '+' : '';
  return `${prefix}${sign}${delta}`;
}

function formatRemainingTime(milliseconds: number): string {
  const totalHours = Math.max(0, Math.floor(milliseconds / 3_600_000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return `${days}d ${hours}h`;
}

function breakdownLabel(breakdown: ProfileBreakdown): string {
  return `${breakdown.wins} / ${breakdown.losses} / ${breakdown.draws}`;
}

function profileMetricIcon(color: string): string {
  if (color === 'green') return '↗';
  if (color === 'red') return '↘';
  if (color === 'gold') return '◇';
  return '◈';
}

const panelLabelClass = 'text-xs font-bold uppercase tracking-[.12em] text-app-accent';
const mutedClass = 'text-app-text-muted';
const profileMetricClasses: Record<string, string> = {
  blue: 'bg-[#1e3d5e] text-[#c0e3ff]',
  green: 'bg-[#1e4938] text-[#9de4b8]',
  red: 'bg-[#5a2535] text-[#ffd8de]',
  gold: 'bg-[#4d3b20] text-[#f1cc79]',
};

function profileMetricClass(color: string) {
  return profileMetricClasses[color] ?? profileMetricClasses.blue;
}
const cardClass = 'w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg';
const secondaryButtonClass =
  'inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-app-accent/45 bg-[var(--action-surface)] px-3.5 py-2.5 text-center text-xs font-bold leading-tight text-[var(--action-text)] transition hover:border-app-accent hover:bg-[var(--action-surface-hover)] hover:text-white active:translate-y-px';
const tinyButtonClass =
  'inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-app-accent/40 bg-[var(--action-surface)] px-2.5 py-1.5 text-[.7rem] font-bold leading-tight text-[var(--action-text)] transition hover:-translate-y-px hover:border-app-accent hover:bg-[var(--action-surface-hover)] hover:text-white';
const quietButtonClass =
  'cursor-pointer rounded-xl px-3 py-2 text-app-accent transition hover:bg-app-muted disabled:cursor-not-allowed disabled:opacity-60';

export function LobbyView({
  t,
  games,
  onRefresh,
  onCreate,
  onJoin,
  onDelete,
}: Readonly<{
  t: Translator;
  games: LobbyGame[];
  onRefresh: () => void;
  onCreate: (mode: GameMode) => void;
  onJoin: (code: string) => void;
  onDelete: (code: string) => void;
}>) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 1_000);
    return () => globalThis.clearInterval(timer);
  }, []);

  return (
    <div className="grid w-full gap-4">
      <section className="relative flex min-h-[180px] items-center justify-between gap-6 overflow-hidden rounded-2xl border border-[var(--lobby-hero-border)] bg-[var(--lobby-hero)] p-6 shadow-lg max-sm:flex-col max-sm:items-start">
        <div>
          <span className={panelLabelClass}>{t('lobby.nextMove')}</span>
          <h2 className="mb-2 text-2xl font-semibold text-[var(--lobby-hero-text)]">
            {t('lobby.findGame')}
          </h2>
          <p className="mb-4 max-w-prose text-[var(--lobby-hero-muted)]">
            {t('lobby.description')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="min-h-11 cursor-pointer rounded-xl bg-[var(--lobby-hero-primary)] px-4 py-3 font-semibold text-white transition hover:bg-[var(--lobby-hero-primary-hover)]"
              type="button"
              onClick={() => onCreate('casual')}
            >
              {t('lobby.createCasual')} <span aria-hidden="true">→</span>
            </button>
            <button
              className="min-h-11 cursor-pointer rounded-xl border border-[var(--lobby-hero-secondary-border)] bg-transparent px-4 py-3 text-[var(--lobby-hero-secondary-text)] transition hover:bg-app-muted"
              type="button"
              onClick={() => onCreate('ranked')}
            >
              {t('lobby.playRanked')}
            </button>
            <button
              className="min-h-11 cursor-pointer rounded-xl border border-[var(--lobby-hero-secondary-border)] bg-transparent px-4 py-3 text-[var(--lobby-hero-secondary-text)] transition hover:bg-app-muted"
              type="button"
              onClick={() => onCreate('correspondence')}
            >
              {t('lobby.createCorrespondence')}
            </button>
            <span className="basis-full text-xs text-[var(--lobby-hero-muted)]">
              {t('lobby.correspondenceDescription')}
            </span>
          </div>
        </div>
        <div
          className="absolute right-[6%] top-1/2 -translate-y-1/2 text-[8rem] leading-none text-app-accent opacity-10 max-sm:bottom-[-1.5rem] max-sm:right-[4%] max-sm:top-auto max-sm:translate-y-0 max-sm:text-[6rem]"
          aria-hidden="true"
        >
          ♞
        </div>
      </section>
      <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        <div className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1e3d5e] text-lg text-[#c0e3ff]"
            aria-hidden="true"
          >
            ◈
          </span>
          <div className="grid min-w-0 gap-1">
            <span className={mutedClass}>{t('lobby.openGames')}</span>
            <strong className="block text-lg font-bold text-app-text-strong">{games.length}</strong>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#4d3b20] text-lg text-[#f1cc79]"
            aria-hidden="true"
          >
            ✦
          </span>
          <div className="grid min-w-0 gap-1">
            <span className={mutedClass}>{t('lobby.gameModes')}</span>
            <strong className="block text-lg font-bold text-app-text-strong">
              {t('mode.casual')} · {t('mode.ranked')} · {t('mode.correspondence')}
            </strong>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1e4938] text-lg text-[#9de4b8]"
            aria-hidden="true"
          >
            ◉
          </span>
          <div className="grid min-w-0 gap-1">
            <span className={mutedClass}>{t('lobby.serverStatus')}</span>
            <strong className="block text-lg font-bold text-app-text-strong">
              {t('header.online')}
            </strong>
          </div>
        </div>
      </div>
      <section className={cardClass}>
        <div className="flex items-center justify-between gap-4 border-b border-app-border pb-4 max-[480px]:items-start max-[480px]:flex-col">
          <div>
            <span className={panelLabelClass}>{t('lobby.liveGames')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('lobby.title')}</h2>
          </div>
          <button
            className="min-h-11 cursor-pointer rounded-xl px-3 py-2 text-app-accent transition hover:bg-app-muted"
            type="button"
            onClick={onRefresh}
          >
            <span aria-hidden="true">↻</span> {t('lobby.refresh')}
          </button>
        </div>
        {games.length === 0 ? (
          <div className="grid justify-items-center gap-2 p-6 text-center">
            <div
              className="grid size-10 place-items-center rounded-xl bg-[#1e3d5e] text-xl text-[#d4a34e]"
              aria-hidden="true"
            >
              ♟
            </div>
            <strong>{t('lobby.emptyTitle')}</strong>
            <span className={mutedClass}>{t('lobby.emptyDescription')}</span>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            {games.map((game) => (
              <div
                className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-[clamp(.75rem,1.5vw,1.25rem)] border-t border-app-border px-3 py-3.5 transition hover:bg-app-muted max-[720px]:grid-cols-[minmax(0,1fr)_auto] max-[480px]:grid-cols-1"
                key={game.code}
              >
                <div className="flex min-w-0 max-w-[min(38rem,52vw)] items-center gap-3">
                  <div
                    className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#1e3d5e] text-lg text-[#c0e3ff]"
                    aria-hidden="true"
                  >
                    {game.mode === 'ranked' ? '♛' : '♙'}
                  </div>
                  <div className="grid min-w-0 gap-0.5">
                    <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-sm text-app-text-strong">
                      {gameLabel(game, t)}
                    </strong>
                    <span className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-app-text-muted">
                      5 {t('game.minutes')} · {t('lobby.openGameDescription')}
                      {game.expiresAt
                        ? ` · verfällt in ${formatClock(Math.max(0, game.expiresAt - now))}`
                        : ''}
                    </span>
                  </div>
                </div>
                <span className="inline-flex min-h-9 min-w-max items-center gap-1.5 text-[.68rem] text-[#8acda5] max-[720px]:col-start-1 max-[720px]:justify-self-start">
                  <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />
                  {game.isOwner ? t('lobby.yourGame') : t('lobby.waiting')}
                </span>
                <div className="grid grid-cols-[auto_2.55rem] items-center gap-2.5 max-[720px]:col-start-2 max-[720px]:row-span-2 max-[480px]:col-start-1 max-[480px]:row-auto max-[480px]:grid-cols-[minmax(0,1fr)_2.55rem]">
                  <button
                    className={`${secondaryButtonClass} h-[2.55rem] min-h-[2.55rem] gap-1.5 px-3 text-[.72rem]`}
                    type="button"
                    onClick={() => onJoin(game.code)}
                  >
                    {game.isOwner ? t('lobby.open') : t('lobby.join')}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                  {game.isOwner ? (
                    <button
                      className="grid size-[2.55rem] cursor-pointer place-items-center rounded-lg border border-[var(--danger-control-border)] bg-[var(--danger-control)] text-[var(--danger-control-text)] transition hover:-translate-y-px hover:border-[#f595a3] hover:bg-[var(--danger-control-hover)] hover:text-[var(--danger-control-hover-text)]"
                      type="button"
                      aria-label={`${t('lobby.deleteGame')} ${game.code} ${t('lobby.deleteSuffix')}`}
                      title={t('lobby.delete')}
                      onClick={() => onDelete(game.code)}
                    >
                      <svg
                        className="size-5"
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path
                          d="M5 7h14M10 4h4a1 1 0 0 1 1 1v2H9V5a1 1 0 0 1 1-1Z"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="m7 7 .8 12h8.4L17 7M10 11v5M14 11v5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function CorrespondenceView({
  t,
  games,
  onStart,
  onOpen,
}: Readonly<{
  t: Translator;
  games: CorrespondenceGame[];
  onStart: () => void;
  onOpen: (game: CorrespondenceGame) => void;
}>) {
  return (
    <div className="grid w-full min-w-0 gap-4">
      <section
        className={`${cardClass} flex items-center justify-between gap-5 max-sm:flex-col max-sm:items-start`}
      >
        <div className="grid gap-2">
          <span className={panelLabelClass}>{t('correspondence.label')}</span>
          <h2 className="text-xl font-semibold text-app-text-strong">
            {t('correspondence.listTitle')}
          </h2>
          <p className={mutedClass}>{t('correspondence.listDescription')}</p>
        </div>
        <button className={secondaryButtonClass} type="button" onClick={onStart}>
          {t('correspondence.start')}
        </button>
      </section>
      <section className={cardClass} aria-label={t('correspondence.listTitle')}>
        {games.length ? (
          <div className="grid gap-2">
            {games.map((game) => (
              <button
                className="grid min-h-[4.75rem] grid-cols-[2.1rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-app-border bg-app-muted px-3.5 py-3 text-left transition hover:border-app-border-strong hover:bg-app-surface max-[620px]:grid-cols-[2.1rem_minmax(0,1fr)]"
                key={game.code}
                type="button"
                onClick={() => onOpen(game)}
              >
                <span
                  className="grid size-7 place-items-center rounded-full bg-[#1e3d5e] text-[#bfe2ff]"
                  aria-hidden="true"
                >
                  ♟
                </span>
                <span className="grid min-w-0 gap-1">
                  <strong>{game.code}</strong>
                  <span className={mutedClass}>{gameLabel(game, t)}</span>
                </span>
                <span className="justify-self-end whitespace-nowrap text-sm font-bold text-app-text-strong max-[620px]:col-start-2 max-[620px]:justify-self-start">
                  {gameStatusLabel(game.status, t)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid justify-items-center gap-2 p-6 text-center">
            <div
              className="grid size-10 place-items-center rounded-xl bg-[#1e3d5e] text-xl text-[#d4a34e]"
              aria-hidden="true"
            >
              ♞
            </div>
            <strong>{t('correspondence.empty')}</strong>
            <span className={mutedClass}>{t('correspondence.emptyDescription')}</span>
          </div>
        )}
      </section>
    </div>
  );
}

export function CorrespondenceInvitePopover({
  t,
  friends,
  loading,
  sending,
  game,
  onInvite,
  onClose,
}: Readonly<{
  t: Translator;
  friends: FriendsOverview | null;
  loading: boolean;
  sending: boolean;
  game: CorrespondenceGame | null;
  onInvite: (username: string) => void;
  onClose: () => void;
}>) {
  return (
    <dialog
      open
      className="fixed left-1/2 top-1/2 z-20 grid w-[min(32rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-2xl border border-app-border-strong bg-app-surface p-5 text-app-text shadow-2xl"
      aria-label={t('correspondence.inviteTitle')}
    >
      <div className="grid gap-2">
        <span className={panelLabelClass}>{t('correspondence.label')}</span>
        <h2 className="text-xl font-semibold text-app-text-strong">
          {t('correspondence.inviteTitle')}
        </h2>
        <p className={mutedClass}>{t('correspondence.inviteDescription')}</p>
      </div>
      {renderCorrespondenceInviteContent({ t, friends, loading, sending, game, onInvite })}
      <div className="flex justify-end gap-2 border-t border-app-border pt-4">
        <button className={quietButtonClass} type="button" onClick={onClose} disabled={sending}>
          {t('correspondence.cancel')}
        </button>
      </div>
    </dialog>
  );
}

function renderCorrespondenceInviteContent({
  t,
  friends,
  loading,
  sending,
  game,
  onInvite,
}: Readonly<{
  t: Translator;
  friends: FriendsOverview | null;
  loading: boolean;
  sending: boolean;
  game: CorrespondenceGame | null;
  onInvite: (username: string) => void;
}>) {
  if (loading) return <p className={mutedClass}>{t('correspondence.preparing')}</p>;
  if (!game) return null;
  if (!friends?.friends.length) return <p className={mutedClass}>{t('correspondence.noFriends')}</p>;
  return (
    <div className="grid gap-2" aria-label={t('correspondence.selectFriend')}>
      {friends.friends.map((friend) => (
        <button
          className="flex min-h-11 items-center justify-between rounded-xl border border-app-border bg-app-muted px-3.5 py-2.5 text-left font-semibold transition hover:border-app-accent hover:bg-app-surface disabled:cursor-wait disabled:opacity-60"
          key={friend.id}
          type="button"
          disabled={sending}
          onClick={() => onInvite(friend.username)}
        >
          <span>{friend.username}</span>
          <span className="text-app-accent" aria-hidden="true">
            →
          </span>
        </button>
      ))}
    </div>
  );
}

export function HistoryView({
  t,
  language,
  userId,
  games,
  cursor,
  loading,
  resultFilter,
  modeFilter,
  selectedGame,
  onResultFilterChange,
  onModeFilterChange,
  onSelect,
  onLoadMore,
  onOpenReplay,
}: Readonly<{
  t: Translator;
  language: Language;
  userId: string;
  games: HistoryGame[];
  cursor?: string;
  loading: boolean;
  resultFilter: HistoryResultFilter;
  modeFilter: HistoryModeFilter;
  selectedGame: HistoryGame | null;
  onResultFilterChange: (filter: HistoryResultFilter) => void;
  onModeFilterChange: (filter: HistoryModeFilter) => void;
  onSelect: (game: HistoryGame) => void;
  onLoadMore: () => void;
  onOpenReplay: (code: string) => void;
}>) {
  const filteredGames = games.filter(
    (historyGame) =>
      (modeFilter === 'all' || historyGame.mode === modeFilter) &&
      matchesHistoryFilter(historyGame, userId, resultFilter),
  );

  return (
    <div className="grid w-full min-w-0 gap-4">
      <section className={`${cardClass} min-w-0`}>
        <div className="flex items-center justify-between gap-5 border-b border-[rgb(111_151_201_/_16%)] pb-5 max-[760px]:items-start max-[760px]:flex-col">
          <div>
            <span className={panelLabelClass}>{t('history.label')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
              {t('page.history.title')}
            </h2>
          </div>
          <div className="flex flex-wrap justify-end gap-2.5 max-[760px]:w-full max-[760px]:justify-start">
            <label>
              <span className="sr-only">{t('history.resultFilter')}</span>
              <select
                className="rounded-xl border border-app-border-strong bg-app-muted px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
                aria-label={t('history.resultFilter')}
                value={resultFilter}
                onChange={(event) =>
                  onResultFilterChange(event.target.value as HistoryResultFilter)
                }
              >
                <option value="all">{t('history.all')}</option>
                <option value="wins">{t('history.wins')}</option>
                <option value="losses">{t('history.losses')}</option>
                <option value="draws">{t('history.draws')}</option>
              </select>
            </label>
            <label>
              <span className="sr-only">{t('history.modeFilter')}</span>
              <select
                className="rounded-xl border border-app-border-strong bg-app-muted px-3 py-2 text-sm text-app-text outline-none focus:border-app-accent"
                aria-label={t('history.modeFilter')}
                value={modeFilter}
                onChange={(event) => onModeFilterChange(event.target.value as HistoryModeFilter)}
              >
                <option value="all">{t('history.allModes')}</option>
                <option value="casual">{t('mode.casual')}</option>
                <option value="ranked">{t('mode.ranked')}</option>
                <option value="correspondence">{t('mode.correspondence')}</option>
              </select>
            </label>
          </div>
        </div>
        {filteredGames.length ? (
          <div className="mt-4 grid w-full min-w-0 gap-2">
            {filteredGames.map((historyGame) => {
              const opponent =
                historyGame.whitePlayer?.id === userId
                  ? historyGame.blackPlayer?.username
                  : historyGame.whitePlayer?.username;
              const outcome = historyOutcome(historyGame, userId, t);
              const ratingDelta = formatRatingDelta(historyGame.ratingDelta);
              return (
                <button
                  className={
                    selectedGame?.id === historyGame.id
                      ? 'grid min-h-[4.75rem] cursor-pointer grid-cols-[2.1rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-app-accent bg-[rgb(70_126_190_/_12%)] px-3.5 py-3 text-left text-app-text shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)] transition hover:border-app-accent hover:bg-[rgb(70_126_190_/_18%)] max-[760px]:items-stretch'
                      : 'grid min-h-[4.75rem] cursor-pointer grid-cols-[2.1rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-app-border bg-app-muted px-3.5 py-3 text-left text-app-text transition hover:border-app-border-strong hover:bg-app-surface max-[760px]:items-stretch'
                  }
                  type="button"
                  key={historyGame.id}
                  onClick={() => onSelect(historyGame)}
                >
                  <span
                    className="grid size-7 place-items-center rounded-full bg-[#1e3d5e] font-extrabold text-[#bfe2ff]"
                    data-result={historyGame.result ?? 'unfinished'}
                  >
                    {historyResultMark(historyGame.result)}
                  </span>
                  <span className="grid min-w-0 gap-1">
                    <strong>{historyGame.code}</strong>
                    <span className={mutedClass}>
                      {gameModeLabel(historyGame.mode, t)}{' '}
                      · {t('history.opponent')}: {opponent ?? t('player.open')}
                    </span>
                  </span>
                  <span className="justify-self-end whitespace-nowrap text-sm font-bold text-app-text-strong">
                    {outcome}
                  </span>
                  {ratingDelta ? (
                    <span className="whitespace-nowrap text-xs text-app-accent">
                      {ratingDelta}
                    </span>
                  ) : null}
                  <time
                    className="overflow-hidden text-ellipsis whitespace-nowrap text-xs text-app-text-muted"
                    dateTime={historyGame.finishedAt}
                  >
                    {formatHistoryDate(historyGame.finishedAt, language)}
                  </time>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid justify-items-center gap-2 p-6 text-center">
            <div
              className="grid size-10 place-items-center rounded-xl bg-[#1e3d5e] text-xl text-[#d4a34e]"
              aria-hidden="true"
            >
              ◷
            </div>
            <strong>{t('history.empty')}</strong>
          </div>
        )}
        {cursor ? (
          <button
            className="mt-4 min-h-11 cursor-pointer rounded-xl px-3 py-2 text-app-accent transition hover:bg-app-muted disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('history.loadMore')}
            type="button"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? t('history.loading') : t('history.loadMore')}
          </button>
        ) : null}
      </section>
      {selectedGame ? (
        <section className={cardClass} aria-label={`${t('history.details')} ${selectedGame.code}`}>
          <div className="flex items-start justify-between gap-4 max-[620px]:flex-col">
            <div>
              <span className={panelLabelClass}>{t('history.details')}</span>
              <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
                {selectedGame.code}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-app-text-muted">
                <span className="rounded-full border border-app-border bg-app-muted px-2.5 py-1 font-semibold text-app-text-strong">
                  {historyOutcome(selectedGame, userId, t)}
                </span>
                <time dateTime={selectedGame.finishedAt}>
                  {formatHistoryDate(selectedGame.finishedAt, language)}
                </time>
                {formatRatingDelta(selectedGame.ratingDelta, `${t('history.ratingChange')}: `) ? (
                  <span className="text-app-accent">
                    {formatRatingDelta(selectedGame.ratingDelta, `${t('history.ratingChange')}: `)}
                  </span>
                ) : null}
              </div>
            </div>
            <a
              className={`${secondaryButtonClass} shrink-0 max-[620px]:w-full`}
              href={`${API_URL}/games/${encodeURIComponent(selectedGame.code)}/pgn`}
              download={`game-${selectedGame.code}.pgn`}
            >
              {t('history.downloadPgn')}
            </a>
            {selectedGame.moves.length ? (
              <button
                className={`${secondaryButtonClass} shrink-0 max-[620px]:w-full`}
                type="button"
                onClick={() => onOpenReplay(selectedGame.code)}
              >
                {t('history.openReplay')}
              </button>
            ) : null}
          </div>
          <div className="mt-5 grid min-w-0 gap-5 border-t border-app-border pt-5 min-[1100px]:grid-cols-[minmax(0,1.45fr)_minmax(19rem,.55fr)]">
            {selectedGame.moves.length ? (
              <ReplayPanel game={selectedGame} userId={userId} t={t} />
            ) : (
              <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-app-border bg-app-muted p-6 text-center">
                <span className={mutedClass}>{t('history.noMoves')}</span>
              </div>
            )}
            <section
              className="grid min-h-0 content-start gap-3 rounded-2xl border border-app-border bg-app-muted p-3.5"
              aria-label={t('history.moves')}
            >
              <div className="flex items-center justify-between gap-3 border-b border-app-border pb-3">
                <span className={panelLabelClass}>{t('history.moves')}</span>
                <span className={mutedClass}>
                  {selectedGame.moves.length} {t('replay.moves')}
                </span>
              </div>
              <div className="grid max-h-[32rem] content-start gap-2 overflow-y-auto pr-1">
                {selectedGame.moves.length ? (
                  selectedGame.moves.map((move) => (
                    <div
                      className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-app-border bg-app-surface px-2.5 py-2 text-sm shadow-[inset_0_1px_0_rgb(255_255_255_/_3%)]"
                      key={move.moveNumber}
                    >
                      <span className="grid size-7 place-items-center rounded-lg bg-[var(--game-control-hover)] text-xs font-bold text-app-accent">
                        {move.moveNumber}
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <strong className="text-app-text-strong">{move.san}</strong>
                        <span className={mutedClass}>
                          {move.from} → {move.to}
                        </span>
                      </span>
                      <time className="text-[.68rem] tabular-nums text-app-text-muted">
                        {formatClock(move.elapsedMs)}
                      </time>
                    </div>
                  ))
                ) : (
                  <span className={mutedClass}>{t('history.noMoves')}</span>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ReplayView({
  game,
  loading,
  userId,
  t,
  onBack,
}: Readonly<{
  game: ReplayGame | null;
  loading: boolean;
  userId: string;
  t: Translator;
  onBack: () => void;
}>) {
  return (
    <section className={`${cardClass} grid min-w-0 gap-5`} aria-label={t('replay.title')}>
      <button className={`${secondaryButtonClass} w-fit`} type="button" onClick={onBack}>
        ← {t('history.back')}
      </button>
      {loading ? <p className={mutedClass}>{t('history.loading')}</p> : null}
      {!loading && game ? <ReplayPanel game={game} userId={userId} t={t} /> : null}
      {!loading && !game ? <p className={mutedClass}>{t('error.replayLoad')}</p> : null}
    </section>
  );
}

export function ProfileView({
  t,
  language,
  profile,
  publicProfile = false,
  seasons = [],
  selectedSeasonId,
  onSelectSeason,
}: Readonly<{
  t: Translator;
  language: Language;
  profile: UserProfile;
  publicProfile?: boolean;
  seasons?: SeasonSummary[];
  selectedSeasonId?: string | null;
  onSelectSeason?: (seasonId: string) => void;
}>) {
  const { stats } = profile;
  const highestRating = Math.max(...stats.ratingHistory.map((snapshot) => snapshot.rating));
  const lowestRating = Math.min(...stats.ratingHistory.map((snapshot) => snapshot.rating));
  const ratingRange = Math.max(1, highestRating - lowestRating);

  return (
    <div className="grid gap-3">
      <section
        className={cardClass}
        aria-label={t(publicProfile ? 'profile.publicSummary' : 'profile.summary')}
      >
        <div className="flex items-center gap-3">
          <div className="grid size-14 place-items-center rounded-full bg-[linear-gradient(145deg,#639bd7,#294a73)] text-xl font-extrabold text-white">
            {profile.user.username.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <span className={panelLabelClass}>
              {t(publicProfile ? 'profile.publicLabel' : 'profile.label')}
            </span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
              {profile.user.username}
            </h2>
            <span className={mutedClass}>
              {t('profile.memberSince')} {formatHistoryDate(profile.user.createdAt, language)}
            </span>
          </div>
          <div className="ml-auto text-right">
            <strong className="block text-2xl text-app-accent">{profile.user.rating}</strong>
            <span className={mutedClass}>{t('profile.rating')}</span>
          </div>
        </div>
      </section>

      <section
        className="grid grid-cols-3 gap-3 max-sm:grid-cols-1"
        aria-label={t('profile.statistics')}
      >
        {[
          ['profile.totalGames', stats.totalGames, 'blue'],
          ['profile.wins', stats.wins, 'green'],
          ['profile.losses', stats.losses, 'red'],
          ['profile.draws', stats.draws, 'gold'],
        ].map(([label, value, color]) => (
          <div
            className="flex min-w-0 items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg"
            key={label as string}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg ${profileMetricClass(color as string)}`}
              aria-hidden="true"
            >
              {profileMetricIcon(color as string)}
            </span>
            <div className="grid min-w-0 gap-1">
              <strong className="block text-lg font-bold text-app-text-strong">
                {value as number}
              </strong>
              <span className={mutedClass}>{t(label as Parameters<Translator>[0])}</span>
            </div>
          </div>
        ))}
      </section>

      <section className={cardClass}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={panelLabelClass}>{t('profile.breakdown')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
              {t('profile.modes')}
            </h2>
          </div>
          <span className={mutedClass}>{t('profile.winsLossesDraws')}</span>
        </div>
        <div className="grid gap-1">
          {[
            ['mode.ranked', stats.ranked],
            ['mode.casual', stats.casual],
            [
              'mode.correspondence',
              stats.correspondence ?? { totalGames: 0, wins: 0, losses: 0, draws: 0 },
            ],
          ].map(([label, breakdown]) => (
            <div
              className="flex justify-between gap-4 border-b border-app-border py-2.5"
              key={label as string}
            >
              <strong>{t(label as Parameters<Translator>[0])}</strong>
              <span className={mutedClass}>
                {(breakdown as ProfileBreakdown).totalGames} {t('profile.games')}
              </span>
              <span>{breakdownLabel(breakdown as ProfileBreakdown)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={cardClass} aria-label={t('profile.ratingHistory')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className={panelLabelClass}>{t('profile.ratingHistory')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
              {t('profile.ratingDevelopment')}
            </h2>
          </div>
          <strong className="text-2xl text-app-accent">{profile.user.rating}</strong>
        </div>
        {!publicProfile && onSelectSeason ? (
          <select
            className="mt-3 rounded-xl border border-app-border bg-app-muted px-3 py-2 text-sm"
            value={selectedSeasonId ?? ''}
            onChange={(event) => onSelectSeason(event.target.value)}
          >
            <option value="">Aktuelle Wertung</option>
            {seasons.map((season) => (
              <option value={season.id} key={season.id}>
                Season {season.sequence}
              </option>
            ))}
          </select>
        ) : null}
        <div className="grid gap-3">
          {stats.ratingHistory.map((snapshot, index) => (
            <div key={`${snapshot.at}-${index}`}>
              <div className="flex justify-between gap-4 text-xs">
                <strong>{snapshot.rating}</strong>
                <time dateTime={snapshot.at}>{formatHistoryDate(snapshot.at, language)}</time>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-app-muted">
                <span
                  className="block h-full rounded-full bg-[linear-gradient(90deg,#4777ae,#d4a34e)]"
                  style={{
                    width: `${((snapshot.rating - lowestRating) / ratingRange) * 70 + 30}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function AdminView({
  t,
  users,
  onRefresh,
  onRoleChange,
}: Readonly<{
  t: Translator;
  users: AdminUser[];
  onRefresh: () => void;
  onRoleChange: (id: string, role: UserRole) => void;
}>) {
  return (
    <section className={cardClass}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className={panelLabelClass}>{t('admin.label')}</span>
          <h2>{t('admin.title')}</h2>
        </div>
        <button
          className="cursor-pointer rounded-xl px-3 py-2 text-app-accent transition hover:bg-app-muted"
          type="button"
          onClick={onRefresh}
        >
          ↻ {t('admin.refresh')}
        </button>
      </div>
      <div className="grid gap-2">
        {users.map((adminUser) => (
          <div
            className="flex items-center gap-3 rounded-xl border border-[rgb(111_151_201_/_14%)] bg-[rgb(23_35_53_/_54%)] p-3"
            key={adminUser.id}
          >
            <div className="grid min-w-0 flex-1">
              <strong>{adminUser.username}</strong>
              <span className={mutedClass}>
                {adminUser.email ?? t('admin.noEmail')} · {t('admin.rating')} {adminUser.rating}
              </span>
            </div>
            <label>
              <span className="sr-only">
                {t('admin.roleFor')} {adminUser.username}
              </span>
              <select
                aria-label={`${t('admin.roleFor')} ${adminUser.username}`}
                value={adminUser.role}
                onChange={(event) => onRoleChange(adminUser.id, event.target.value as UserRole)}
              >
                <option value="user">{t('admin.user')}</option>
                <option value="admin">{t('admin.admin')}</option>
                <option value="spectator">{t('admin.spectator')}</option>
              </select>
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FriendsView({
  t,
  friends,
  canInvite,
  canInviteSpectator,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  onAdd,
  onRespond,
  onInvite,
  onInviteSpectator,
  onViewProfile,
}: Readonly<{
  t: Translator;
  friends: FriendsOverview | null;
  canInvite: boolean;
  canInviteSpectator: boolean;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: SocialUser[];
  onSearch: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  onAdd: (username: string) => void;
  onRespond: (id: string, action: 'accept' | 'reject') => void;
  onInvite: (username: string) => void;
  onInviteSpectator: (username: string) => void;
  onViewProfile: (id: string) => void;
}>) {
  const requestedUserIds = new Set(friends?.outgoingRequests.map((request) => request.receiver.id));

  return (
    <section className="grid w-full min-w-0 grid-cols-[minmax(0,1.4fr)_minmax(19rem,.8fr)] items-start gap-4 max-[820px]:grid-cols-1">
      <div className={`${cardClass} grid min-w-0 content-start gap-4`}>
        <div className="flex items-center justify-between gap-4 border-b border-[rgb(111_151_201_/_16%)] pb-4">
          <div>
            <span className={panelLabelClass}>{t('friends.social')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
              {t('friends.title')}
            </h2>
          </div>
          <span className="grid size-8 min-w-8 place-items-center rounded-xl border border-[rgb(112_168_255_/_24%)] bg-[rgb(41_78_120_/_42%)] text-xs font-extrabold tabular-nums text-[#c6e2ff]">
            {friends?.friends.length ?? 0}
          </span>
        </div>
        <section className="grid gap-2.5" aria-label={t('friends.title')}>
          {friends?.friends.length ? (
            <div className="grid gap-2">
              {friends.friends.map((friend) => (
                <div
                  className="grid min-w-0 grid-cols-[2.35rem_.55rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[rgb(111_151_201_/_14%)] bg-[rgb(23_35_53_/_54%)] p-2.5 transition hover:-translate-y-px hover:border-[rgb(105_171_235_/_40%)] hover:bg-[rgb(29_47_70_/_72%)] max-[560px]:grid-cols-[2.35rem_.55rem_minmax(0,1fr)]"
                  key={friend.id}
                >
                  <span
                    className="grid size-9 place-items-center rounded-xl border border-[rgb(142_190_255_/_22%)] bg-[linear-gradient(145deg,#365f8f,#203854)] text-xs font-extrabold text-[#f1f7ff]"
                    aria-hidden="true"
                  >
                    {friend.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span
                    className={`inline-block size-2 rounded-full ${friend.online ? 'bg-[#68d391]' : 'bg-[#64748b]'}`}
                    aria-label={friend.online ? t('header.online') : undefined}
                  />
                  <button
                    className="grid min-w-0 cursor-pointer gap-0.5 border-0 bg-transparent p-0 text-left text-[#e8f2ff] hover:text-[#9fcaff]"
                    type="button"
                    aria-label={friend.username}
                    onClick={() => onViewProfile(friend.id)}
                  >
                    <strong>{friend.username}</strong>
                    <span>{friend.rating}</span>
                  </button>
                  <div className="flex flex-wrap justify-end gap-1.5 max-[560px]:col-span-full max-[560px]:justify-stretch">
                    {canInvite ? (
                      <button
                        className={tinyButtonClass}
                        type="button"
                        onClick={() => onInvite(friend.username)}
                      >
                        {t('friends.invite')}
                      </button>
                    ) : null}
                    {canInviteSpectator ? (
                      <button
                        className={tinyButtonClass}
                        type="button"
                        onClick={() => onInviteSpectator(friend.username)}
                      >
                        {t('friends.inviteSpectator')}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={mutedClass}>{t('friends.empty')}</p>
          )}
        </section>
        {friends?.incomingRequests.length ? (
          <section
            className="grid gap-2.5 border-t border-[rgb(111_151_201_/_16%)] pt-4"
            aria-label={t('friends.incoming')}
          >
            <h3 className="m-0 text-sm font-bold text-app-text-strong">{t('friends.incoming')}</h3>
            <div className="grid gap-2">
              {friends.incomingRequests.map((request) => (
                <div
                  className="grid min-w-0 grid-cols-[2.35rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[rgb(111_151_201_/_14%)] bg-[rgb(23_35_53_/_54%)] p-2.5 max-[560px]:grid-cols-[2.35rem_minmax(0,1fr)]"
                  key={request.id}
                >
                  <span
                    className="grid size-9 place-items-center rounded-xl border border-[rgb(142_190_255_/_22%)] bg-[linear-gradient(145deg,#365f8f,#203854)] text-xs font-extrabold text-[#f1f7ff]"
                    aria-hidden="true"
                  >
                    {request.sender.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="grid min-w-0 gap-0.5">
                    <strong>{request.sender.username}</strong>
                    <span>{request.sender.rating}</span>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5 max-[560px]:col-span-full max-[560px]:justify-stretch">
                    <button
                      className={tinyButtonClass}
                      type="button"
                      onClick={() => onRespond(request.id, 'accept')}
                    >
                      {t('friends.accept')}
                    </button>
                    <button
                      className={`${tinyButtonClass} border-[rgb(226_118_133_/_48%)] bg-[rgb(89_33_48_/_66%)] text-[#ffd8de] hover:border-[rgb(245_149_163_/_76%)] hover:bg-[rgb(112_38_57_/_82%)]`}
                      type="button"
                      onClick={() => onRespond(request.id, 'reject')}
                    >
                      {t('friends.reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {friends?.outgoingRequests.length ? (
          <section
            className="grid gap-2.5 border-t border-[rgb(111_151_201_/_16%)] pt-4"
            aria-label={t('friends.outgoing')}
          >
            <h3 className="m-0 text-sm font-bold text-app-text-strong">{t('friends.outgoing')}</h3>
            <div className="grid gap-2">
              {friends.outgoingRequests.map((request) => (
                <div
                  className="grid min-w-0 grid-cols-[2.35rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[rgb(111_151_201_/_14%)] bg-[rgb(23_35_53_/_54%)] p-2.5 max-[560px]:grid-cols-[2.35rem_minmax(0,1fr)]"
                  key={request.id}
                >
                  <span
                    className="grid size-9 place-items-center rounded-xl border border-[rgb(142_190_255_/_22%)] bg-[linear-gradient(145deg,#365f8f,#203854)] text-xs font-extrabold text-[#f1f7ff]"
                    aria-hidden="true"
                  >
                    {request.receiver.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="grid min-w-0 gap-0.5">
                    <strong>{request.receiver.username}</strong>
                    <span>{request.receiver.rating}</span>
                  </div>
                  <span className="justify-self-end whitespace-nowrap rounded-full border border-[rgb(112_168_255_/_26%)] bg-[rgb(45_79_117_/_42%)] px-2 py-1 text-[.67rem] font-bold text-[#b9d8ff]">
                    {t('friends.requestSent')}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <div className={`${cardClass} grid min-w-0 content-start gap-4`}>
        <div>
          <span className={panelLabelClass}>{t('friends.findPlayers')}</span>
          <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
            {t('friends.searchTitle')}
          </h2>
        </div>
        <form className="flex min-w-0 gap-2 max-[560px]:flex-col" onSubmit={onSearch}>
          <input
            autoComplete="off"
            aria-label={t('friends.searchTitle')}
            name="user-search"
            className="min-w-0 flex-1 rounded-xl border border-[rgb(111_151_201_/_26%)] bg-[rgb(16_28_44_/_72%)] px-3 py-2.5 text-app-text-strong outline-none placeholder:text-[#7189a5] focus:border-app-accent focus:ring-4 focus:ring-app-accent/15"
            placeholder={t('friends.searchPlaceholder')}
            spellCheck={false}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className={`${secondaryButtonClass} max-[560px]:w-full`} type="submit">
            {t('friends.search')}
          </button>
        </form>
        <div className="grid gap-2">
          {searchResults.map((result) => {
            const requestAlreadySent = requestedUserIds.has(result.id);
            return (
              <div
                className="grid min-w-0 grid-cols-[2.35rem_.55rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-[rgb(111_151_201_/_14%)] bg-[rgb(23_35_53_/_54%)] p-2.5 max-[560px]:grid-cols-[2.35rem_.55rem_minmax(0,1fr)]"
                key={result.id}
              >
                <span
                  className="grid size-9 place-items-center rounded-xl border border-[rgb(142_190_255_/_22%)] bg-[linear-gradient(145deg,#365f8f,#203854)] text-xs font-extrabold text-[#f1f7ff]"
                  aria-hidden="true"
                >
                  {result.username.slice(0, 1).toUpperCase()}
                </span>
                <span
                  className={`inline-block size-2 rounded-full ${result.online ? 'bg-[#68d391]' : 'bg-[#64748b]'}`}
                  aria-label={result.online ? t('header.online') : undefined}
                />
                <button
                  className="grid min-w-0 cursor-pointer gap-0.5 border-0 bg-transparent p-0 text-left text-[#e8f2ff] hover:text-[#9fcaff]"
                  type="button"
                  aria-label={result.username}
                  onClick={() => onViewProfile(result.id)}
                >
                  <strong>{result.username}</strong>
                  <span>{result.rating}</span>
                </button>
                <button
                  className={
                    requestAlreadySent
                      ? `${tinyButtonClass} cursor-not-allowed border-[rgb(112_168_255_/_18%)] bg-[rgb(39_61_87_/_62%)] text-[#91a9c2]`
                      : tinyButtonClass
                  }
                  type="button"
                  disabled={requestAlreadySent}
                  onClick={() => onAdd(result.username)}
                >
                  {requestAlreadySent ? t('friends.requestSent') : t('friends.add')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function LeaderboardView({
  t,
  data,
  archive,
  userId,
  selectedSeason,
  onSelectSeason,
  onPageChange,
}: Readonly<{
  t: Translator;
  data: LeaderboardData | null;
  archive: SeasonSummary[];
  userId: string;
  selectedSeason: LeaderboardData | null;
  onSelectSeason: (seasonId: string) => void;
  onPageChange: (page: number) => void;
}>) {
  const displayData = selectedSeason ?? data;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = globalThis.setInterval(() => setNow(Date.now()), 60_000);
    return () => globalThis.clearInterval(timer);
  }, []);
  const currentEntry =
    displayData?.currentUserEntry ?? displayData?.entries.find((entry) => entry.userId === userId);
  return (
    <div className="grid w-full gap-4">
      <section className={cardClass}>
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-app-border pb-4">
          <div>
            <span className={panelLabelClass}>{t('leaderboard.current')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">
              {t('leaderboard.season')} {displayData?.season.sequence ?? '—'}
            </h2>
            {displayData ? (
              <p className={mutedClass}>
                {new Date(displayData.season.endsAt).getTime() > now
                  ? `${t('leaderboard.remaining')}: ${formatRemainingTime(
                      new Date(displayData.season.endsAt).getTime() - now,
                    )}`
                  : t('leaderboard.finished')}
              </p>
            ) : null}
          </div>
          {currentEntry ? (
            <div className="text-right">
              <strong className="block text-2xl text-app-accent">#{currentEntry.rank}</strong>
              <span className={mutedClass}>{currentEntry.rating}</span>
            </div>
          ) : null}
        </div>
        {displayData?.entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase tracking-[.1em] text-app-text-muted">
                <tr>
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">{t('player.player')}</th>
                  <th className="px-3 py-2">{t('sidebar.rating')}</th>
                  <th className="px-3 py-2">{t('leaderboard.games')}</th>
                  <th className="px-3 py-2">{t('leaderboard.wins')}</th>
                  <th className="px-3 py-2">{t('leaderboard.draws')}</th>
                  <th className="px-3 py-2">{t('leaderboard.losses')}</th>
                </tr>
              </thead>
              <tbody>
                {displayData.entries.map((entry) => (
                  <tr
                    className={`border-t border-app-border ${entry.userId === userId ? 'bg-app-muted font-bold' : ''}`}
                    key={entry.userId}
                  >
                    <td className="px-3 py-3 tabular-nums">{entry.rank}</td>
                    <td className="px-3 py-3">{entry.username}</td>
                    <td className="px-3 py-3 tabular-nums text-app-accent">{entry.rating}</td>
                    <td className="px-3 py-3 tabular-nums">{entry.games}</td>
                    <td className="px-3 py-3 tabular-nums">{entry.wins}</td>
                    <td className="px-3 py-3 tabular-nums">{entry.draws}</td>
                    <td className="px-3 py-3 tabular-nums">{entry.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={mutedClass}>{t('leaderboard.empty')}</p>}
        {displayData ? (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-app-border pt-3">
            <button
              className={quietButtonClass}
              disabled={displayData.page <= 1}
              onClick={() => onPageChange(displayData.page - 1)}
              type="button"
            >
              ‹
            </button>
            <span className={mutedClass}>
              {displayData.page} /{' '}
              {Math.max(1, Math.ceil(displayData.total / displayData.pageSize))}
            </span>
            <button
              className={quietButtonClass}
              disabled={!displayData.hasNext}
              onClick={() => onPageChange(displayData.page + 1)}
              type="button"
            >
              ›
            </button>
          </div>
        ) : null}
      </section>
      <section className={`${cardClass} grid gap-3`}>
        <div>
          <span className={panelLabelClass}>{t('leaderboard.archive')}</span>
          <h2 className="mt-1 text-xl font-semibold text-app-text-strong">Seasons</h2>
        </div>
        <div className="grid gap-2">
          {selectedSeason ? (
            <button className={quietButtonClass} type="button" onClick={() => onSelectSeason('')}>
              {t('leaderboard.current')}
            </button>
          ) : null}
          {archive.map((season) => (
            <button
              className="flex items-center justify-between gap-3 rounded-xl border border-app-border bg-app-muted p-3"
              onClick={() => onSelectSeason(season.id)}
              type="button"
              key={season.id}
            >
              <strong>
                {t('leaderboard.season')} {season.sequence}
              </strong>
              <span className={mutedClass}>
                {season.participantCount} {t('player.player')}
              </span>
              <span className="text-xs text-app-text-muted">{season.status}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
