import type { ReactNode } from 'react';

import type { AppController } from '../../app/useAppController';
import { PROMOTION_OPTIONS } from '../../app/config';
import {
  gamePath,
  notificationMessage,
  notificationTitle,
  pageHeadingFor,
  spectatorPath,
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
    openProfile,
    logout,
    t,
  } = controller;
  const unreadCount = notifications.filter((item) => !item.read).length;
  return (
    <header className="topbar flex items-center justify-between gap-4 border-b border-app-border px-[clamp(1rem,3vw,2rem)] py-4 max-lg:flex-wrap">
      <div className="brand-lockup flex items-center gap-3">
        <div
          className="brand-mark grid h-11 w-11 place-items-center rounded-2xl border border-app-border-strong bg-app-muted text-xl text-app-accent shadow-lg"
          aria-hidden="true"
        >
          ♞
        </div>
        <div>
          <p className="eyebrow mb-1 text-xs font-bold tracking-[0.14em] text-app-accent">
            3D ONLINE-SCHACH
          </p>
          <strong className="brand-title text-lg text-app-text-strong">Chessboard</strong>
        </div>
      </div>
      <div className="header-actions flex items-center gap-2 max-md:flex-wrap">
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
            title={t('notifications.label')}
            onClick={() => setNotificationsOpen((open) => !open)}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9.75 21h4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {unreadCount ? <span className="notification-count">{unreadCount}</span> : null}
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
          <button
            className="profile-chip profile-trigger"
            type="button"
            aria-label={`${user?.username} · ${user?.rating}`}
            title={t('sidebar.profile')}
            onClick={() => void openProfile()}
          >
            <span className="avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
            <span>{user?.username}</span>
            <span className="profile-rating">{user?.rating}</span>
          </button>
        <button
          className="header-icon-button logout-button"
          type="button"
          aria-label={t('auth.logout')}
          title={t('auth.logout')}
          onClick={() => void logout()}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10" strokeLinecap="round" strokeLinejoin="round" />
            <path d="m14 8 4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
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
    openSelectedGame,
    user,
    adminUsers,
    refreshAdminUsers,
    friends,
    refreshFriends,
    selectedGame,
    t,
  } = controller;

  return (
    <aside className="sidebar flex min-h-0 flex-col justify-between max-lg:border-r-0 max-lg:border-b">
      <div>
        <span className="sidebar-label">{t('sidebar.workspace')}</span>
        <nav className="sidebar-nav grid gap-1" aria-label={t('sidebar.navigation')}>
          <button
            className={view === 'lobby' ? 'nav-button active' : 'nav-button'}
            type="button"
            onClick={() => setView('lobby')}
          >
            <span className="nav-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z" strokeLinejoin="round" />
                <path d="M9.5 20v-5h5v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{t('sidebar.history')}</span>
            <span className="nav-count">{historyGames.length}</span>
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m12 3 7 3.5v4.75c0 4.4-3.02 7.34-7 9.75-3.98-2.41-7-5.35-7-9.75V6.5L12 3Z" strokeLinejoin="round" />
                  <path d="M9.5 12.1 11 13.6l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
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
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="9" cy="9" r="3" />
                <path d="M3.8 20c.55-3.15 2.25-5 5.2-5s4.65 1.85 5.2 5" strokeLinecap="round" />
                <path d="M15.5 7.1a2.5 2.5 0 0 1 0 4.8M16.2 15.3c2.1.42 3.38 1.94 3.9 4.7" strokeLinecap="round" />
              </svg>
            </span>
            <span>{t('sidebar.friends')}</span>
            <span className="nav-count">{friends?.friends.length ?? 0}</span>
          </button>
          {selectedGame ? (
            <button
              className={view === 'game' ? 'nav-button active' : 'nav-button'}
              type="button"
              onClick={openSelectedGame}
            >
              <span className="nav-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 5h10l-1 4-2-1-2 1-2-1-2 1-1-4ZM8.5 10h7l.8 6H7.7l.8-6ZM6 20h12M8 16h8v4H8z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>{t('sidebar.activeGame')}</span>
              <span className="nav-live-dot" />
            </button>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}

function DashboardContent({
  controller,
  pageHeading,
  profileContent,
  turnLabel,
}: AuthenticatedComponentProps & {
  pageHeading: ReturnType<typeof pageHeadingFor>;
  profileContent: ReactNode;
  turnLabel: string;
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
    <section className="dashboard-main min-w-0 px-[clamp(1rem,3vw,2rem)] py-6">
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
      <div className="page-heading mb-7 flex items-start justify-between gap-4 max-sm:mb-5">
        <div>
          <span className="eyebrow">{pageHeading.eyebrow}</span>
          <h1 className="mt-1 mb-2 text-[clamp(2rem,4vw,3.2rem)] leading-none tracking-[-0.04em] text-app-text-strong">
            {pageHeading.title}
          </h1>
          <p className="text-app-text-muted">{pageHeading.description}</p>
        </div>
        <div className="heading-accent pt-2 text-2xl text-app-accent opacity-80" aria-hidden="true">
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
          onBackToLobby={returnToLobby}
          onDeleteGame={() => {
            if (!selectedGame) return;
            void deleteGame(selectedGame.code).then((deleted) => {
              if (deleted) returnToLobby();
            });
          }}
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
  const { user, friends, openProfile, t } = controller;
  return (
    <aside className="insights-panel grid content-start gap-4">
      <div className="insight-card profile-insight rounded-2xl border border-app-border bg-app-surface p-4 shadow-lg">
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
        <button
          className="quiet-button profile-insight-action flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-app-border px-3 py-2 text-sm font-semibold transition hover:border-app-accent hover:bg-app-muted"
          type="button"
          onClick={() => void openProfile()}
        >
          {t('sidebar.profile')}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </aside>
  );
}

function PromotionDialog({ controller }: AuthenticatedComponentProps) {
  const { promotionMove, commitMove, t } = controller;
  if (!promotionMove) return null;
  return (
    <dialog
      open
      className="promotion-dialog fixed left-1/2 top-1/2 z-20 grid min-w-72 -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-app-border-strong bg-app-surface p-4 text-app-text shadow-2xl"
      aria-label={t('promotion.label')}
    >
      <strong>{t('promotion.label')}</strong>
      <div className="promotion-actions grid grid-cols-2 gap-2">
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
  const pageHeading = pageHeadingFor(view, t);
  const isGameView = view === 'game';
  let profileContent = null;
  if (profileLoading) {
    profileContent = <div className="centered-message">{t('profile.loading')}</div>;
  } else if (profile) {
    profileContent = <ProfileView t={t} language={language} profile={profile} />;
  }

  return (
    <main
      className={
        view === 'game'
          ? 'app-shell game-mode grid min-h-dvh bg-app-page text-app-text'
          : 'app-shell grid min-h-dvh bg-app-page text-app-text'
      }
      data-theme={theme}
    >
      <div className="dashboard-shell grid w-full min-w-0">
        <AuthenticatedHeader controller={controller} />
        <div
          className={
            isGameView
              ? 'dashboard-grid grid min-w-0 grid-cols-[minmax(0,1fr)]'
              : 'dashboard-grid grid min-w-0 grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)_minmax(14rem,18rem)] max-xl:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)] max-xl:[&>.insights-panel]:hidden max-lg:grid-cols-1'
          }
        >
          {!isGameView ? <DashboardSidebar controller={controller} /> : null}
          <DashboardContent
            controller={controller}
            pageHeading={pageHeading}
            profileContent={profileContent}
            turnLabel={turnLabel}
          />
          {!isGameView ? <InsightsPanel controller={controller} /> : null}
        </div>
      </div>
      <PromotionDialog controller={controller} />
      <AppFooter t={t} />
    </main>
  );
}
