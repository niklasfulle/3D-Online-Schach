import type { ReactNode } from 'react';

import type { AppController } from '../../app/useAppController';
import type { NotificationItem } from '../../app/types';
import type { Translator } from '../../i18n';
import { PROMOTION_OPTIONS } from '../../app/config';
import {
  gamePath,
  notificationMessage,
  notificationTitle,
  pageHeadingFor,
  spectatorPath,
} from '../../app/utils';
import { AppFooter } from './AppFooter';
import {
  AdminView,
  CorrespondenceInvitePopover,
  CorrespondenceView,
  FriendsView,
  HistoryView,
  LeaderboardView,
  LobbyView,
  ProfileView,
  ReplayView,
} from './DashboardViews';
import { GameView } from './GameView';
import { LanguageMenu, ThemeMenu } from './Menus';
import { LobbyUnavailablePopover } from './LobbyUnavailablePopover';

const iconButtonClass =
  'relative grid size-10 cursor-pointer place-items-center rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-app-accent shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)] transition-[border-color,background,color,transform] hover:-translate-y-px hover:border-app-accent hover:bg-[var(--chrome-control-hover)] hover:text-[var(--chrome-text)] active:scale-95 focus-visible:outline-3 focus-visible:outline-[rgb(112_168_255_/_42%)] focus-visible:outline-offset-2';
const logoutButtonClass =
  'relative grid size-10 cursor-pointer place-items-center rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] text-[var(--chrome-danger)] shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)] transition-[border-color,background,color,transform] hover:-translate-y-px hover:border-[var(--chrome-danger)] hover:bg-[var(--chrome-danger-bg-hover)] hover:text-[var(--chrome-danger-hover)] active:scale-95 focus-visible:outline-3 focus-visible:outline-[rgb(112_168_255_/_42%)] focus-visible:outline-offset-2';
const navButtonClass =
  'relative grid min-h-[2.85rem] w-full cursor-pointer grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-xl border border-transparent px-2.5 py-2 text-left text-xs font-semibold text-[var(--chrome-muted)] transition-[border-color,background,color,transform] hover:translate-x-px hover:border-[var(--chrome-border)] hover:bg-[var(--chrome-control-hover)] hover:text-[var(--chrome-subtle)]';
const activeNavButtonClass =
  'border-app-accent/50 bg-[var(--chrome-nav-active)] text-[var(--chrome-text)] shadow-[var(--chrome-nav-active-shadow)]';
