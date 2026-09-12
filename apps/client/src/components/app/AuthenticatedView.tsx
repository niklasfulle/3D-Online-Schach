import type { ReactNode } from 'react';

import type { AppController } from '../../app/useAppController';
import { PROMOTION_OPTIONS } from '../../app/config';
import {
  gameLabel,
  gameStatusLabel,
  gamePath,
  notificationMessage,
  notificationTitle,
  pageHeadingFor,
  spectatorPath,
  statusLabel,
} from '../../app/utils';
import { AppFooter } from './AppFooter';
import { AdminView, FriendsView, HistoryView, LobbyView, ProfileView } from './DashboardViews';
import { GameView } from './GameView';
import { LanguageMenu, ThemeMenu } from './Menus';
import { LobbyUnavailablePopover } from './LobbyUnavailablePopover';

function promotionLabelKey(
  promotion: (typeof PROMOTION_OPTIONS)[number],
): Parameters<AppController['t']>[0] {
  if (promotion === 'q') return 'promotion.queen';
  if (promotion === 'r') return 'promotion.rook';
  if (promotion === 'b') return 'promotion.bishop';
  return 'promotion.knight';
}

function notificationTarget(
  notification: AppController['notifications'][number],
): string | undefined {
  if (!notification.gameCode) return undefined;
  if (notification.type === 'spectator_invitation') return spectatorPath(notification.gameCode);
  return gamePath(notification.gameCode);
}

type AuthenticatedComponentProps = Readonly<{ controller: Readonly<AppController> }>;

