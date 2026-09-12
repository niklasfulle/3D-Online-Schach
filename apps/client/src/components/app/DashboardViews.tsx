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
    <div className="lobby-content">
      <section className="welcome-card">
        <div>
          <span className="panel-label">{t('lobby.nextMove')}</span>
          <h2>{t('lobby.findGame')}</h2>
          <p>{t('lobby.description')}</p>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => onCreate('casual')}>
              {t('lobby.createCasual')} <span aria-hidden="true">→</span>
            </button>
            <button className="ghost-button" type="button" onClick={() => onCreate('ranked')}>
              {t('lobby.playRanked')}
            </button>
          </div>
        </div>
        <div className="welcome-piece" aria-hidden="true">
          ♞
        </div>
      </section>
      <div className="dashboard-stats">
        <div className="metric-card">
          <span className="metric-icon blue" aria-hidden="true">
            ◈
          </span>
          <div>
            <span className="muted">{t('lobby.openGames')}</span>
            <strong>{games.length}</strong>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon gold" aria-hidden="true">
            ✦
          </span>
          <div>
            <span className="muted">{t('lobby.gameModes')}</span>
            <strong>
              {t('mode.casual')} &amp; {t('mode.ranked')}
            </strong>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon green" aria-hidden="true">
            ◉
          </span>
          <div>
            <span className="muted">{t('lobby.serverStatus')}</span>
            <strong>{t('header.online')}</strong>
          </div>
        </div>
      </div>
      <section className="content-card lobby-card">
        <div className="section-heading">
          <div>
            <span className="panel-label">{t('lobby.liveGames')}</span>
            <h2>{t('lobby.title')}</h2>
          </div>
          <button className="quiet-button" type="button" onClick={onRefresh}>
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
          <div className="lobby-list">
            {games.map((game) => (
              <div className="lobby-row" key={game.code}>
                <div className="game-mode-icon" aria-hidden="true">
                  {game.mode === 'ranked' ? '♛' : '♙'}
                </div>
                <div>
                  <strong>{gameLabel(game, t)}</strong>
                  <span className="muted">
                    5 {t('game.minutes')} · {t('lobby.openGameDescription')}
                    {game.expiresAt
                      ? ` · verfällt in ${formatClock(Math.max(0, game.expiresAt - now))}`
                      : ''}
                  </span>
                </div>
                <span className="waiting-label">
                  <span className="live-dot" />
                  {game.isOwner ? t('lobby.yourGame') : t('lobby.waiting')}
                </span>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onJoin(game.code)}
                >
                  {game.isOwner ? t('lobby.open') : t('lobby.join')}{' '}
                  <span aria-hidden="true">→</span>
                </button>
                {game.isOwner ? (
                  <button
                    className="quiet-button"
                    type="button"
                    aria-label={`${t('lobby.deleteGame')} ${game.code} ${t('lobby.deleteSuffix')}`}
                    onClick={() => onDelete(game.code)}
                  >
                    {t('lobby.delete')}
                  </button>
                ) : null}
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
    <div className="history-content">
      <section className="content-card history-card">
        <div className="section-heading history-heading">
          <div>
            <span className="panel-label">{t('history.label')}</span>
            <h2>{t('page.history.title')}</h2>
          </div>
          <div className="history-filters">
            <label>
              <span className="sr-only">{t('history.resultFilter')}</span>
              <select
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
                    selectedGame?.id === historyGame.id ? 'history-row selected' : 'history-row'
                  }
                  type="button"
                  key={historyGame.id}
                  onClick={() => onSelect(historyGame)}
                >
                  <span className="history-result" data-result={outcome}>
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
          className="content-card history-detail"
          aria-label={`${t('history.details')} ${selectedGame.code}`}
        >
          <div className="section-heading">
            <div>
              <span className="panel-label">{t('history.details')}</span>
              <h2>{selectedGame.code}</h2>
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
        className="content-card profile-summary-card"
        aria-label={t(publicProfile ? 'profile.publicSummary' : 'profile.summary')}
      >
        <div className="profile-summary-heading">
          <div className="insight-avatar">{profile.user.username.slice(0, 1).toUpperCase()}</div>
          <div>
            <span className="panel-label">
              {t(publicProfile ? 'profile.publicLabel' : 'profile.label')}
            </span>
            <h2>{profile.user.username}</h2>
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
          <div className="metric-card profile-metric" key={label as string}>
            <span className={`metric-icon ${color}`} aria-hidden="true">
              {profileMetricIcon(color as string)}
            </span>
            <div>
              <strong>{value as number}</strong>
              <span className="muted">{t(label as Parameters<Translator>[0])}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="content-card profile-modes-card">
        <div className="section-heading">
          <div>
            <span className="panel-label">{t('profile.breakdown')}</span>
            <h2>{t('profile.modes')}</h2>
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

      <section className="content-card profile-rating-card" aria-label={t('profile.ratingHistory')}>
        <div className="section-heading">
          <div>
            <span className="panel-label">{t('profile.ratingHistory')}</span>
            <h2>{t('profile.ratingDevelopment')}</h2>
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
    <section className="content-card admin-card">
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
  return (
    <section className="social-grid">
      <div className="content-card">
        <div className="section-heading">
          <div>
            <span className="panel-label">{t('friends.social')}</span>
            <h2>{t('friends.title')}</h2>
          </div>
        </div>
        {friends?.friends.length ? (
          <div className="user-list">
            {friends.friends.map((friend) => (
              <div className="user-row" key={friend.id}>
                <span className={friend.online ? 'online-dot' : 'offline-dot'} />
                <button
                  className="link-button friend-profile-link"
                  type="button"
                  onClick={() => onViewProfile(friend.id)}
                >
                  {friend.username}
                </button>
                <span className="muted">{friend.rating}</span>
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
            ))}
          </div>
        ) : (
          <p className="muted">{t('friends.empty')}</p>
        )}
        <h3>{t('friends.incoming')}</h3>
        {friends?.incomingRequests.map((request) => (
          <div className="user-row" key={request.id}>
            <strong>{request.sender.username}</strong>
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
        ))}
      </div>
      <div className="content-card">
        <span className="panel-label">{t('friends.findPlayers')}</span>
        <h2>{t('friends.searchTitle')}</h2>
        <form className="search-row" onSubmit={onSearch}>
          <input
            autoComplete="off"
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
          {searchResults.map((result) => (
            <div className="user-row" key={result.id}>
              <span className={result.online ? 'online-dot' : 'offline-dot'} />
              <button
                className="link-button friend-profile-link"
                type="button"
                onClick={() => onViewProfile(result.id)}
              >
                {result.username}
              </button>
              <span className="muted">{result.rating}</span>
              <button className="tiny-button" type="button" onClick={() => onAdd(result.username)}>
                {t('friends.add')}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
