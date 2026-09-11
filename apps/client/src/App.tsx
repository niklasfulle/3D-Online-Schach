import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { io, type Socket } from 'socket.io-client';

import { ChessGame, type Move, type PromotionPiece } from '@chess3d/chess-core';
import type { GameMode, GameSummary, Square, UserRole } from '@chess3d/shared';

import { resolveApiUrl } from './apiUrl';
import { ChessScene } from './board/ChessScene';
import {
  createTranslator,
  readLanguage,
  saveLanguage,
  type Language,
  type Translator,
} from './i18n';
import { requestJson as requestApi } from './request';
import { readTheme, saveTheme, type Theme } from './theme';

const API_URL = resolveApiUrl(
  import.meta.env.VITE_API_URL,
  globalThis.location ?? { protocol: 'http:', hostname: 'localhost' },
);
const PROMOTION_OPTIONS: PromotionPiece[] = ['q', 'r', 'b', 'n'];
interface AuthUser {
  id: string;
  username: string;
  email?: string;
  rating: number;
  role?: UserRole;
}

const GUEST_SPECTATOR: AuthUser = {
  id: 'guest-spectator',
  username: 'Gastzuschauer',
  rating: 0,
  role: 'spectator',
};

type AppView = 'lobby' | 'friends' | 'admin' | 'game';

interface PageHeading {
  eyebrow: string;
  title: string;
  description: string;
}

interface SocialUser extends AuthUser {
  online: boolean;
}

interface FriendRequest {
  id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  sender: SocialUser;
  receiver: SocialUser;
}