function AuthenticatedHeader({ controller }: AuthenticatedComponentProps) {
  const {
    language,
    theme,
    notifications,
    notificationsOpen,
    refreshNotifications,
    markNotificationRead,
    setNotificationsOpen,
    setTheme,
    setLanguage,
    user,
    logout,
    t,
  } = controller;
  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark" aria-hidden="true">
          ♞
        </div>
        <div>
          <p className="eyebrow">3D ONLINE-SCHACH</p>
          <strong className="brand-title">Chessboard</strong>
        </div>
      </div>
      <div className="header-actions">
        <ThemeMenu theme={theme} onChange={setTheme} t={t} />
        <LanguageMenu language={language} onChange={setLanguage} t={t} />
        <span className="live-chip">
          <span className="live-dot" /> {t('header.online')}
        </span>
        <div className="notification-wrapper">
          <button
            className="notification-button"
            type="button"
            aria-label={`${t('notifications.label')} (${unreadCount})`}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            ♢{unreadCount ? <span className="notification-count">{unreadCount}</span> : null}
          </button>
          {notificationsOpen ? (
            <section className="notification-panel" aria-label={t('notifications.label')}>
              <div className="notification-panel-header">
                <strong>{t('notifications.label')}</strong>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => void refreshNotifications()}
                >
                  {t('notifications.refresh')}
                </button>
              </div>
              {notifications.length ? (
                <div className="notification-list">
                  {notifications.map((notification) => {
                    const itemClass = notification.read
                      ? 'notification-item'
                      : 'notification-item unread';
                    const target = notificationTarget(notification);
                    const content = (
                      <>
                        <strong>{notificationTitle(notification, language, t)}</strong>
                        <span>{notificationMessage(notification, language, t)}</span>
                        {target ? (
                          <span className="notification-action">
                            {notification.type === 'spectator_invitation'
                              ? t('notifications.openSpectator')
                              : t('notifications.openGame')}
                          </span>
                        ) : null}
                      </>
                    );
                    return target ? (
                      <a
                        className={itemClass}
                        href={target}
                        key={notification.id}
                        onClick={() => void markNotificationRead(notification)}
                      >
                        {content}
                      </a>
                    ) : (
                      <button
                        className={itemClass}
                        key={notification.id}
                        type="button"
                        onClick={() => void markNotificationRead(notification)}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="muted">{t('notifications.empty')}</p>
              )}
            </section>
          ) : null}
        </div>
        <div className="profile-chip">
          <span className="avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
          <span>{user?.username}</span>
          <span className="profile-rating">{user?.rating}</span>
        </div>
        <button className="quiet-button" type="button" onClick={() => void logout()}>
          {t('auth.logout')}
        </button>
      </div>
    </header>
  );
}

function DashboardSidebar({ controller }: AuthenticatedComponentProps) {
  const {
    view,
    setView,
    lobbyGames,
    historyGames,
    openHistory,
    openProfile,
    user,
    adminUsers,
    refreshAdminUsers,
    friends,
    refreshFriends,
    selectedGame,
    t,
  } = controller;

  return (
    <aside className="sidebar">
      <div>
        <span className="sidebar-label">{t('sidebar.workspace')}</span>
        <nav className="sidebar-nav" aria-label={t('sidebar.navigation')}>
          <button
            className={view === 'lobby' ? 'nav-button active' : 'nav-button'}
            type="button"
            onClick={() => setView('lobby')}
          >
            <span className="nav-icon" aria-hidden="true">
              ⌂
            </span>
            <span>{t('sidebar.lobby')}</span>
            <span className="nav-count">{lobbyGames.length}</span>
          </button>
          <button
            className={view === 'history' ? 'nav-button active' : 'nav-button'}
            type="button"
            onClick={() => void openHistory()}
          >
            <span className="nav-icon" aria-hidden="true">
              ◷
            </span>
            <span>{t('sidebar.history')}</span>
            <span className="nav-count">{historyGames.length}</span>
          </button>
          <button
            className={view === 'profile' ? 'nav-button active' : 'nav-button'}
            type="button"
            onClick={() => void openProfile()}
          >
            <span className="nav-icon" aria-hidden="true">
              ◉
            </span>
            <span>{t('sidebar.profile')}</span>
          </button>
          {user?.role === 'admin' ? (
            <button
              className={view === 'admin' ? 'nav-button active' : 'nav-button'}
              type="button"
              onClick={() => {
                setView('admin');
                void refreshAdminUsers();
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                ⚙
              </span>
              <span>{t('sidebar.administration')}</span>
              <span className="nav-count">{adminUsers.length}</span>
            </button>
          ) : null}
          <button
            className={view === 'friends' ? 'nav-button active' : 'nav-button'}
            type="button"
            onClick={() => {
              setView('friends');
              void refreshFriends();
            }}
          >
            <span className="nav-icon" aria-hidden="true">
              ♙
            </span>
            <span>{t('sidebar.friends')}</span>
            <span className="nav-count">{friends?.friends.length ?? 0}</span>
          </button>
          {selectedGame ? (
            <button
              className={view === 'game' ? 'nav-button active' : 'nav-button'}
              type="button"
              onClick={() => setView('game')}
            >
              <span className="nav-icon" aria-hidden="true">
                ♜
              </span>
              <span>{t('sidebar.activeGame')}</span>
              <span className="nav-live-dot" />
            </button>
          ) : null}
        </nav>
      </div>
      <div className="sidebar-note">
        <span className="sidebar-label">{t('sidebar.profile')}</span>
        <strong>{user?.username}</strong>
        <span className="muted">
          {t('sidebar.rating')} {user?.rating}
        </span>
        <div className="rating-bar">
          <span
            style={{ width: `${Math.min(100, Math.max(8, ((user?.rating ?? 800) - 800) / 8))}%` }}
          />
        </div>
      </div>
    </aside>
  );
}

function DashboardContent({
  controller,
  pageHeading,
  profileContent,
  turnLabel,
  gameStatus,
}: AuthenticatedComponentProps & {
  pageHeading: ReturnType<typeof pageHeadingFor>;
  profileContent: ReactNode;
  turnLabel: string;
  gameStatus: string;
}) {
  const {
    view,
    unavailableLobbyCode,
    setUnavailableLobbyCode,
    t,
    error,
    setError,
    lobbyGames,
    refreshLobby,
    createGame,
    joinGame,
    deleteGame,
    language,
    user,
    historyGames,
    historyCursor,
    historyLoading,
    historyResultFilter,
    historyModeFilter,
    selectedHistoryGame,
    setHistoryResultFilter,
    setHistoryModeFilter,
    setSelectedHistoryGame,
    refreshHistory,
    publicProfile,
    friends,
    searchQuery,
    setSearchQuery,
    searchResults,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    inviteFriend,
    inviteSpectator,
    openPublicProfile,
    adminUsers,
    refreshAdminUsers,
    updateAdminRole,
    selectedGame,
    gameState,
    selectedSquare,
    legalTargets,
    moveHistory,
    handleSelectSquare,
    returnToLobby,
    copyGameLink,
    linkCopied,
    spectatorMode,
    copySpectatorLink,
    spectatorLinkCopied,
    chatMessages,
    chatDraft,
    setChatDraft,
    sendChat,
    resignGame,
  } = controller;

  if (!user) {
    return null;
  }

  return (
    <section className="dashboard-main">
      {unavailableLobbyCode ? (
        <LobbyUnavailablePopover
          code={unavailableLobbyCode}
          onClose={() => setUnavailableLobbyCode(null)}
          t={t}
        />
      ) : null}
      {error ? (
        <div className="error-banner" role="alert" aria-live="polite">
          <span>
            <strong>{t('guest.connectionHint')}</strong>
            {error}
          </span>
          <button aria-label={t('guest.closeHint')} type="button" onClick={() => setError('')}>
            ×
          </button>
        </div>
      ) : null}
      <div className="page-heading">
        <div>
          <span className="eyebrow">{pageHeading.eyebrow}</span>
          <h1>{pageHeading.title}</h1>
          <p>{pageHeading.description}</p>
        </div>
        <div className="heading-accent" aria-hidden="true">
          ✦
        </div>
      </div>
      {view === 'lobby' ? (
        <LobbyView
          t={t}
          games={lobbyGames}
          onRefresh={() => void refreshLobby()}
          onCreate={(mode) => void createGame(mode)}
          onJoin={(code) => void joinGame(code)}
          onDelete={(code) => void deleteGame(code)}
        />
      ) : null}
      {view === 'history' ? (
        <HistoryView
          t={t}
          language={language}
          userId={user.id}
          games={historyGames}
          cursor={historyCursor}
          loading={historyLoading}
          resultFilter={historyResultFilter}
          modeFilter={historyModeFilter}
          selectedGame={selectedHistoryGame}
          onResultFilterChange={setHistoryResultFilter}
          onModeFilterChange={setHistoryModeFilter}
          onSelect={setSelectedHistoryGame}
          onLoadMore={() => void refreshHistory(historyCursor)}
        />
      ) : null}
      {view === 'profile' ? profileContent : null}
      {view === 'public-profile' && publicProfile ? (
        <ProfileView t={t} language={language} profile={publicProfile} publicProfile />
      ) : null}
      {view === 'friends' ? (
        <FriendsView
          t={t}
          friends={friends}
          canInvite={Boolean(
            selectedGame?.status === 'waiting' && selectedGame.whitePlayerId === user.id,
          )}
          canInviteSpectator={Boolean(
            selectedGame?.status === 'active' &&
            (selectedGame.whitePlayerId === user.id || selectedGame.blackPlayerId === user.id),
          )}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          onSearch={searchUsers}
          onAdd={(username) => void sendFriendRequest(username)}
          onRespond={(id, action) => void respondToRequest(id, action)}
          onInvite={(username) => void inviteFriend(username)}
          onInviteSpectator={(username) => void inviteSpectator(username)}
          onViewProfile={(id) => void openPublicProfile(id)}
        />
      ) : null}
      {view === 'admin' && user.role === 'admin' ? (
        <AdminView
          t={t}
          users={adminUsers}
          onRefresh={() => void refreshAdminUsers()}
          onRoleChange={(id, role) => void updateAdminRole(id, role)}
        />
      ) : null}
      {view === 'game' && selectedGame ? (
        <GameView
          user={user}
          language={language}
          t={t}
          selectedGame={selectedGame}
          gameState={gameState}
          selectedSquare={selectedSquare}
          legalTargets={legalTargets}
          moveHistory={moveHistory}
          turnLabel={turnLabel}
          gameStatus={gameStatus}
          onBackToLobby={returnToLobby}
          handleSelectSquare={handleSelectSquare}
          onCopyLink={() => void copyGameLink()}
          linkCopied={linkCopied}
          spectatorMode={spectatorMode}
          onCopySpectatorLink={() => void copySpectatorLink()}
          spectatorLinkCopied={spectatorLinkCopied}
          chatMessages={chatMessages}
          chatDraft={chatDraft}
          onChatDraftChange={setChatDraft}
          onSendChat={sendChat}
          onResign={() => void resignGame()}
        />
      ) : null}
    </section>
  );
}

function InsightsPanel({ controller }: AuthenticatedComponentProps) {
  const { user, friends, createGame, t } = controller;
  return (
    <aside className="insights-panel">
      <div className="insight-card profile-insight">
        <div className="insight-heading">
          <span>{t('insight.status')}</span>
          <span className="live-chip small">
            <span className="live-dot" /> Live
          </span>
        </div>
        <div className="insight-avatar">{user?.username.slice(0, 1).toUpperCase()}</div>
        <strong>{user?.username}</strong>
        <span className="muted">{t('insight.ready')}</span>
        <div className="insight-stats">
          <div>
            <strong>{user?.rating}</strong>
            <span>{t('insight.rating')}</span>
          </div>
          <div>
            <strong>{friends?.friends.length ?? 0}</strong>
            <span>{t('insight.friends')}</span>
          </div>
        </div>
      </div>
      <div className="insight-card quick-match">
        <span className="panel-label">{t('insight.quickStart')}</span>
        <h3>{t('insight.directGame')}</h3>
        <p className="muted">{t('insight.quickStartDescription')}</p>
        <button className="primary-button" type="button" onClick={() => void createGame('casual')}>
          {t('insight.createGame')} <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  );
}

function PromotionDialog({ controller }: AuthenticatedComponentProps) {
  const { promotionMove, commitMove, t } = controller;
  if (!promotionMove) return null;
  return (
    <dialog open className="promotion-dialog" aria-label={t('promotion.label')}>
      <strong>{t('promotion.label')}</strong>
      <div className="promotion-actions">
        {PROMOTION_OPTIONS.map((promotion) => (
          <button
            key={promotion}
            type="button"
            onClick={() => commitMove({ ...promotionMove, promotion })}
          >
            {t(promotionLabelKey(promotion))}
          </button>
        ))}
      </div>
    </dialog>
  );
}
export function AuthenticatedView(controller: Readonly<AppController>) {
  const { user, language, theme, view, selectedGame, gameState, profileLoading, profile, t } =
    controller;

  if (!user) {
    return null;
  }

  const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
  const gameStatus = selectedGame
    ? `${gameLabel(selectedGame, t)} · ${gameStatusLabel(selectedGame.status, t)}`
    : statusLabel(gameState.status, t);
  const pageHeading = pageHeadingFor(view, t);
  let profileContent = null;
  if (profileLoading) {
    profileContent = <div className="centered-message">{t('profile.loading')}</div>;
  } else if (profile) {
    profileContent = <ProfileView t={t} language={language} profile={profile} />;
  }

  return (
    <main className={view === 'game' ? 'app-shell game-mode' : 'app-shell'} data-theme={theme}>
      <div className="dashboard-shell">
        <AuthenticatedHeader controller={controller} />
        <div className="dashboard-grid">
          <DashboardSidebar controller={controller} />
          <DashboardContent
            controller={controller}
            pageHeading={pageHeading}
            profileContent={profileContent}
            turnLabel={turnLabel}
            gameStatus={gameStatus}
          />
          <InsightsPanel controller={controller} />
        </div>
      </div>
      <PromotionDialog controller={controller} />
      <AppFooter t={t} />
    </main>
  );
}
