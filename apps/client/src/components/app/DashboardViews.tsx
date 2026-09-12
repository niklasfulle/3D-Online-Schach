import { useEffect, useState } from 'react';

import type { GameMode, UserRole } from '@chess3d/shared';

import { API_URL } from '../../app/config';
import type {
  AdminUser,
  FriendsOverview,
  HistoryGame,
  HistoryModeFilter,
  HistoryResultFilter,
  LobbyGame,
  ProfileBreakdown,
  SocialUser,
  UserProfile,
} from '../../app/types';
import type { Language, Translator } from '../../i18n';
import {
  formatHistoryDate,
  formatClock,
  gameLabel,
  historyOutcome,
  matchesHistoryFilter,
} from '../../app/utils';

function historyResultMark(result: HistoryGame['result']): string {
  if (!result) return '—';
  if (result === 'draw') return '½';
  return result === 'white' ? '1' : '0';
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
    <div className="lobby-content lobby-content--wide grid w-full gap-4">
      <section className="welcome-card relative flex min-h-[180px] items-center justify-between gap-6 overflow-hidden rounded-2xl border border-app-border bg-[radial-gradient(circle_at_84%_50%,rgb(105_171_235_/_18%),transparent_30%),linear-gradient(130deg,#172b45,#101c2c_65%,#14253b)] p-6 shadow-lg max-sm:flex-col max-sm:items-start">
        <div>
          <span className="panel-label">{t('lobby.nextMove')}</span>
          <h2 className="mb-2 text-2xl font-semibold text-app-text-strong">
            {t('lobby.findGame')}
          </h2>
          <p className="mb-4 max-w-prose text-app-text-muted">{t('lobby.description')}</p>
          <div className="action-row flex flex-wrap items-center gap-2">
            <button
              className="primary-button min-h-11 cursor-pointer rounded-xl bg-[#4777ae] px-4 py-3 font-semibold text-white transition hover:bg-[#568ac7]"
              type="button"
              onClick={() => onCreate('casual')}
            >
              {t('lobby.createCasual')} <span aria-hidden="true">→</span>
            </button>
            <button
              className="ghost-button min-h-11 cursor-pointer rounded-xl border border-app-border-strong bg-transparent px-4 py-3 text-app-accent transition hover:bg-app-muted"
              type="button"
              onClick={() => onCreate('ranked')}
            >
              {t('lobby.playRanked')}
            </button>
          </div>
        </div>
        <div className="welcome-piece absolute right-[6%] top-1/2 -translate-y-1/2 text-[8rem] leading-none text-app-accent opacity-10 max-sm:bottom-[-1.5rem] max-sm:right-[4%] max-sm:top-auto max-sm:translate-y-0 max-sm:text-[6rem]" aria-hidden="true">
          ♞
        </div>
      </section>
      <div className="dashboard-stats grid grid-cols-3 gap-3 max-sm:grid-cols-1">
        <div className="metric-card flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
          <span className="metric-icon blue grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1e3d5e] text-lg text-[#c0e3ff]" aria-hidden="true">
            ◈
          </span>
          <div className="grid min-w-0 gap-1">
            <span className="muted">{t('lobby.openGames')}</span>
            <strong className="block text-lg font-bold text-app-text-strong">{games.length}</strong>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
          <span className="metric-icon gold grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#4d3b20] text-lg text-[#f1cc79]" aria-hidden="true">
            ✦
          </span>
          <div className="grid min-w-0 gap-1">
            <span className="muted">{t('lobby.gameModes')}</span>
            <strong className="block text-lg font-bold text-app-text-strong">
              {t('mode.casual')} &amp; {t('mode.ranked')}
            </strong>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
          <span className="metric-icon green grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1e4938] text-lg text-[#9de4b8]" aria-hidden="true">
            ◉
          </span>
          <div className="grid min-w-0 gap-1">
            <span className="muted">{t('lobby.serverStatus')}</span>
            <strong className="block text-lg font-bold text-app-text-strong">{t('header.online')}</strong>
          </div>
        </div>
      </div>
      <section className="content-card lobby-card lobby-overview-card w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
        <div className="section-heading lobby-card-heading flex items-center justify-between gap-4">
          <div>
            <span className="panel-label">{t('lobby.liveGames')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('lobby.title')}</h2>
          </div>
          <button
            className="quiet-button min-h-11 cursor-pointer rounded-xl px-3 py-2 text-app-accent transition hover:bg-app-muted"
            type="button"
            onClick={onRefresh}
          >
            <span aria-hidden="true">↻</span> {t('lobby.refresh')}
          </button>
        </div>
        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ♟
            </div>
            <strong>{t('lobby.emptyTitle')}</strong>
            <span className="muted">{t('lobby.emptyDescription')}</span>
          </div>
        ) : (
          <div className="lobby-list mt-5 grid gap-2">
            {games.map((game) => (
              <div
                className="lobby-row lobby-game-row"
                key={game.code}
              >
                <div className="lobby-game-leading">
                  <div className="game-mode-icon" aria-hidden="true">
                    {game.mode === 'ranked' ? '♛' : '♙'}
                  </div>
                  <div className="lobby-game-meta">
                    <strong>{gameLabel(game, t)}</strong>
                    <span>
                      5 {t('game.minutes')} · {t('lobby.openGameDescription')}
                      {game.expiresAt
                        ? ` · verfällt in ${formatClock(Math.max(0, game.expiresAt - now))}`
                        : ''}
                    </span>
                  </div>
                </div>
                <span className="waiting-label lobby-game-status">
                  <span className="live-dot" />
                  {game.isOwner ? t('lobby.yourGame') : t('lobby.waiting')}
                </span>
                <div className="lobby-game-actions">
                  <button
                    className="secondary-button lobby-open-button"
                    type="button"
                    onClick={() => onJoin(game.code)}
                  >
                    {game.isOwner ? t('lobby.open') : t('lobby.join')}{' '}
                    <span aria-hidden="true">→</span>
                  </button>
                  {game.isOwner ? (
                    <button
                      className="quiet-button lobby-delete-button"
                      type="button"
                      aria-label={`${t('lobby.deleteGame')} ${game.code} ${t('lobby.deleteSuffix')}`}
                      title={t('lobby.delete')}
                      onClick={() => onDelete(game.code)}
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M4.5 7.5h15M9 7.5V5.8c0-.72.58-1.3 1.3-1.3h3.4c.72 0 1.3.58 1.3 1.3v1.7M7.25 7.5l.7 11.2c.05.82.73 1.45 1.55 1.45h5c.82 0 1.5-.63 1.55-1.45l.7-11.2M10 11v5.2M14 11v5.2" strokeLinecap="round" strokeLinejoin="round" />
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
}>) {
  const filteredGames = games.filter(
    (historyGame) =>
      (modeFilter === 'all' || historyGame.mode === modeFilter) &&
      matchesHistoryFilter(historyGame, userId, resultFilter),
  );

  return (
    <div className="history-content history-content--wide w-full">
      <section className="content-card history-card w-full min-w-0 rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
        <div className="section-heading history-heading">
          <div>
            <span className="panel-label">{t('history.label')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('page.history.title')}</h2>
          </div>
          <div className="history-filters">
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
              </select>
            </label>
          </div>
        </div>
        {filteredGames.length ? (
          <div className="history-list">
            {filteredGames.map((historyGame) => {
              const opponent =
                historyGame.whitePlayer?.id === userId
                  ? historyGame.blackPlayer?.username
                  : historyGame.whitePlayer?.username;
              const outcome = historyOutcome(historyGame, userId, t);
              return (
                <button
                  className={
                    selectedGame?.id === historyGame.id
                        ? 'history-row selected grid cursor-pointer grid-cols-[2.1rem_minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-app-border px-0 py-3 text-left transition hover:bg-app-muted'
                        : 'history-row grid cursor-pointer grid-cols-[2.1rem_minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-app-border px-0 py-3 text-left transition hover:bg-app-muted'
                  }
                  type="button"
                  key={historyGame.id}
                  onClick={() => onSelect(historyGame)}
                >
                  <span className="history-result" data-result={historyGame.result ?? 'unfinished'}>
                    {historyResultMark(historyGame.result)}
                  </span>
                  <span className="history-game-main">
                    <strong>{historyGame.code}</strong>
                    <span className="muted">
                      {historyGame.mode === 'ranked' ? t('mode.ranked') : t('mode.casual')} ·{' '}
                      {t('history.opponent')}: {opponent ?? t('player.open')}
                    </span>
                  </span>
                  <span className="history-outcome">{outcome}</span>
                  <time dateTime={historyGame.finishedAt}>
                    {formatHistoryDate(historyGame.finishedAt, language)}
                  </time>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ◷
            </div>
            <strong>{t('history.empty')}</strong>
          </div>
        )}
        {cursor ? (
          <button
            className="quiet-button history-load-more"
            type="button"
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? t('history.loading') : t('history.loadMore')}
          </button>
        ) : null}
      </section>
      {selectedGame ? (
        <section
          className="content-card history-detail w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg"
          aria-label={`${t('history.details')} ${selectedGame.code}`}
        >
          <div className="section-heading">
            <div>
              <span className="panel-label">{t('history.details')}</span>
              <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{selectedGame.code}</h2>
            </div>
            <a
              className="secondary-button"
              href={`${API_URL}/games/${encodeURIComponent(selectedGame.code)}/pgn`}
              download={`game-${selectedGame.code}.pgn`}
            >
              {t('history.downloadPgn')}
            </a>
          </div>
          <div className="history-detail-meta">
            <span>{historyOutcome(selectedGame, userId, t)}</span>
            <span>{formatHistoryDate(selectedGame.finishedAt, language)}</span>
          </div>
          <div className="history-moves" aria-label={t('history.moves')}>
            {selectedGame.moves.length ? (
              selectedGame.moves.map((move) => (
                <div className="history-move" key={move.moveNumber}>
                  <span>{move.moveNumber}.</span>
                  <strong>{move.san}</strong>
                  <span className="muted">
                    {move.from} → {move.to}
                  </span>
                </div>
              ))
            ) : (
              <span className="muted">{t('history.noMoves')}</span>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ProfileView({
  t,
  language,
  profile,
  publicProfile = false,
}: Readonly<{
  t: Translator;
  language: Language;
  profile: UserProfile;
  publicProfile?: boolean;
}>) {
  const { stats } = profile;
  const highestRating = Math.max(...stats.ratingHistory.map((snapshot) => snapshot.rating));
  const lowestRating = Math.min(...stats.ratingHistory.map((snapshot) => snapshot.rating));
  const ratingRange = Math.max(1, highestRating - lowestRating);

  return (
    <div className="profile-content">
      <section
        className="content-card profile-summary-card w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg"
        aria-label={t(publicProfile ? 'profile.publicSummary' : 'profile.summary')}
      >
        <div className="profile-summary-heading">
          <div className="insight-avatar">{profile.user.username.slice(0, 1).toUpperCase()}</div>
          <div>
            <span className="panel-label">
              {t(publicProfile ? 'profile.publicLabel' : 'profile.label')}
            </span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{profile.user.username}</h2>
            <span className="muted">
              {t('profile.memberSince')} {formatHistoryDate(profile.user.createdAt, language)}
            </span>
          </div>
          <div className="profile-current-rating">
            <strong>{profile.user.rating}</strong>
            <span>{t('profile.rating')}</span>
          </div>
        </div>
      </section>

      <section className="profile-stat-grid" aria-label={t('profile.statistics')}>
        {[
          ['profile.totalGames', stats.totalGames, 'blue'],
          ['profile.wins', stats.wins, 'green'],
          ['profile.losses', stats.losses, 'red'],
          ['profile.draws', stats.draws, 'gold'],
        ].map(([label, value, color]) => (
          <div className="metric-card profile-metric flex min-w-0 items-center gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg" key={label as string}>
            <span className={`metric-icon ${color} grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#1e3d5e] text-[#c0e3ff] text-lg`} aria-hidden="true">
              {profileMetricIcon(color as string)}
            </span>
            <div className="grid min-w-0 gap-1">
              <strong className="block text-lg font-bold text-app-text-strong">{value as number}</strong>
              <span className="muted">{t(label as Parameters<Translator>[0])}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="content-card profile-modes-card w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
        <div className="section-heading">
          <div>
            <span className="panel-label">{t('profile.breakdown')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('profile.modes')}</h2>
          </div>
          <span className="muted">{t('profile.winsLossesDraws')}</span>
        </div>
        <div className="profile-mode-grid">
          {[
            ['mode.ranked', stats.ranked],
            ['mode.casual', stats.casual],
          ].map(([label, breakdown]) => (
            <div className="profile-mode-row" key={label as string}>
              <strong>{t(label as Parameters<Translator>[0])}</strong>
              <span className="muted">
                {(breakdown as ProfileBreakdown).totalGames} {t('profile.games')}
              </span>
              <span>{breakdownLabel(breakdown as ProfileBreakdown)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="content-card profile-rating-card w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg" aria-label={t('profile.ratingHistory')}>
        <div className="section-heading">
          <div>
            <span className="panel-label">{t('profile.ratingHistory')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('profile.ratingDevelopment')}</h2>
          </div>
          <strong className="profile-rating-current">{profile.user.rating}</strong>
        </div>
        <div className="profile-rating-history">
          {stats.ratingHistory.map((snapshot, index) => (
            <div className="profile-rating-point" key={`${snapshot.at}-${index}`}>
              <div className="profile-rating-value">
                <strong>{snapshot.rating}</strong>
                <time dateTime={snapshot.at}>{formatHistoryDate(snapshot.at, language)}</time>
              </div>
              <div className="profile-rating-track">
                <span
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
    <section className="content-card admin-card w-full rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
      <div className="section-heading">
        <div>
          <span className="panel-label">{t('admin.label')}</span>
          <h2>{t('admin.title')}</h2>
        </div>
        <button className="quiet-button" type="button" onClick={onRefresh}>
          ↻ {t('admin.refresh')}
        </button>
      </div>
      <div className="user-list">
        {users.map((adminUser) => (
          <div className="user-row admin-user-row" key={adminUser.id}>
            <div>
              <strong>{adminUser.username}</strong>
              <span className="muted">
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
    <section className="social-grid social-grid--wide w-full">
      <div className="content-card friends-list-card w-full min-w-0 rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
        <div className="section-heading friends-heading">
          <div>
            <span className="panel-label">{t('friends.social')}</span>
            <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('friends.title')}</h2>
          </div>
          <span className="friends-count">{friends?.friends.length ?? 0}</span>
        </div>
        <section className="friends-section" aria-label={t('friends.title')}>
          {friends?.friends.length ? (
            <div className="user-list friends-list">
              {friends.friends.map((friend) => (
                <div className="friend-row" key={friend.id}>
                  <span className="friend-avatar" aria-hidden="true">
                    {friend.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={friend.online ? 'online-dot' : 'offline-dot'} aria-label={friend.online ? t('header.online') : undefined} />
                  <button
                    className="link-button friend-profile-link"
                    type="button"
                    aria-label={friend.username}
                    onClick={() => onViewProfile(friend.id)}
                  >
                    <strong>{friend.username}</strong>
                    <span>{friend.rating}</span>
                  </button>
                  <div className="friend-actions">
                    {canInvite ? (
                      <button
                        className="tiny-button"
                        type="button"
                        onClick={() => onInvite(friend.username)}
                      >
                        {t('friends.invite')}
                      </button>
                    ) : null}
                    {canInviteSpectator ? (
                      <button
                        className="tiny-button"
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
            <p className="muted">{t('friends.empty')}</p>
          )}
        </section>
        {friends?.incomingRequests.length ? (
          <section className="friends-section incoming-requests" aria-label={t('friends.incoming')}>
            <h3 className="friends-section-title">{t('friends.incoming')}</h3>
            <div className="user-list">
              {friends.incomingRequests.map((request) => (
                <div className="friend-row friend-request-row" key={request.id}>
                  <span className="friend-avatar" aria-hidden="true">
                    {request.sender.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="friend-request-person">
                    <strong>{request.sender.username}</strong>
                    <span>{request.sender.rating}</span>
                  </div>
                  <div className="friend-actions">
                    <button
                      className="tiny-button"
                      type="button"
                      onClick={() => onRespond(request.id, 'accept')}
                    >
                      {t('friends.accept')}
                    </button>
                    <button
                      className="tiny-button danger"
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
          <section className="friends-section outgoing-requests" aria-label={t('friends.outgoing')}>
            <h3 className="friends-section-title">{t('friends.outgoing')}</h3>
            <div className="user-list">
              {friends.outgoingRequests.map((request) => (
                <div className="friend-row friend-request-row" key={request.id}>
                  <span className="friend-avatar" aria-hidden="true">
                    {request.receiver.username.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="friend-request-person">
                    <strong>{request.receiver.username}</strong>
                    <span>{request.receiver.rating}</span>
                  </div>
                  <span className="friend-request-status">{t('friends.requestSent')}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
      <div className="content-card friends-discovery-card w-full min-w-0 rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
        <div className="friends-discovery-heading">
          <span className="panel-label">{t('friends.findPlayers')}</span>
          <h2 className="mt-1 text-xl font-semibold text-app-text-strong">{t('friends.searchTitle')}</h2>
        </div>
        <form className="search-row" onSubmit={onSearch}>
          <input
            autoComplete="off"
            aria-label={t('friends.searchTitle')}
            name="user-search"
            placeholder={t('friends.searchPlaceholder')}
            spellCheck={false}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className="secondary-button" type="submit">
            {t('friends.search')}
          </button>
        </form>
          <div className="user-list">
            {searchResults.map((result) => {
              const requestAlreadySent = requestedUserIds.has(result.id);
              return (
                <div className="friend-row search-result-row" key={result.id}>
                  <span className="friend-avatar" aria-hidden="true">
                    {result.username.slice(0, 1).toUpperCase()}
                  </span>
                  <span className={result.online ? 'online-dot' : 'offline-dot'} aria-label={result.online ? t('header.online') : undefined} />
                  <button
                    className="link-button friend-profile-link"
                    type="button"
                    aria-label={result.username}
                    onClick={() => onViewProfile(result.id)}
                  >
                    <strong>{result.username}</strong>
                    <span>{result.rating}</span>
                  </button>
                  <button
                    className={requestAlreadySent ? 'tiny-button request-sent' : 'tiny-button'}
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