interface FriendsOverview {
  friends: SocialUser[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
}

interface AdminUser {
  id: string;
  username: string;
  email?: string;
  rating: number;
  role: UserRole;
  lastOnline?: string;
}

interface NotificationItem {
  id: string;
  type: 'friend_request' | 'game_invitation' | 'spectator_invitation';
  title: string;
  message: string;
  gameCode?: string;
  friendRequestId?: string;
  read: boolean;
  createdAt: string;
  actor?: SocialUser;
}

function notificationTitle(notification: NotificationItem, language: Language, t: Translator) {
  if (language === 'de') return notification.title;
  if (notification.type === 'friend_request') return t('notification.friendRequest');
  if (notification.type === 'game_invitation') return t('notification.gameInvitation');
  return t('notification.spectatorInvitation');
}

function notificationMessage(notification: NotificationItem, language: Language, t: Translator) {
  if (language === 'de') return notification.message;
  const username = notification.actor?.username ?? t('player.player');
  const key =
    notification.type === 'friend_request'
      ? 'notification.friendRequestMessage'
      : notification.type === 'game_invitation'
        ? 'notification.gameInvitationMessage'
        : 'notification.spectatorInvitationMessage';
  return t(key).replace('{username}', username);
}

interface MoveRecord extends Move {
  san: string;
}

interface AcceptedMove {
  fen: string;
  game: GameSummary;
  move: MoveRecord;
}

interface GameSync {
  fen: string;
  game: GameSummary;
  moves: MoveRecord[];
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  message: string;
  createdAt: string;
}

interface LobbyGame extends GameSummary {
  isOwner: boolean;
}

function statusLabel(status: ReturnType<ChessGame['getStatus']>, t: Translator) {
  switch (status) {
    case 'check':
      return t('status.check');
    case 'checkmate':
      return t('status.checkmate');
    case 'stalemate':
      return t('status.stalemate');
    case 'draw':
      return t('status.draw');
    default:
      return t('status.active');
  }
}

function gameLabel(game: GameSummary, t: Translator) {
  return `${game.mode === 'ranked' ? t('mode.ranked') : t('mode.casual')} · ${game.code}`;
}

function gameStatusLabel(status: GameSummary['status'], t: Translator) {
  if (status === 'waiting') return t('game.waiting');
  if (status === 'active') return t('game.live');
  return t('status.finished');
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playerLabel(playerId: string | undefined, currentUserId: string, t: Translator) {
  if (!playerId) return t('player.open');
  return playerId === currentUserId ? t('player.you') : t('player.opponent');
}

function viewerPlayerLabel(
  playerId: string | undefined,
  currentUserId: string,
  spectator: boolean,
  t: Translator,
) {
  if (spectator) return playerId ? t('player.player') : t('player.open');
  return playerLabel(playerId, currentUserId, t);
}

function pageHeadingFor(view: AppView, t: Translator): PageHeading {
  if (view === 'game') {
    return {
      eyebrow: t('page.game.eyebrow'),
      title: t('page.game.title'),
      description: t('page.game.description'),
    };
  }
  if (view === 'friends') {
    return {
      eyebrow: t('page.friends.eyebrow'),
      title: t('page.friends.title'),
      description: t('page.friends.description'),
    };
  }
  if (view === 'admin') {
    return {
      eyebrow: t('page.admin.eyebrow'),
      title: t('page.admin.title'),
      description: t('page.admin.description'),
    };
  }
  return {
    eyebrow: t('page.lobby.eyebrow'),
    title: t('page.lobby.title'),
    description: t('page.lobby.description'),
  };
}

function playerColorForGame(game: GameSummary, userId: string): 'white' | 'black' | null {
  if (game.whitePlayerId === userId) return 'white';
  if (game.blackPlayerId === userId) return 'black';
  return null;
}

function canSelectSquare(
  promotionMove: Move | null,
  selectedGame: GameSummary | null,
  user: AuthUser | null,
  activeColor: 'white' | 'black',
): boolean {
  if (promotionMove || (selectedGame && selectedGame.status !== 'active')) return false;
  if (!selectedGame && user) return true;
  if (!selectedGame || !user) return false;
  const ownColor = playerColorForGame(selectedGame, user.id);
  return ownColor === activeColor;
}

function invitationCodeFromPath(pathname: string): string | null {
  const match = /^\/game\/([a-z0-9]+)\/?$/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? null;
}

function spectatorCodeFromPath(pathname: string): string | null {
  const match = /^\/watch\/([a-z0-9]+)\/?$/i.exec(pathname);
  return match?.[1]?.toUpperCase() ?? null;
}

function gamePath(code: string): string {
  return `/game/${encodeURIComponent(code)}`;
}

function formatChatTime(createdAt: string, language: Language): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'de-DE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt));
}

function isChatNearBottom(element: HTMLDivElement): boolean {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= 64;
}

function scrollChatToBottom(element: HTMLDivElement): void {
  if (typeof element.scrollTo === 'function') {
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
  } else {
    element.scrollTop = element.scrollHeight;
  }
}

function spectatorPath(code: string): string {
  return `/watch/${encodeURIComponent(code)}`;
}

function setGamePath(code: string | null): void {
  globalThis.history?.replaceState({}, '', code ? gamePath(code) : '/');
}

interface GameViewProps {
  user: AuthUser;
  language: Language;
  t: Translator;
  selectedGame: GameSummary;
  gameState: ReturnType<ChessGame['getState']>;
  selectedSquare: Square | null;
  legalTargets: Square[];
  moveHistory: MoveRecord[];
  turnLabel: string;
  gameStatus: string;
  setView: (view: AppView) => void;
  handleSelectSquare: (square: Square) => void;
  onCopyLink: () => void;
  linkCopied: boolean;
  spectatorMode: boolean;
  onCopySpectatorLink: () => void;
  spectatorLinkCopied: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  onChatDraftChange: (value: string) => void;
  onSendChat: () => void;
}

function GameView({
  user,
  language,
  t,
  selectedGame,
  gameState,
  selectedSquare,
  legalTargets,
  moveHistory,
  turnLabel,
  gameStatus,
  setView,
  handleSelectSquare,
  onCopyLink,
  linkCopied,
  spectatorMode,
  onCopySpectatorLink,
  spectatorLinkCopied,
  chatMessages,
  chatDraft,
  onChatDraftChange,
  onSendChat,
}: Readonly<GameViewProps>) {
  const chatMessagesRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef<number | null>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);

  useEffect(() => {
    const element = chatMessagesRef.current;
    if (!element) return;

    const isInitialLoad = previousMessageCountRef.current === null;
    const hasNewMessages =
      previousMessageCountRef.current !== null &&
      chatMessages.length > previousMessageCountRef.current;
    if (isInitialLoad || (hasNewMessages && isChatNearBottom(element))) {
      scrollChatToBottom(element);
      setShowNewMessages(false);
    } else if (hasNewMessages) {
      setShowNewMessages(true);
    }
    previousMessageCountRef.current = chatMessages.length;
  }, [chatMessages.length]);

  function scrollToLatestChat() {
    const element = chatMessagesRef.current;
    if (!element) return;
    scrollChatToBottom(element);
    setShowNewMessages(false);
  }

