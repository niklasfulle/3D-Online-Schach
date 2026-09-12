import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { io, type Socket } from 'socket.io-client';

import { ChessGame, type Move } from '@chess3d/chess-core';
import type { GameMode, GameSummary, Square, UserRole } from '@chess3d/shared';

import { createTranslator, readLanguage, saveLanguage, type Language } from '../i18n';
import { requestJson as requestApi } from '../request';
import { readTheme, saveTheme, type Theme } from '../theme';
import { API_URL } from './config';
import type {
  AcceptedMove,
  AdminUser,
  AppView,
  AuthUser,
  ChatMessage,
  FriendsOverview,
  GameSync,
  HistoryGame,
  HistoryModeFilter,
  HistoryPage,
  HistoryResultFilter,
  LobbyGame,
  MoveRecord,
  NotificationItem,
  SocialUser,
  UserProfile,
} from './types';
import {
  canSelectSquare,
  gamePath,
  invitationCodeFromPath,
  pathForView,
  publicProfileIdFromPath,
  publicProfilePath,
  spectatorCodeFromPath,
  spectatorPath,
  setGamePath,
  viewFromPath,
} from './utils';

export function useAppController() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [unavailableLobbyCode, setUnavailableLobbyCode] = useState<string | null>(null);
  const [view, setView] = useState<AppView>(() =>
    viewFromPath(globalThis.location?.pathname ?? '/'),
  );
  const [lobbyGames, setLobbyGames] = useState<LobbyGame[]>([]);
  const [historyGames, setHistoryGames] = useState<HistoryGame[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | undefined>();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyResultFilter, setHistoryResultFilter] = useState<HistoryResultFilter>('all');
  const [historyModeFilter, setHistoryModeFilter] = useState<HistoryModeFilter>('all');
  const [selectedHistoryGame, setSelectedHistoryGame] = useState<HistoryGame | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [publicProfile, setPublicProfile] = useState<UserProfile | null>(null);
  const [friends, setFriends] = useState<FriendsOverview | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [game, setGame] = useState(() => new ChessGame());
  const [gameState, setGameState] = useState(() => game.getState());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [spectatorMode, setSpectatorMode] = useState(false);
  const [spectatorLinkCopied, setSpectatorLinkCopied] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const selectedGameCodeRef = useRef<string | null>(null);
  const invitationAttemptRef = useRef<string | null>(null);
  const pathname = globalThis.location?.pathname ?? '/';
  const inviteCode = invitationCodeFromPath(pathname);
  const spectatorCode = spectatorCodeFromPath(pathname);
  const publicProfileId = publicProfileIdFromPath(pathname);
  const t = createTranslator(language);

  function navigateToView(nextView: Exclude<AppView, 'game' | 'public-profile'>) {
    setView(nextView);
    const nextPath = pathForView(nextView);
    if (globalThis.location?.pathname !== nextPath) {
      globalThis.history?.pushState({}, '', nextPath);
    }
  }

  function navigateToPublicProfile(id: string) {
    setView('public-profile');
    const nextPath = publicProfilePath(id);
    if (globalThis.location?.pathname !== nextPath) {
      globalThis.history?.pushState({}, '', nextPath);
    }
  }

  useEffect(() => {
    saveLanguage(language);
  }, [language]);

  useEffect(() => {
    saveTheme(theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const refreshLobby = useCallback(async () => {
    const response = await requestApi<{ games: LobbyGame[] }>(API_URL, '/lobby');
    setLobbyGames(response.games);
  }, []);

  const refreshHistory = useCallback(async (cursor?: string) => {
    setHistoryLoading(true);
    try {
      const query = new URLSearchParams({ limit: '20' });
      if (cursor) query.set('cursor', cursor);
      const response = await requestApi<HistoryPage>(API_URL, `/games/history?${query.toString()}`);
      setHistoryGames((games) => (cursor ? [...games, ...response.games] : response.games));
      setHistoryCursor(response.nextCursor);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshFriends = useCallback(async () => {
    setFriends(await requestApi<FriendsOverview>(API_URL, '/friends'));
  }, []);

  const refreshProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      setProfile(await requestApi<UserProfile>(API_URL, '/profile'));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const refreshAdminUsers = useCallback(async () => {
    const response = await requestApi<{ users: AdminUser[] }>(API_URL, '/admin/users');
    setAdminUsers(response.users);
  }, []);

  const refreshNotifications = useCallback(async () => {
    const response = await requestApi<{ notifications: NotificationItem[] }>(
      API_URL,
      '/notifications',
    );
    setNotifications(response.notifications);
  }, []);

  const refreshChat = useCallback(async (code: string) => {
    const response = await requestApi<{ messages: ChatMessage[] }>(
      API_URL,
      `/games/${encodeURIComponent(code)}/chat`,
    );
    setChatMessages(response.messages);
  }, []);

  useEffect(() => {
    requestApi<{ user: AuthUser }>(API_URL, '/auth/me')
      .then(({ user: authenticatedUser }) => setUser(authenticatedUser))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setView(viewFromPath(globalThis.location?.pathname ?? '/'));
    };
    globalThis.addEventListener?.('popstate', handlePopState);
    return () => globalThis.removeEventListener?.('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (!user) return;
    void refreshLobby().catch((error_: unknown) =>
      setError(error_ instanceof Error ? error_.message : t('error.lobbyLoad')),
    );
    void refreshFriends().catch((error_: unknown) =>
      setError(error_ instanceof Error ? error_.message : t('error.friendsLoad')),
    );
    void refreshNotifications().catch(() => undefined);
  }, [refreshFriends, refreshLobby, refreshNotifications, user]);

  useEffect(() => {
    if (!user) return;
    if (view === 'history') {
      void refreshHistory().catch((error_: unknown) =>
        setError(error_ instanceof Error ? error_.message : t('error.historyLoad')),
      );
    }
    if (view === 'profile') {
      void refreshProfile().catch((error_: unknown) =>
        setError(error_ instanceof Error ? error_.message : t('error.profileLoad')),
      );
    }
    if (view === 'friends') {
      void refreshFriends().catch((error_: unknown) =>
        setError(error_ instanceof Error ? error_.message : t('error.friendsLoad')),
      );
    }
    if (view === 'admin' && user.role === 'admin') {
      void refreshAdminUsers().catch((error_: unknown) =>
        setError(error_ instanceof Error ? error_.message : t('error.lobbyLoad')),
      );
    }
    if (view === 'public-profile' && publicProfileId) {
      setPublicProfile(null);
      void requestApi<UserProfile>(API_URL, `/users/${encodeURIComponent(publicProfileId)}/profile`)
        .then(setPublicProfile)
        .catch((error_: unknown) =>
          setError(error_ instanceof Error ? error_.message : t('error.profileLoad')),
        );
    }
  }, [
    publicProfileId,
    refreshAdminUsers,
    refreshFriends,
    refreshHistory,
    refreshProfile,
    user,
    view,
  ]);

  useEffect(() => {
    if (!user || view !== 'lobby') return;

    const timer = globalThis.setInterval(() => {
      void refreshLobby().catch(() => undefined);
    }, 5_000);
    return () => globalThis.clearInterval(timer);
  }, [refreshLobby, user, view]);

  useEffect(() => {
    selectedGameCodeRef.current = selectedGame?.code ?? null;
  }, [selectedGame]);

  function handleGameRemoved(payload: { code?: string }) {
    if (!payload.code) return;
    setLobbyGames((games) => games.filter((game) => game.code !== payload.code));
  }

  function handleChatMessage(message: ChatMessage) {
    setChatMessages((messages) =>
      messages.some((current) => current.id === message.id) ? messages : [...messages, message],
    );
  }

  useEffect(() => {
    if (!user && !spectatorCode) return;
    const socket = io(API_URL, {
      withCredentials: true,
      auth: user ? undefined : { spectator: true },
    });
    socketRef.current = socket;
    socket.on('game:state', (sync: GameSync) => applyGameSync(sync));
    socket.on('game:started', (nextGame: GameSummary) => {
      setSelectedGame(nextGame);
      selectedGameCodeRef.current = nextGame.code;
      setView('game');
      setGamePath(nextGame.code);
      socket.emit('game:sync', { code: nextGame.code });
    });
    socket.on('game:updated', (nextGame: GameSummary) => {
      if (selectedGameCodeRef.current !== nextGame.code) return;
      setSelectedGame(nextGame);
      socket.emit('game:sync', { code: nextGame.code });
    });
    socket.on('game:ended', (payload: { gameId: string; result: 'white' | 'black' | 'draw' }) => {
      setSelectedGame((current) =>
        current && current.id === payload.gameId
          ? { ...current, status: 'finished', result: payload.result, turnStartedAt: undefined }
          : current,
      );
    });
    socket.on('game:removed', handleGameRemoved);
    socket.on('move:accepted', (accepted: AcceptedMove) => {
      setSelectedGame(accepted.game);
      setGamePath(accepted.game.code);
      const nextGame = new ChessGame(accepted.fen);
      setGame(nextGame);
      setGameState(nextGame.getState());
      setMoveHistory((history) => [...history, accepted.move]);
      resetSelection();
    });
    socket.on('chat:message', handleChatMessage);
    socket.on('chat:error', (payload: { error?: string }) =>
      setError(payload.error ?? t('error.chat')),
    );
    socket.on('game:error', (payload: { error?: string }) =>
      setError(payload.error ?? t('error.sync')),
    );
    socket.on('move:rejected', (payload: { reason?: string }) =>
      setError(payload.reason ?? t('error.move')),
    );
    socket.on('connect_error', () => setError(t('error.connection')));
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [spectatorCode, user]);

  useEffect(() => {
    if (!user || !inviteCode) return;
    const currentUser = user;
    const requestedInviteCode = inviteCode;
    if (invitationAttemptRef.current === inviteCode) return;
    invitationAttemptRef.current = inviteCode;

    async function openInvitation() {
      try {
        const invitedGame = await requestApi<GameSummary>(API_URL, `/games/${requestedInviteCode}`);
        const isParticipant =
          invitedGame.whitePlayerId === currentUser.id ||
          invitedGame.blackPlayerId === currentUser.id;
        const nextGame =
          invitedGame.status === 'waiting' && !isParticipant
            ? await requestApi<GameSummary>(API_URL, `/lobby/games/${requestedInviteCode}/join`, {
                method: 'POST',
              })
            : invitedGame;

        if (!isParticipant && invitedGame.status !== 'waiting') {
          throw new Error(t('error.gameOpen'));
        }
        openGame(nextGame);
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : t('error.gameOpen'));
        handleUnavailableLobby(requestedInviteCode);
      }
    }

    void openInvitation();
  }, [inviteCode, user]);

  useEffect(() => {
    if (!spectatorCode) return;

    async function openSpectatorView() {
      try {
        const sync = await requestApi<GameSync>(API_URL, `/games/${spectatorCode}/spectate`);
        openSpectatorGame(sync);
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : t('error.gameOpen'));
      }
    }

    void openSpectatorView();
  }, [spectatorCode, user]);

  function applyGameSync(sync: GameSync) {
    const nextGame = new ChessGame(sync.fen);
    setSelectedGame(sync.game);
    selectedGameCodeRef.current = sync.game.code;
    setGame(nextGame);
    setGameState(nextGame.getState());
    setMoveHistory(sync.moves);
    void refreshChat(sync.game.code).catch(() => undefined);
    setView('game');
    setLinkCopied(false);
    resetSelection();
  }

  function resetSelection() {
    setSelectedSquare(null);
    setLegalTargets([]);
  }

  async function submitAuth(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const response = await requestApi<{ user: AuthUser }>(API_URL, endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm),
      });
      setUser(response.user);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.authentication'));
    }
  }

  async function logout() {
    await requestApi(API_URL, '/auth/logout', { method: 'POST' });
    setUser(null);
    setSelectedGame(null);
    setProfile(null);
    setPublicProfile(null);
    selectedGameCodeRef.current = null;
    setView('lobby');
    setChatMessages([]);
    setChatDraft('');
    setLinkCopied(false);
    setSpectatorMode(false);
    setSpectatorLinkCopied(false);
    setGamePath(null);
  }

  function openGame(nextGame: GameSummary) {
    setError('');
    setUnavailableLobbyCode(null);
    invitationAttemptRef.current = nextGame.code;
    setSelectedGame(nextGame);
    selectedGameCodeRef.current = nextGame.code;
    setSpectatorMode(false);
    setView('game');
    setLinkCopied(false);
    setSpectatorLinkCopied(false);
    setGamePath(nextGame.code);
    setChatDraft('');
    void refreshChat(nextGame.code).catch(() => undefined);
    socketRef.current?.emit('game:sync', { code: nextGame.code });
  }

  function openSelectedGame() {
    if (!selectedGame) return;
    openGame(selectedGame);
  }

  function returnToLobby() {
    const shouldClearGame = spectatorMode || selectedGame?.status === 'finished';
    setView('lobby');
    setGamePath(null);
    if (shouldClearGame) {
      setSelectedGame(null);
      selectedGameCodeRef.current = null;
      setChatMessages([]);
      setChatDraft('');
      setLinkCopied(false);
    }
    setSpectatorMode(false);
    setSpectatorLinkCopied(false);
    void refreshLobby().catch(() => undefined);
  }

  function handleUnavailableLobby(code: string) {
    setSelectedGame(null);
    selectedGameCodeRef.current = null;
    setSpectatorMode(false);
    setView('lobby');
    setChatMessages([]);
    setChatDraft('');
    setUnavailableLobbyCode(code);
    setError('');
    setGamePath(null);
  }

  function openSpectatorGame(sync: GameSync) {
    setSpectatorMode(true);
    applyGameSync(sync);
    setSpectatorLinkCopied(false);
    globalThis.history?.replaceState({}, '', spectatorPath(sync.game.code));
    socketRef.current?.emit('game:spectate', { code: sync.game.code });
  }

  function sendChat() {
    const message = chatDraft.trim();
    if (!selectedGame || !message) return;
    socketRef.current?.emit('chat:send', { code: selectedGame.code, message });
    setChatDraft('');
  }

  async function copyGameLink() {
    if (!selectedGame) return;
    try {
      await navigator.clipboard.writeText(
        `${globalThis.location.origin}${gamePath(selectedGame.code)}`,
      );
      setLinkCopied(true);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.copyGameLink'));
    }
  }

  async function copySpectatorLink() {
    if (!selectedGame) return;
    try {
      await navigator.clipboard.writeText(
        `${globalThis.location.origin}${spectatorPath(selectedGame.code)}`,
      );
      setSpectatorLinkCopied(true);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.copySpectatorLink'));
    }
  }

  async function createGame(mode: GameMode) {
    try {
      const created = await requestApi<GameSummary>(API_URL, '/lobby/games', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      openGame(created);
      await refreshLobby();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.gameCreate'));
    }
  }

  async function joinGame(code: string) {
    const ownWaitingGame = lobbyGames.find((game) => game.code === code);
    if (ownWaitingGame?.isOwner) {
      openGame(ownWaitingGame);
      return;
    }

    try {
      const joined = await requestApi<GameSummary>(API_URL, `/lobby/games/${code}/join`, {
        method: 'POST',
      });
      openGame(joined);
      await refreshLobby();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.gameJoin'));
    }
  }

  async function deleteGame(code: string): Promise<boolean> {
    try {
      await requestApi(API_URL, `/lobby/games/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      setLobbyGames((games) => games.filter((game) => game.code !== code));
      return true;
    } catch (error_) {
      setError(
        error_ instanceof Error && error_.message !== 'Failed to fetch'
          ? error_.message
          : t('error.gameDelete'),
      );
      return false;
    }
  }

  async function resignGame() {
    if (!selectedGame) return;
    try {
      const response = await requestApi<{ game: GameSummary }>(
        API_URL,
        `/games/${encodeURIComponent(selectedGame.code)}/resign`,
        { method: 'POST' },
      );
      setSelectedGame(response.game);
      setLobbyGames((games) => games.filter((game) => game.code !== response.game.code));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.resign'));
    }
  }

  function openHistory() {
    navigateToView('history');
    setSelectedHistoryGame(null);
  }

  function openProfile() {
    navigateToView('profile');
  }

  function openPublicProfile(id: string) {
    navigateToPublicProfile(id);
    setPublicProfile(null);
  }

  async function updateAdminRole(id: string, role: UserRole) {
    try {
      const response = await requestApi<{ user: AdminUser }>(API_URL, `/admin/users/${id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setAdminUsers((users) =>
        users.map((adminUser) => (adminUser.id === id ? response.user : adminUser)),
      );
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.roleUpdate'));
    }
  }

  async function searchUsers(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const response = await requestApi<{ users: SocialUser[] }>(
        API_URL,
        `/users/search?q=${encodeURIComponent(searchQuery)}`,
      );
      setSearchResults(response.users);
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.userSearch'));
    }
  }

  async function sendFriendRequest(username: string) {
    try {
      await requestApi(API_URL, '/friends/requests', {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      await refreshFriends();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.friendRequest'));
    }
  }

  async function respondToRequest(id: string, action: 'accept' | 'reject') {
    try {
      await requestApi(API_URL, `/friends/requests/${id}/${action}`, {
        method: 'POST',
        body: '{}',
      });
      await refreshFriends();
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.request'));
    }
  }

  async function inviteFriend(username: string) {
    if (!selectedGame) return;
    try {
      await requestApi(API_URL, `/games/${selectedGame.code}/invitations`, {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      setError(t('friends.invite'));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.invitation'));
    }
  }

  async function inviteSpectator(username: string) {
    if (!selectedGame) return;
    try {
      await requestApi(API_URL, `/games/${selectedGame.code}/spectator-invitations`, {
        method: 'POST',
        body: JSON.stringify({ username }),
      });
      setError(t('friends.inviteSpectator'));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.spectatorInvitation'));
    }
  }

  async function markNotificationRead(notification: NotificationItem) {
    if (!notification.read) {
      try {
        const updated = await requestApi<NotificationItem>(
          API_URL,
          `/notifications/${notification.id}/read`,
          { method: 'POST' },
        );
        setNotifications((items) =>
          items.map((item) => (item.id === updated.id ? { ...item, read: true } : item)),
        );
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : t('error.notificationsUpdate'));
      }
    }
  }

  function commitMove(move: Move) {
    if (selectedGame) {
      socketRef.current?.emit('move:request', { code: selectedGame.code, ...move });
    } else {
      const nextGame = new ChessGame(gameState.fen);
      const record = nextGame.move(move);
      setGame(nextGame);
      setGameState(nextGame.getState());
      setMoveHistory((history) => [...history, record]);
    }
    setPromotionMove(null);
    resetSelection();
  }

  function handleSelectSquare(square: Square) {
    if (!canSelectSquare(promotionMove, selectedGame, user, gameState.activeColor)) return;

    if (selectedSquare && legalTargets.includes(square)) {
      const candidate = game.legalMoves(selectedSquare).find((move) => move.to === square);
      if (!candidate) return;
      if (candidate.promotion) setPromotionMove({ from: selectedSquare, to: square });
      else commitMove({ from: selectedSquare, to: square });
      return;
    }

    const moves = game.legalMoves(square);
    if (moves.length === 0) {
      resetSelection();
      return;
    }
    setSelectedSquare(square);
    setLegalTargets([...new Set(moves.map((move) => move.to))]);
  }

  return {
    user,
    language,
    theme,
    loading,
    authMode,
    authForm,
    error,
    unavailableLobbyCode,
    view,
    lobbyGames,
    historyGames,
    historyCursor,
    historyLoading,
    historyResultFilter,
    historyModeFilter,
    selectedHistoryGame,
    profile,
    profileLoading,
    publicProfile,
    friends,
    adminUsers,
    notifications,
    notificationsOpen,
    searchQuery,
    searchResults,
    selectedGame,
    gameState,
    selectedSquare,
    legalTargets,
    moveHistory,
    promotionMove,
    chatMessages,
    chatDraft,
    linkCopied,
    spectatorMode,
    spectatorLinkCopied,
    inviteCode,
    spectatorCode,
    t,
    setLanguage,
    setTheme,
    setAuthMode,
    setAuthForm,
    setError,
    setUnavailableLobbyCode,
    setView: navigateToView,
    setHistoryResultFilter,
    setHistoryModeFilter,
    setSelectedHistoryGame,
    setNotificationsOpen,
    setSearchQuery,
    setChatDraft,
    refreshLobby,
    refreshHistory,
    refreshFriends,
    refreshProfile,
    refreshAdminUsers,
    refreshNotifications,
    submitAuth,
    logout,
    openHistory,
    openProfile,
    openPublicProfile,
    openSelectedGame,
    createGame,
    joinGame,
    deleteGame,
    updateAdminRole,
    searchUsers,
    sendFriendRequest,
    respondToRequest,
    inviteFriend,
    inviteSpectator,
    markNotificationRead,
    returnToLobby,
    handleSelectSquare,
    copyGameLink,
    copySpectatorLink,
    sendChat,
    resignGame,
    commitMove,
  };
}

export type AppController = ReturnType<typeof useAppController>;