const quietButtonClass =
  'cursor-pointer rounded-xl px-3 py-2 text-app-accent transition hover:bg-app-muted';

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
  if (notification.type === 'friend_request') return '/friends';
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
    setView,
    user,
    openProfile,
    logout,
    t,
  } = controller;
  const unreadCount = notifications.filter((item) => !item.read).length;
  return (
    <header className="flex min-h-[4.875rem] items-center justify-between gap-4 border-b border-[var(--chrome-border)] bg-[var(--chrome-surface)] px-[clamp(1rem,3vw,2rem)] py-4 max-lg:flex-wrap">
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgb(255_212_117_/_42%)] bg-[linear-gradient(145deg,#304a68,#1d2e45)] text-xl text-white shadow-[0_8px_22px_rgb(209_160_72_/_22%)]"
          aria-hidden="true"
        >
          ♞
        </div>
        <div>
          <p className="mb-1 text-xs font-bold tracking-[0.14em] text-app-accent">
            3D ONLINE-SCHACH
          </p>
          <strong className="text-base tracking-[-.02em] text-[var(--chrome-text)]">
            Chessboard
          </strong>
        </div>
      </div>
      <div className="flex items-center gap-2 max-md:flex-wrap">
        <ThemeMenu theme={theme} onChange={setTheme} t={t} />
        <LanguageMenu language={language} onChange={setLanguage} t={t} />
        <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[rgb(95_214_153_/_25%)] bg-[#153d2b] px-3 py-1.5 text-[.72rem] font-bold text-[#b6f4cb]">
          <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />{' '}
          {t('header.online')}
        </span>
        <div className="relative">
          <button
            className={iconButtonClass}
            type="button"
            aria-label={`${t('notifications.label')} (${unreadCount})`}
            title={t('notifications.label')}
            onClick={() => setNotificationsOpen((open) => !open)}
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
                d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM9.75 21h4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {unreadCount ? (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-[#e28b63] px-1 py-0.5 text-center text-[.62rem] font-extrabold text-[#20151a]">
                {unreadCount}
              </span>
            ) : null}
          </button>
          {notificationsOpen ? (
            <section
              className="absolute right-0 top-[calc(100%+.65rem)] z-10 grid w-[min(22rem,calc(100vw-2rem))] gap-3 rounded-xl border border-[rgb(111_151_201_/_24%)] bg-[#101b2c] p-3.5 shadow-[0_18px_45px_rgb(0_0_0_/_28%)]"
              aria-label={t('notifications.label')}
            >
              <div className="flex items-center justify-between gap-3">
                <strong>{t('notifications.label')}</strong>
                <button className={quietButtonClass} type="button" onClick={refreshNotifications}>
                  {t('notifications.refresh')}
                </button>
              </div>
              {notifications.length ? (
                <div className="grid gap-2">
                  {notifications.map((notification) => {
                    const itemClass = notification.read
                      ? 'grid w-full cursor-pointer gap-1 rounded-lg border border-transparent bg-transparent p-2.5 text-left text-[#d8e7ff] no-underline transition hover:border-[rgb(105_171_235_/_25%)] hover:bg-[rgb(56_112_176_/_13%)]'
                      : 'grid w-full cursor-pointer gap-1 rounded-lg border border-[rgb(105_171_235_/_25%)] bg-[rgb(56_112_176_/_13%)] p-2.5 text-left text-[#d8e7ff] no-underline transition';
                    const target = notificationTarget(notification);
                    const content = (
                      <>
                        <strong>{notificationTitle(notification, language, t)}</strong>
                        <span>{notificationMessage(notification, language, t)}</span>
                        {target ? (
                          <span className="text-xs font-bold text-[#9cc6ff]">
                            {notificationTargetLabel(notification.type, t)}
                          </span>
                        ) : null}
                      </>
                    );
                    return target ? (
                      <a
                        className={itemClass}
                        href={target}
                        key={notification.id}
                        onClick={(event) => {
                          if (notification.type === 'friend_request') {
                            event.preventDefault();
                            setView('friends');
                          }
                          void markNotificationRead(notification);
                        }}
                      >
                        {content}
                      </a>
                    ) : (
                      <button
                        className={itemClass}
                        key={notification.id}
                        type="button"
                        onClick={() => markNotificationRead(notification)}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-app-text-muted">{t('notifications.empty')}</p>
              )}
            </section>
          ) : null}
        </div>
        <button
          className="flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-[var(--chrome-border)] bg-[var(--chrome-control)] px-1 py-1 pr-2 text-xs font-semibold text-[var(--chrome-subtle)] shadow-[inset_0_1px_0_rgb(255_255_255_/_4%)] transition hover:-translate-y-px hover:border-app-accent hover:bg-[var(--chrome-control-hover)] hover:text-[var(--chrome-text)] active:scale-[.98] focus-visible:outline-3 focus-visible:outline-[rgb(112_168_255_/_42%)] focus-visible:outline-offset-2"
          type="button"
          aria-label={`${user?.username} · ${user?.rating}`}
          title={t('sidebar.profile')}
          onClick={openProfile}
        >
          <span className="grid size-7 place-items-center rounded-full bg-[linear-gradient(145deg,#365f8f,#203854)] text-xs font-extrabold text-white">
            {user?.username.slice(0, 1).toUpperCase()}
          </span>
          <span>{user?.username}</span>
          <span className="tabular-nums text-[#83b6f0]">{user?.rating}</span>
        </button>
        <button
          className={logoutButtonClass}
          type="button"
          aria-label={t('auth.logout')}
          title={t('auth.logout')}
          onClick={logout}
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
              d="M10 5H5.5A1.5 1.5 0 0 0 4 6.5v11A1.5 1.5 0 0 0 5.5 19H10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
    correspondenceGames,
    leaderboard,
    openHistory,
    refreshCorrespondence,
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
    <aside className="flex min-h-0 flex-col justify-between border-r border-[var(--chrome-border)] bg-[var(--chrome-sidebar)] p-[1.35rem_.8rem] max-lg:border-r-0 max-lg:border-b">
      <div>
        <span className="mb-3 ml-2 block text-[.6rem] font-extrabold uppercase tracking-[.14em] text-[#6f8dab]">
          {t('sidebar.workspace')}
        </span>
        <nav className="grid gap-1" aria-label={t('sidebar.navigation')}>
          <button
            className={`${navButtonClass} ${view === 'lobby' ? activeNavButtonClass : ''}`}
            type="button"
            onClick={() => setView('lobby')}
          >
            <span
              className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
              aria-hidden="true"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z"
                  strokeLinejoin="round"
                />
                <path d="M9.5 20v-5h5v5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{t('sidebar.lobby')}</span>
            <span className="min-w-5 rounded-full bg-[var(--chrome-nav-badge)] px-1.5 py-0.5 text-center text-[.63rem] font-bold tabular-nums leading-none text-[var(--chrome-nav-badge-text)]">
              {lobbyGames.length}
            </span>
          </button>
          <button
            className={`${navButtonClass} ${view === 'leaderboard' ? activeNavButtonClass : ''}`}
            type="button"
            onClick={() => setView('leaderboard')}
          >
            <span
              className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
              aria-hidden="true"
            >
              ♛
            </span>
            <span>{t('sidebar.leaderboard')}</span>
            <span className="min-w-5 rounded-full bg-[var(--chrome-nav-badge)] px-1.5 py-0.5 text-center text-[.63rem] font-bold tabular-nums leading-none text-[var(--chrome-nav-badge-text)]">
              {leaderboard?.entries.length ?? 0}
            </span>
          </button>
          <button
            className={`${navButtonClass} ${view === 'history' ? activeNavButtonClass : ''}`}
            type="button"
            onClick={openHistory}
          >
            <span
              className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
              aria-hidden="true"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="8" />
                <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span>{t('sidebar.history')}</span>
            <span className="min-w-5 rounded-full bg-[var(--chrome-nav-badge)] px-1.5 py-0.5 text-center text-[.63rem] font-bold tabular-nums leading-none text-[var(--chrome-nav-badge-text)]">
              {historyGames.length}
            </span>
          </button>
          <button
            className={`${navButtonClass} ${view === 'correspondence' ? activeNavButtonClass : ''}`}
            type="button"
            onClick={() => {
              setView('correspondence');
              refreshCorrespondence();
            }}
          >
            <span
              className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
              aria-hidden="true"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M4 6.5h16v11H4z" strokeLinejoin="round" />
                <path d="M8 10h8M8 14h5" strokeLinecap="round" />
              </svg>
            </span>
            <span>{t('sidebar.correspondence')}</span>
            <span className="min-w-5 rounded-full bg-[var(--chrome-nav-badge)] px-1.5 py-0.5 text-center text-[.63rem] font-bold tabular-nums leading-none text-[var(--chrome-nav-badge-text)]">
              {correspondenceGames.length}
            </span>
          </button>
          {user?.role === 'admin' ? (
            <button
              className={`${navButtonClass} ${view === 'admin' ? activeNavButtonClass : ''}`}
              type="button"
              onClick={() => {
                setView('admin');
                refreshAdminUsers();
              }}
            >
              <span
                className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
                aria-hidden="true"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="m12 3 7 3.5v4.75c0 4.4-3.02 7.34-7 9.75-3.98-2.41-7-5.35-7-9.75V6.5L12 3Z"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 12.1 11 13.6l3.5-3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>{t('sidebar.administration')}</span>
              <span className="min-w-5 rounded-full bg-[var(--chrome-nav-badge)] px-1.5 py-0.5 text-center text-[.63rem] font-bold tabular-nums leading-none text-[var(--chrome-nav-badge-text)]">
                {adminUsers.length}
              </span>
            </button>
          ) : null}
          <button
            className={`${navButtonClass} ${view === 'friends' ? activeNavButtonClass : ''}`}
            type="button"
            onClick={() => {
              setView('friends');
              refreshFriends();
            }}
          >
            <span
              className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
              aria-hidden="true"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="9" cy="9" r="3" />
                <path d="M3.8 20c.55-3.15 2.25-5 5.2-5s4.65 1.85 5.2 5" strokeLinecap="round" />
                <path
                  d="M15.5 7.1a2.5 2.5 0 0 1 0 4.8M16.2 15.3c2.1.42 3.38 1.94 3.9 4.7"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>{t('sidebar.friends')}</span>
            <span className="min-w-5 rounded-full bg-[var(--chrome-nav-badge)] px-1.5 py-0.5 text-center text-[.63rem] font-bold tabular-nums leading-none text-[var(--chrome-nav-badge-text)]">
              {friends?.friends.length ?? 0}
            </span>
          </button>
          {selectedGame ? (
            <button
              className={`${navButtonClass} ${view === 'game' ? activeNavButtonClass : ''}`}
              type="button"
              onClick={openSelectedGame}
            >
              <span
                className="grid size-6 place-items-center rounded-lg text-[#83b4e6]"
                aria-hidden="true"
              >
                <svg
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path
                    d="M7 5h10l-1 4-2-1-2 1-2-1-2 1-1-4ZM8.5 10h7l.8 6H7.7l.8-6ZM6 20h12M8 16h8v4H8z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span>{t('sidebar.activeGame')}</span>
              <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />
            </button>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}

function notificationTargetLabel(type: NotificationItem['type'], t: Translator): string {
  if (type === 'friend_request') return t('notifications.openFriends');
  if (type === 'spectator_invitation') return t('notifications.openSpectator');
  return t('notifications.openGame');
}

function DashboardHeading({
  view,
  pageHeading,
}: Readonly<{
  view: AppController['view'];
  pageHeading: ReturnType<typeof pageHeadingFor>;
}>) {
  if (view === 'game') return null;

  return (
    <div className="mb-7 flex items-start justify-between gap-4 max-sm:mb-5">
      <div>
        <span className="mb-2 text-xs font-bold tracking-[.14em] text-app-accent">
          {pageHeading.eyebrow}
        </span>
        <h1 className="mt-1 mb-2 text-[clamp(2rem,4vw,3.2rem)] leading-none tracking-[-0.04em] text-app-text-strong">
          {pageHeading.title}
        </h1>
        <p className="text-app-text-muted">{pageHeading.description}</p>
      </div>
      <div className="heading-accent pt-2 text-2xl text-app-accent opacity-80" aria-hidden="true">
        ✦
      </div>
    </div>
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
    user,
    friends,
    correspondenceInviteOpen,
    correspondenceInviteLoading,
    correspondenceInviteSending,
    correspondenceInviteGame,
    cancelCorrespondenceInvite,
    inviteCorrespondenceFriend,
  } = controller;

  if (!user) {
    return null;
  }

  return (
    <section
      className={`w-full min-w-0 px-[clamp(1rem,3vw,2rem)] py-6 ${
        view === 'game' ? 'grid min-h-0 h-full' : ''
      }`}
    >
      {unavailableLobbyCode ? (
        <LobbyUnavailablePopover
          code={unavailableLobbyCode}
          onClose={() => setUnavailableLobbyCode(null)}
          t={t}
        />
      ) : null}
      {correspondenceInviteOpen ? (
        <CorrespondenceInvitePopover
          t={t}
          friends={friends}
          loading={correspondenceInviteLoading}
          sending={correspondenceInviteSending}
          game={correspondenceInviteGame}
          onInvite={inviteCorrespondenceFriend}
          onClose={cancelCorrespondenceInvite}
        />
      ) : null}
      {error ? (
        <div
          className="flex w-full items-start justify-between gap-4 rounded-xl border border-[#8e4654] bg-[#3d202b] px-4 py-3 text-sm leading-6 text-[#ffdce3]"
          role="alert"
          aria-live="polite"
        >
          <span>
            <strong>{t('guest.connectionHint')}</strong>
            {error}
          </span>
          <button aria-label={t('guest.closeHint')} type="button" onClick={() => setError('')}>
            ×
          </button>
        </div>
      ) : null}
      <DashboardHeading view={view} pageHeading={pageHeading} />
      <DashboardViewPanel controller={controller} profileContent={profileContent} turnLabel={turnLabel} />
    </section>
  );
}

function DashboardViewPanel({
  controller,
  profileContent,
  turnLabel,
}: AuthenticatedComponentProps & { profileContent: ReactNode; turnLabel: string }) {
  const { view, user } = controller;
  if (!user) return null;

  switch (view) {
    case 'lobby':
      return (
        <LobbyView
          t={controller.t}
          games={controller.lobbyGames}
          onRefresh={() => controller.refreshLobby()}
          onCreate={(mode) => controller.createGame(mode)}
          onJoin={(code) => controller.joinGame(code)}
          onDelete={(code) => controller.deleteGame(code)}
        />
      );
    case 'history':
      return (
        <HistoryView
          t={controller.t}
          language={controller.language}
          userId={user.id}
          games={controller.historyGames}
          cursor={controller.historyCursor}
          loading={controller.historyLoading}
          resultFilter={controller.historyResultFilter}
          modeFilter={controller.historyModeFilter}
          selectedGame={controller.selectedHistoryGame}
          onResultFilterChange={controller.setHistoryResultFilter}
          onModeFilterChange={controller.setHistoryModeFilter}
          onSelect={controller.setSelectedHistoryGame}
          onLoadMore={() => controller.refreshHistory(controller.historyCursor)}
          onOpenReplay={controller.openReplay}
        />
      );
    case 'correspondence':
      return (
        <CorrespondenceView
          t={controller.t}
          games={controller.correspondenceGames}
          onStart={() => controller.createGame('correspondence')}
          onOpen={controller.openCorrespondenceGame}
        />
      );
    case 'leaderboard':
      return (
        <LeaderboardView
          t={controller.t}
          data={controller.leaderboard}
          archive={controller.seasonArchive}
          userId={user.id}
          selectedSeason={controller.selectedSeasonLeaderboard}
          onSelectSeason={controller.openSeasonLeaderboard}
          onPageChange={controller.loadLeaderboardPage}
        />
      );
    case 'replay':
      return (
        <ReplayView
          game={controller.replayGame}
          loading={controller.replayLoading}
          userId={user.id}
          t={controller.t}
          onBack={() => controller.setView('history')}
        />
      );
    case 'profile':
      return profileContent;
    case 'public-profile':
      return controller.publicProfile ? (
        <ProfileView
          t={controller.t}
          language={controller.language}
          profile={controller.publicProfile}
          publicProfile
        />
      ) : null;
    case 'friends':
      return (
        <FriendsView
          t={controller.t}
          friends={controller.friends}
          canInvite={controller.selectedGame?.status === 'waiting' && controller.selectedGame.whitePlayerId === user.id}
          canInviteSpectator={controller.selectedGame?.status === 'active' && isPlayerInGame(controller.selectedGame, user.id)}
          searchQuery={controller.searchQuery}
          setSearchQuery={controller.setSearchQuery}
          searchResults={controller.searchResults}
          onSearch={controller.searchUsers}
          onAdd={controller.sendFriendRequest}
          onRespond={controller.respondToRequest}
          onInvite={controller.inviteFriend}
          onInviteSpectator={controller.inviteSpectator}
          onViewProfile={controller.openPublicProfile}
        />
      );
    case 'admin':
      return user.role === 'admin' ? (
        <AdminView
          t={controller.t}
          users={controller.adminUsers}
          onRefresh={controller.refreshAdminUsers}
          onRoleChange={controller.updateAdminRole}
        />
      ) : null;
    case 'game':
      return controller.selectedGame ? (
        <GameView
          user={user}
          language={controller.language}
          t={controller.t}
          selectedGame={controller.selectedGame}
          gameState={controller.gameState}
          selectedSquare={controller.selectedSquare}
          legalTargets={controller.legalTargets}
          moveHistory={controller.moveHistory}
          turnLabel={turnLabel}
          onBackToLobby={controller.returnToLobby}
          onDeleteGame={() => {
            if (!controller.selectedGame) return;
            controller.deleteGame(controller.selectedGame.code).then((deleted) => {
              if (deleted) controller.returnToLobby();
            });
          }}
          handleSelectSquare={controller.handleSelectSquare}
          onCopyLink={controller.copyGameLink}
          linkCopied={controller.linkCopied}
          spectatorMode={controller.spectatorMode}
          onCopySpectatorLink={controller.copySpectatorLink}
          spectatorLinkCopied={controller.spectatorLinkCopied}
          chatMessages={controller.chatMessages}
          chatDraft={controller.chatDraft}
          onChatDraftChange={controller.setChatDraft}
          onSendChat={controller.sendChat}
          onResign={controller.resignGame}
        />
      ) : null;
    default:
      return null;
  }
}

function isPlayerInGame(game: NonNullable<AppController['selectedGame']>, userId: string): boolean {
  return game.whitePlayerId === userId || game.blackPlayerId === userId;
}

function InsightsPanel({ controller }: AuthenticatedComponentProps) {
  const { user, friends, openProfile, t } = controller;
  return (
    <aside className="grid content-start gap-4 border-l border-[var(--chrome-border)] bg-[color-mix(in_srgb,var(--surface-muted)_42%,transparent)] p-4">
      <div className="grid gap-2 rounded-2xl border border-app-border bg-[var(--chrome-surface)] p-4 shadow-lg">
        <div className="flex items-center justify-between text-[.6rem] font-extrabold tracking-[.12em] text-app-text-muted">
          <span>{t('insight.status')}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(95_214_153_/_25%)] bg-[#153d2b] px-2 py-1 text-[.65rem] font-bold tracking-normal text-[#b6f4cb]">
            <span className="inline-block size-[.42rem] rounded-full bg-[#6de29d] shadow-[0_0_0_3px_rgb(109_226_157_/_12%)]" />{' '}
            Live
          </span>
        </div>
        <div className="my-2 grid size-14 place-items-center rounded-full bg-[linear-gradient(145deg,#639bd7,#294a73)] text-xl font-extrabold text-white">
          {user?.username.slice(0, 1).toUpperCase()}
        </div>
        <strong>{user?.username}</strong>
        <span className="text-app-text-muted">{t('insight.ready')}</span>
        <div className="mt-2 flex items-center gap-5 border-t border-[rgb(111_151_201_/_14%)] pt-3">
          <div>
            <strong className="block text-[.92rem] tabular-nums text-app-text-strong">
              {user?.rating}
            </strong>
            <span className="text-[.64rem] text-app-text-muted">{t('insight.rating')}</span>
          </div>
          <div>
            <strong className="block text-[.92rem] tabular-nums text-app-text-strong">
              {friends?.friends.length ?? 0}
            </strong>
            <span className="text-[.64rem] text-app-text-muted">{t('insight.friends')}</span>
          </div>
        </div>
        <button
          className="flex min-h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-app-border px-3 py-2 text-sm font-semibold text-app-accent transition hover:border-app-accent hover:bg-app-muted"
          type="button"
          onClick={openProfile}
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
      className="fixed left-1/2 top-1/2 z-20 grid min-w-72 -translate-x-1/2 -translate-y-1/2 gap-4 rounded-2xl border border-app-border-strong bg-app-surface p-4 text-app-text shadow-2xl"
      aria-label={t('promotion.label')}
    >
      <strong>{t('promotion.label')}</strong>
      <div className="grid grid-cols-2 gap-2">
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
  const {
    user,
    language,
    theme,
    view,
    gameState,
    profileLoading,
    profile,
    seasonArchive,
    profileSeasonId,
    openProfileSeason,
    t,
  } = controller;

  if (!user) {
    return null;
  }

  const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
  const pageHeading = pageHeadingFor(view, t);
  const isGameView = view === 'game';
  let profileContent = null;
  if (profileLoading) {
    profileContent = (
      <div className="grid min-h-dvh place-items-center bg-[var(--app-bg)] text-app-text-muted">
        {t('profile.loading')}
      </div>
    );
  } else if (profile) {
    profileContent = (
      <ProfileView
        t={t}
        language={language}
        profile={profile}
        seasons={seasonArchive}
        selectedSeasonId={profileSeasonId}
        onSelectSeason={openProfileSeason}
      />
    );
  }

  return (
    <main
      className={`grid min-h-dvh grid-rows-[1fr_auto] bg-[var(--app-bg)] text-app-text ${
        isGameView ? 'min-[821px]:h-dvh min-[821px]:grid-rows-[minmax(0,1fr)_auto]' : ''
      }`}
      data-theme={theme}
    >
      <div
        className={`grid min-h-0 w-full min-w-0 grid-rows-[auto_1fr] overflow-hidden bg-[var(--app-shell)] backdrop-blur-3xl ${
          isGameView ? 'min-[821px]:grid-rows-[auto_minmax(0,1fr)]' : ''
        }`}
      >
        <AuthenticatedHeader controller={controller} />
        <div
          className={
            isGameView
              ? 'grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)]'
              : 'grid min-w-0 grid-cols-[minmax(14rem,16rem)_minmax(0,1fr)_minmax(14rem,18rem)] max-xl:grid-cols-[minmax(13rem,15rem)_minmax(0,1fr)] max-xl:[&>aside:last-child]:hidden max-lg:grid-cols-1'
          }
        >
          {isGameView ? null : <DashboardSidebar controller={controller} />}
          <DashboardContent
            controller={controller}
            pageHeading={pageHeading}
            profileContent={profileContent}
            turnLabel={turnLabel}
          />
          {isGameView ? null : <InsightsPanel controller={controller} />}
        </div>
      </div>
      <PromotionDialog controller={controller} />
      <AppFooter t={t} />
    </main>
  );
}