  return (
    <section className="game-view">
      <div className="game-toolbar">
        <div className="game-toolbar-title">
          <button
            className="back-button"
            aria-label={t('game.backToLobby')}
            type="button"
            onClick={() => setView('lobby')}
          >
            ←
          </button>
          <div>
            <span className="panel-label">
              {selectedGame.mode === 'ranked' ? t('game.ranked') : t('game.casual')}
            </span>
            <h2>{selectedGame.code}</h2>
          </div>
        </div>
        <div className="game-toolbar-meta">
          <span className="game-status-pill">
            <span className="live-dot" />{' '}
            {spectatorMode
              ? t('game.spectator')
              : selectedGame.status === 'active'
                ? t('game.live')
                : t('game.waiting')}
          </span>
          <span className="game-code-label">{gameStatus}</span>
          {!spectatorMode && (
            <button className="secondary-button" type="button" onClick={onCopyLink}>
              {linkCopied ? t('game.linkCopied') : t('game.copyLink')}
            </button>
          )}
          <button className="secondary-button" type="button" onClick={onCopySpectatorLink}>
            {spectatorLinkCopied ? t('game.spectatorLinkCopied') : t('game.copySpectatorLink')}
          </button>
        </div>
      </div>
      <div className="game-layout">
        <div className="scene-card" aria-label={t('game.board')}>
          <div className="player-strip">
            <div
              className={gameState.activeColor === 'white' ? 'player-card active' : 'player-card'}
            >
              <span className="player-avatar light">♙</span>
              <div>
                <strong>
                  {viewerPlayerLabel(selectedGame.whitePlayerId, user.id, spectatorMode, t)}
                </strong>
                <span>{t('game.white')}</span>
              </div>
              <strong className="player-clock">{formatClock(selectedGame.whiteRemainingMs)}</strong>
            </div>
            <span className="versus-badge">VS</span>
            <div
              className={gameState.activeColor === 'black' ? 'player-card active' : 'player-card'}
            >
              <span className="player-avatar dark">♟</span>
              <div>
                <strong>
                  {viewerPlayerLabel(selectedGame.blackPlayerId, user.id, spectatorMode, t)}
                </strong>
                <span>{t('game.black')}</span>
              </div>
              <strong className="player-clock">{formatClock(selectedGame.blackRemainingMs)}</strong>
            </div>
          </div>
          <div className="board-canvas">
            <Canvas
              camera={{ position: [0, 9.6, 11.8], fov: 46 }}
              onContextMenu={(event) => event.preventDefault()}
              shadows
            >
              <color attach="background" args={['#10151f']} />
              <ChessScene
                fen={gameState.fen}
                highlightedSquares={legalTargets}
                lastMove={moveHistory.at(-1)}
                selectedSquare={selectedSquare}
                onSelectSquare={handleSelectSquare}
              />
            </Canvas>
          </div>
          <div className="board-footer">
            <span>
              <span className="live-dot" />{' '}
              {spectatorMode
                ? `${turnLabel} ${t('game.spectatorTurn')}`
                : selectedGame.status === 'active'
                  ? `${turnLabel} ${t('game.turn')}`
                  : t('game.waitingForOpponent')}
            </span>
            <span>
              {selectedSquare ? `${selectedSquare} ${t('game.selected')}` : t('game.moveBoard')}
            </span>
          </div>
        </div>
        <aside className="game-panel" aria-label={t('game.info')}>
          <div className="game-panel-header">
            <div>
              <span className="panel-label">{t('game.overview')}</span>
              <h3>{gameLabel(selectedGame, t)}</h3>
            </div>
            <span className="move-count">
              {moveHistory.length} {t('game.moves')}
            </span>
          </div>
          <div className="game-facts">
            <div>
              <span className="muted">{t('game.status')}</span>
              <strong>{statusLabel(gameState.status, t)}</strong>
            </div>
            <div>
              <span className="muted">{t('game.timeControl')}</span>
              <strong>
                {Math.round(selectedGame.timeControl.initialMs / 60000)} {t('game.minutes')}
              </strong>
            </div>
          </div>
          <div className="panel-section move-history">
            <div className="moves-heading">
              <span className="panel-label">{t('game.moveHistory')}</span>
              <span className="muted">{t('game.san')}</span>
            </div>
            {moveHistory.length === 0 ? (
              <div className="moves-empty">
                <span className="empty-icon" aria-hidden="true">
                  ♟
                </span>
                <span>{t('game.noMoves')}</span>
                <small>{t('game.startsWhenReady')}</small>
              </div>
            ) : (
              moveHistory.map((move, index) => (
                <div className="move-row" key={`${move.san}-${index}`}>
                  <span>
                    {Math.floor(index / 2) + 1}
                    {index % 2 === 0 ? '.' : '…'}
                  </span>
                  <strong>{move.san}</strong>
                </div>
              ))
            )}
          </div>
          <div className="fen-box">
            <span className="panel-label">{t('game.fen')}</span>
            <code>{gameState.fen}</code>
          </div>
          <button
            className="quiet-button panel-back-button"
            type="button"
            onClick={() => setView('lobby')}
          >
            ← {t('game.backToLobby')}
          </button>
        </aside>
        <aside className="chat-column" aria-label={t('chat.title')}>
          <div className="chat-column-header">
            <div>
              <span className="panel-label">{t('chat.title')}</span>
              <h3>{t('chat.room')}</h3>
            </div>
            <span className="chat-presence">
              <span className="live-dot" /> {spectatorMode ? t('chat.readOnly') : t('chat.live')}
            </span>
          </div>
          <div className="chat-log-shell">
            <div
              className="chat-messages"
              ref={chatMessagesRef}
              role="log"
              aria-live="polite"
              onScroll={(event) => {
                if (isChatNearBottom(event.currentTarget)) setShowNewMessages(false);
              }}
            >
              {chatMessages.length ? (
                chatMessages.map((message) => (
                  <div
                    aria-label={`${message.senderUsername}: ${message.message} um ${formatChatTime(message.createdAt, language)}`}
                    className={`chat-message ${message.senderId === user.id ? 'outgoing' : 'incoming'}`}
                    key={message.id}
                  >
                    <div className="chat-message-meta">
                      <strong>{message.senderUsername}</strong>
                      <time dateTime={message.createdAt}>
                        {formatChatTime(message.createdAt, language)}
                      </time>
                    </div>
                    <span>{message.message}</span>
                  </div>
                ))
              ) : (
                <span className="muted">{t('chat.noMessages')}</span>
              )}
            </div>
            {showNewMessages ? (
              <button className="chat-new-messages" type="button" onClick={scrollToLatestChat}>
                {t('chat.newMessages')}
              </button>
            ) : null}
          </div>
          {spectatorMode ? (
            <span className="muted">{t('chat.spectatorHint')}</span>
          ) : (
            <form
              className="chat-form"
              onSubmit={(event) => {
                event.preventDefault();
                onSendChat();
              }}
            >
              <label htmlFor="chat-message">{t('chat.messageLabel')}</label>
              <div className="chat-input-row">
                <input
                  id="chat-message"
                  maxLength={500}
                  value={chatDraft}
                  onChange={(event) => onChatDraftChange(event.target.value)}
                  placeholder={t('chat.placeholder')}
                />
                <button className="tiny-button" type="submit">
                  {t('chat.send')}
                </button>
              </div>
            </form>
          )}
        </aside>
      </div>
    </section>
  );
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [language, setLanguage] = useState<Language>(() => readLanguage());
  const [theme, setTheme] = useState<Theme>(() => readTheme());
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [view, setView] = useState<AppView>('lobby');
  const [lobbyGames, setLobbyGames] = useState<LobbyGame[]>([]);
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
  const inviteCode = invitationCodeFromPath(globalThis.location?.pathname ?? '');
  const spectatorCode = spectatorCodeFromPath(globalThis.location?.pathname ?? '');
  const t = createTranslator(language);

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

  const refreshFriends = useCallback(async () => {
    setFriends(await requestApi<FriendsOverview>(API_URL, '/friends'));
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
    selectedGameCodeRef.current = selectedGame?.code ?? null;
  }, [selectedGame]);

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
    socket.on('game:removed', (payload: { code?: string }) => {
      if (!payload.code) return;
      setLobbyGames((games) => games.filter((game) => game.code !== payload.code));
    });
    socket.on('move:accepted', (accepted: AcceptedMove) => {
      setSelectedGame(accepted.game);
      setGamePath(accepted.game.code);
      const nextGame = new ChessGame(accepted.fen);
      setGame(nextGame);
      setGameState(nextGame.getState());
      setMoveHistory((history) => [...history, accepted.move]);
      resetSelection();
    });
    socket.on('chat:message', (message: ChatMessage) => {
      setChatMessages((messages) =>
        messages.some((current) => current.id === message.id) ? messages : [...messages, message],
      );
    });
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
    if (invitationAttemptRef.current === inviteCode) return;
    invitationAttemptRef.current = inviteCode;

    async function openInvitation() {
      try {
        const invitedGame = await requestApi<GameSummary>(API_URL, `/games/${inviteCode}`);
        const isParticipant =
          invitedGame.whitePlayerId === currentUser.id ||
          invitedGame.blackPlayerId === currentUser.id;
        const nextGame =
          invitedGame.status === 'waiting' && !isParticipant
            ? await requestApi<GameSummary>(API_URL, `/lobby/games/${inviteCode}/join`, {
                method: 'POST',
              })
            : invitedGame;

        if (!isParticipant && invitedGame.status !== 'waiting') {
          throw new Error(t('error.gameOpen'));
        }
        openGame(nextGame);
      } catch (error_) {
        setError(error_ instanceof Error ? error_.message : t('error.gameOpen'));
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

  async function submitAuth(event: React.SyntheticEvent<HTMLFormElement>) {
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
    } catch {
      setError(t('error.copyGameLink'));
    }
  }

  async function copySpectatorLink() {
    if (!selectedGame) return;
    try {
      await navigator.clipboard.writeText(
        `${globalThis.location.origin}${spectatorPath(selectedGame.code)}`,
      );
      setSpectatorLinkCopied(true);
    } catch {
      setError(t('error.copySpectatorLink'));
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

  async function deleteGame(code: string) {
    try {
      await requestApi(API_URL, `/lobby/games/${encodeURIComponent(code)}`, {
        method: 'DELETE',
      });
      setLobbyGames((games) => games.filter((game) => game.code !== code));
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : t('error.gameDelete'));
    }
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

  async function searchUsers(event: React.SyntheticEvent<HTMLFormElement>) {
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

  if (loading)
    return (
      <main className="centered-message" data-theme={theme}>
        {t('guest.connectionHint')} …
      </main>
    );
  if (!user && spectatorCode) {
    const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
    const gameStatus = selectedGame
      ? `${gameLabel(selectedGame, t)} · ${gameStatusLabel(selectedGame.status, t)}`
      : statusLabel(gameState.status, t);

    return (
      <main className="app-shell game-mode guest-spectator-shell" data-theme={theme}>
        <div className="dashboard-shell">
          <section className="dashboard-main">
            <div className="page-heading">
              <div>
                <span className="eyebrow">{t('guest.eyebrow')}</span>
                <h1>{t('page.game.title')}</h1>
                <p>{t('guest.description')}</p>
              </div>
            </div>
            {error ? (
              <div className="error-banner" role="alert" aria-live="polite">
                <span>
                  <strong>{t('guest.connectionHint')}</strong>
                  {error}
                </span>
                <button
                  aria-label={t('guest.closeHint')}
                  type="button"
                  onClick={() => setError('')}
                >
                  ×
                </button>
              </div>
            ) : null}
            {selectedGame ? (
              <GameView
                user={GUEST_SPECTATOR}
                language={language}
                t={t}
                selectedGame={selectedGame}
                gameState={gameState}
                selectedSquare={selectedSquare}
                legalTargets={legalTargets}
                moveHistory={moveHistory}
                turnLabel={turnLabel}
                gameStatus={gameStatus}
                setView={() => globalThis.location.assign('/')}
                handleSelectSquare={handleSelectSquare}
                onCopyLink={() => undefined}
                linkCopied={false}
                spectatorMode
                onCopySpectatorLink={() => void copySpectatorLink()}
                spectatorLinkCopied={spectatorLinkCopied}
                chatMessages={chatMessages}
                chatDraft=""
                onChatDraftChange={() => undefined}
                onSendChat={() => undefined}
              />
            ) : (
              <div className="centered-message">{t('guest.loadingGame')}</div>
            )}
          </section>
        </div>
      </main>
    );
  }
  if (!user)
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeChange={setTheme}
        form={authForm}
        setForm={setAuthForm}
        error={error}
        onSubmit={submitAuth}
        t={t}
      />
    );

  const authenticatedUser = user;

  function renderAuthenticatedView() {
    const user = authenticatedUser;
    const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
    const gameStatus = selectedGame
      ? `${gameLabel(selectedGame, t)} · ${gameStatusLabel(selectedGame.status, t)}`
      : statusLabel(gameState.status, t);
    const pageHeading = pageHeadingFor(view, t);

    return (
      <main className={view === 'game' ? 'app-shell game-mode' : 'app-shell'} data-theme={theme}>
        <div className="dashboard-shell">
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
              <label className="theme-switcher">
                <span className="sr-only">{t('theme.label')}</span>
                <select
                  aria-label={t('theme.label')}
                  value={theme}
                  onChange={(event) => setTheme(event.target.value as Theme)}
                >
                  <option value="dark">{t('theme.dark')}</option>
                  <option value="light">{t('theme.light')}</option>
                </select>
              </label>
              <label className="language-switcher">
                <span className="sr-only">{t('language.label')}</span>
                <select
                  aria-label={t('language.label')}
                  value={language}
                  onChange={(event) => setLanguage(event.target.value as Language)}
                >
                  <option value="de">{t('language.de')}</option>
                  <option value="en">{t('language.en')}</option>
                </select>
              </label>
              <span className="live-chip">
                <span className="live-dot" /> {t('header.online')}
              </span>
              <div className="notification-wrapper">
                <button
                  className="notification-button"
                  type="button"
                  aria-label={`${t('notifications.label')} (${notifications.filter((item) => !item.read).length})`}
                  onClick={() => setNotificationsOpen((open) => !open)}
                >
                  ♢
                  {notifications.some((item) => !item.read) ? (
                    <span className="notification-count">
                      {notifications.filter((item) => !item.read).length}
                    </span>
                  ) : null}
                </button>
                {notificationsOpen ? (
                  <div
                    className="notification-panel"
                    role="region"
                    aria-label={t('notifications.label')}
                  >
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
                        {notifications.map((notification) =>
                          notification.gameCode ? (
                            <a
                              className={
                                notification.read ? 'notification-item' : 'notification-item unread'
                              }
                              href={
                                notification.type === 'spectator_invitation'
                                  ? spectatorPath(notification.gameCode)
                                  : gamePath(notification.gameCode)
                              }
                              key={notification.id}
                              onClick={() => void markNotificationRead(notification)}
                            >
                              <strong>{notificationTitle(notification, language, t)}</strong>
                              <span>{notificationMessage(notification, language, t)}</span>
                              <span className="notification-action">
                                {notification.type === 'spectator_invitation'
                                  ? t('notifications.openSpectator')
                                  : t('notifications.openGame')}
                              </span>
                            </a>
                          ) : (
                            <button
                              className={
                                notification.read ? 'notification-item' : 'notification-item unread'
                              }
                              key={notification.id}
                              type="button"
                              onClick={() => void markNotificationRead(notification)}
                            >
                              <strong>{notificationTitle(notification, language, t)}</strong>
                              <span>{notificationMessage(notification, language, t)}</span>
                            </button>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="muted">{t('notifications.empty')}</p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="profile-chip">
                <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
                <span>{user.username}</span>
                <span className="profile-rating">{user.rating}</span>
              </div>
              <button className="quiet-button" type="button" onClick={() => void logout()}>
                {t('auth.logout')}
              </button>
            </div>
          </header>
          <div className="dashboard-grid">
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
                  {user.role === 'admin' ? (
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
                <strong>{user.username}</strong>
                <span className="muted">
                  {t('sidebar.rating')} {user.rating}
                </span>
                <div className="rating-bar">
                  <span
                    style={{ width: `${Math.min(100, Math.max(8, (user.rating - 800) / 8))}%` }}
                  />
                </div>
              </div>
            </aside>
            <section className="dashboard-main">
              {error ? (
                <div className="error-banner" role="alert" aria-live="polite">
                  <span>
                    <strong>{t('guest.connectionHint')}</strong>
                    {error}
                  </span>
                  <button
                    aria-label={t('guest.closeHint')}
                    type="button"
                    onClick={() => setError('')}
                  >
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
              {view === 'friends' ? (
                <FriendsView
                  t={t}
                  friends={friends}
                  canInvite={Boolean(
                    selectedGame?.status === 'waiting' && selectedGame.whitePlayerId === user.id,
                  )}
                  canInviteSpectator={Boolean(
                    selectedGame?.status === 'active' &&
                    (selectedGame.whitePlayerId === user.id ||
                      selectedGame.blackPlayerId === user.id),
                  )}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchResults={searchResults}
                  onSearch={searchUsers}
                  onAdd={(username) => void sendFriendRequest(username)}
                  onRespond={(id, action) => void respondToRequest(id, action)}
                  onInvite={(username) => void inviteFriend(username)}
                  onInviteSpectator={(username) => void inviteSpectator(username)}
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
                  setView={setView}
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
                />
              ) : null}
            </section>
            <aside className="insights-panel">
              <div className="insight-card profile-insight">
                <div className="insight-heading">
                  <span>{t('insight.status')}</span>
                  <span className="live-chip small">
                    <span className="live-dot" /> Live
                  </span>
                </div>
                <div className="insight-avatar">{user.username.slice(0, 1).toUpperCase()}</div>
                <strong>{user.username}</strong>
                <span className="muted">{t('insight.ready')}</span>
                <div className="insight-stats">
                  <div>
                    <strong>{user.rating}</strong>
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
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => void createGame('casual')}
                >
                  {t('insight.createGame')} <span aria-hidden="true">→</span>
                </button>
              </div>
            </aside>
          </div>
        </div>
        {promotionMove ? (
          <dialog open className="promotion-dialog" aria-label={t('promotion.label')}>
            <strong>{t('promotion.label')}</strong>
            <div className="promotion-actions">
              {PROMOTION_OPTIONS.map((promotion) => (
                <button
                  key={promotion}
                  type="button"
                  onClick={() => commitMove({ ...promotionMove, promotion })}
                >
                  {t(
                    promotion === 'q'
                      ? 'promotion.queen'
                      : promotion === 'r'
                        ? 'promotion.rook'
                        : promotion === 'b'
                          ? 'promotion.bishop'
                          : 'promotion.knight',
                  )}
                </button>
              ))}
            </div>
          </dialog>
        ) : null}
      </main>
    );
  }

  return renderAuthenticatedView();
}

function AuthScreen({
  authMode,
  setAuthMode,
  language,
  onLanguageChange,
  theme,
  onThemeChange,
  form,
  setForm,
  error,
  onSubmit,
  t,
}: Readonly<{
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  form: { username: string; email: string; password: string };
  setForm: (form: { username: string; email: string; password: string }) => void;
  error: string;
  onSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  t: Translator;
}>) {
  return (
    <main className="auth-shell" data-theme={theme}>
      <label className="language-switcher auth-language-switcher">
        <span className="sr-only">{t('language.label')}</span>
        <select
          aria-label={t('language.label')}
          value={language}
          onChange={(event) => onLanguageChange(event.target.value as Language)}
        >
          <option value="de">{t('language.de')}</option>
          <option value="en">{t('language.en')}</option>
        </select>
      </label>
      <label className="theme-switcher auth-theme-switcher">
        <span className="sr-only">{t('theme.label')}</span>
        <select
          aria-label={t('theme.label')}
          value={theme}
          onChange={(event) => onThemeChange(event.target.value as Theme)}
        >
          <option value="dark">{t('theme.dark')}</option>
          <option value="light">{t('theme.light')}</option>
        </select>
      </label>
      <section className="auth-card">
        <p className="eyebrow">3D ONLINE-SCHACH</p>
        <h1>{authMode === 'login' ? t('auth.welcome') : t('auth.createAccount')}</h1>
        <p className="muted">{t('auth.description')}</p>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>{t('auth.username')}</span>
            <input
              autoComplete="username"
              name="username"
              required
              minLength={3}
              maxLength={24}
              value={form.username}
              onChange={(event) => setForm({ ...form, username: event.target.value })}
            />
          </label>
          {authMode === 'register' ? (
            <label>
              {t('auth.email')} <span className="muted">({t('auth.optional')})</span>
              <input
                autoComplete="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
          ) : null}
          <label>
            <span>{t('auth.password')}</span>
            <input
              autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
              name="password"
              required
              minLength={8}
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
            />
          </label>
          <button className="primary-button" type="submit">
            {authMode === 'login' ? t('auth.login') : t('auth.register')}
          </button>
        </form>
        <button
          className="link-button"
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? t('auth.noAccount') : t('auth.alreadyRegistered')}
        </button>
      </section>
    </main>
  );
}

function LobbyView({
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

function AdminView({
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

function FriendsView({
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
                <strong>{friend.username}</strong>
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
              <strong>{result.username}</strong>
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
