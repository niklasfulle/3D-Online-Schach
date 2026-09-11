import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { io, type Socket } from 'socket.io-client';

import { ChessGame, type Move, type PromotionPiece } from '@chess3d/chess-core';
import type { GameMode, GameSummary, Square } from '@chess3d/shared';

import { resolveApiUrl } from './apiUrl';
import { ChessScene } from './board/ChessScene';
import { requestJson as requestApi } from './request';

const API_URL = resolveApiUrl(import.meta.env.VITE_API_URL, globalThis.location);
const PROMOTION_OPTIONS: PromotionPiece[] = ['q', 'r', 'b', 'n'];
const PROMOTION_LABELS: Record<PromotionPiece, string> = {
  q: 'Dame',
  r: 'Turm',
  b: 'Läufer',
  n: 'Springer',
};

interface AuthUser {
  id: string;
  username: string;
  email?: string;
  rating: number;
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

interface LobbyGame extends GameSummary {
  isOwner: boolean;
}

function statusLabel(status: ReturnType<ChessGame['getStatus']>) {
  switch (status) {
    case 'check':
      return 'Schach';
    case 'checkmate':
      return 'Schachmatt';
    case 'stalemate':
      return 'Patt';
    case 'draw':
      return 'Remis';
    default:
      return 'Partie läuft';
  }
}

function gameLabel(game: GameSummary) {
  return `${game.mode === 'ranked' ? 'Ranked' : 'Casual'} · ${game.code}`;
}

function formatClock(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function playerLabel(playerId: string | undefined, currentUserId: string) {
  if (!playerId) return 'Offen';
  return playerId === currentUserId ? 'Du' : 'Gegner';
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [view, setView] = useState<'lobby' | 'friends' | 'game'>('lobby');
  const [lobbyGames, setLobbyGames] = useState<LobbyGame[]>([]);
  const [friends, setFriends] = useState<FriendsOverview | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SocialUser[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameSummary | null>(null);
  const [game, setGame] = useState(() => new ChessGame());
  const [gameState, setGameState] = useState(() => game.getState());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Square[]>([]);
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([]);
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const refreshLobby = useCallback(async () => {
    const response = await requestApi<{ games: LobbyGame[] }>(API_URL, '/lobby');
    setLobbyGames(response.games);
  }, []);

  const refreshFriends = useCallback(async () => {
    setFriends(await requestApi<FriendsOverview>(API_URL, '/friends'));
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
      setError(error_ instanceof Error ? error_.message : 'Lobby konnte nicht geladen werden'),
    );
    void refreshFriends().catch((error_: unknown) =>
      setError(error_ instanceof Error ? error_.message : 'Freunde konnten nicht geladen werden'),
    );
  }, [refreshFriends, refreshLobby, user]);

  useEffect(() => {
    if (!user) return;
    const socket = io(API_URL, { withCredentials: true });
    socketRef.current = socket;
    socket.on('game:state', (sync: GameSync) => applyGameSync(sync));
    socket.on('game:started', (nextGame: GameSummary) => {
      setSelectedGame(nextGame);
      setView('game');
      socket.emit('game:sync', { code: nextGame.code });
    });
    socket.on('move:accepted', (accepted: AcceptedMove) => {
      setSelectedGame(accepted.game);
      const nextGame = new ChessGame(accepted.fen);
      setGame(nextGame);
      setGameState(nextGame.getState());
      setMoveHistory((history) => [...history, accepted.move]);
      resetSelection();
    });
    socket.on('game:error', (payload: { error?: string }) =>
      setError(payload.error ?? 'Partie konnte nicht synchronisiert werden'),
    );
    socket.on('move:rejected', (payload: { reason?: string }) =>
      setError(payload.reason ?? 'Zug wurde abgelehnt'),
    );
    socket.on('connect_error', () =>
      setError('Die Echtzeitverbindung zur Partie konnte nicht aufgebaut werden'),
    );
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user]);

  function applyGameSync(sync: GameSync) {
    const nextGame = new ChessGame(sync.fen);
    setSelectedGame(sync.game);
    setGame(nextGame);
    setGameState(nextGame.getState());
    setMoveHistory(sync.moves);
    setView('game');
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
      setError(error_ instanceof Error ? error_.message : 'Authentifizierung fehlgeschlagen');
    }
  }

  async function logout() {
    await requestApi(API_URL, '/auth/logout', { method: 'POST' });
    setUser(null);
    setSelectedGame(null);
    setView('lobby');
  }

  function openGame(nextGame: GameSummary) {
    setError('');
    setSelectedGame(nextGame);
    setView('game');
    socketRef.current?.emit('game:sync', { code: nextGame.code });
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
      setError(error_ instanceof Error ? error_.message : 'Partie konnte nicht erstellt werden');
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
      setError(error_ instanceof Error ? error_.message : 'Partie konnte nicht beigetreten werden');
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
      setError(error_ instanceof Error ? error_.message : 'Benutzersuche fehlgeschlagen');
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
      setError(error_ instanceof Error ? error_.message : 'Freundschaftsanfrage fehlgeschlagen');
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
      setError(
        error_ instanceof Error ? error_.message : 'Anfrage konnte nicht verarbeitet werden',
      );
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
    if (promotionMove || (selectedGame && selectedGame.status !== 'active')) return;
    if (selectedGame && user) {
      let ownColor: 'white' | 'black' | null = null;
      if (selectedGame.whitePlayerId === user.id) ownColor = 'white';
      else if (selectedGame.blackPlayerId === user.id) ownColor = 'black';
      if (ownColor !== gameState.activeColor) return;
    }

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

  if (loading) return <main className="centered-message">Verbindung wird hergestellt …</main>;
  if (!user)
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        form={authForm}
        setForm={setAuthForm}
        error={error}
        onSubmit={submitAuth}
      />
    );

  const turnLabel = gameState.activeColor === 'white' ? 'Weiß' : 'Schwarz';
  const gameStatus = selectedGame
    ? `${gameLabel(selectedGame)} · ${selectedGame.status}`
    : statusLabel(gameState.status);

  return (
    <main className="app-shell">
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
            <span className="live-chip">
              <span className="live-dot" /> Online
            </span>
            <div className="profile-chip">
              <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
              <span>{user.username}</span>
              <span className="profile-rating">{user.rating}</span>
            </div>
            <button className="quiet-button" type="button" onClick={() => void logout()}>
              Abmelden
            </button>
          </div>
        </header>
        <div className="dashboard-grid">
          <aside className="sidebar">
            <div>
              <span className="sidebar-label">Arbeitsbereich</span>
              <nav className="sidebar-nav" aria-label="Hauptnavigation">
                <button
                  className={view === 'lobby' ? 'nav-button active' : 'nav-button'}
                  type="button"
                  onClick={() => setView('lobby')}
                >
                  <span className="nav-icon" aria-hidden="true">
                    ⌂
                  </span>
                  <span>Lobby</span>
                  <span className="nav-count">{lobbyGames.length}</span>
                </button>
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
                  <span>Freunde</span>
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
                    <span>Aktive Partie</span>
                    <span className="nav-live-dot" />
                  </button>
                ) : null}
              </nav>
            </div>
            <div className="sidebar-note">
              <span className="sidebar-label">Dein Profil</span>
              <strong>{user.username}</strong>
              <span className="muted">Wertung {user.rating}</span>
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
                  <strong>Verbindungshinweis</strong>
                  {error}
                </span>
                <button aria-label="Hinweis schließen" type="button" onClick={() => setError('')}>
                  ×
                </button>
              </div>
            ) : null}
            <div className="page-heading">
              <div>
                <span className="eyebrow">
                  {view === 'game'
                    ? 'DEINE PARTIE'
                    : view === 'friends'
                      ? 'COMMUNITY'
                      : 'SPIELZENTRALE'}
                </span>
                <h1>
                  {view === 'game'
                    ? 'Am Brett'
                    : view === 'friends'
                      ? 'Deine Freunde'
                      : 'Bereit für den nächsten Zug?'}
                </h1>
                <p>
                  {view === 'game'
                    ? 'Konzentriert bleiben. Jeder Zug zählt.'
                    : view === 'friends'
                      ? 'Finde Spieler, vernetze dich und bleib in Kontakt.'
                      : 'Finde eine Partie oder eröffne deinen eigenen Raum.'}
                </p>
              </div>
              <div className="heading-accent" aria-hidden="true">
                ✦
              </div>
            </div>
            {view === 'lobby' ? (
              <LobbyView
                games={lobbyGames}
                onRefresh={() => void refreshLobby()}
                onCreate={(mode) => void createGame(mode)}
                onJoin={(code) => void joinGame(code)}
              />
            ) : null}
            {view === 'friends' ? (
              <FriendsView
                friends={friends}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                searchResults={searchResults}
                onSearch={searchUsers}
                onAdd={(username) => void sendFriendRequest(username)}
                onRespond={(id, action) => void respondToRequest(id, action)}
              />
            ) : null}
            {view === 'game' && selectedGame ? (
              <section className="game-view">
                <div className="game-toolbar">
                  <div className="game-toolbar-title">
                    <button
                      className="back-button"
                      aria-label="Zurück zur Lobby"
                      type="button"
                      onClick={() => setView('lobby')}
                    >
                      ←
                    </button>
                    <div>
                      <span className="panel-label">
                        {selectedGame.mode === 'ranked' ? 'Ranked-Partie' : 'Casual-Partie'}
                      </span>
                      <h2>{selectedGame.code}</h2>
                    </div>
                  </div>
                  <div className="game-toolbar-meta">
                    <span className="game-status-pill">
                      <span className="live-dot" />{' '}
                      {selectedGame.status === 'active' ? 'Live' : 'Wartet'}
                    </span>
                    <span className="game-code-label">{gameStatus}</span>
                  </div>
                </div>
                <div className="game-layout">
                  <div className="scene-card" aria-label="3D-Schachbrett">
                    <div className="player-strip">
                      <div
                        className={
                          gameState.activeColor === 'white' ? 'player-card active' : 'player-card'
                        }
                      >
                        <span className="player-avatar light">♙</span>
                        <div>
                          <strong>{playerLabel(selectedGame.whitePlayerId, user.id)}</strong>
                          <span>Weiß</span>
                        </div>
                        <strong className="player-clock">
                          {formatClock(selectedGame.whiteRemainingMs)}
                        </strong>
                      </div>
                      <span className="versus-badge">VS</span>
                      <div
                        className={
                          gameState.activeColor === 'black' ? 'player-card active' : 'player-card'
                        }
                      >
                        <span className="player-avatar dark">♟</span>
                        <div>
                          <strong>{playerLabel(selectedGame.blackPlayerId, user.id)}</strong>
                          <span>Schwarz</span>
                        </div>
                        <strong className="player-clock">
                          {formatClock(selectedGame.blackRemainingMs)}
                        </strong>
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
                        {selectedGame.status === 'active'
                          ? `${turnLabel} am Zug`
                          : 'Warte auf einen Gegner'}
                      </span>
                      <span>
                        {selectedSquare
                          ? `${selectedSquare} ausgewählt`
                          : 'Brett mit rechter Maustaste verschieben'}
                      </span>
                    </div>
                  </div>
                  <aside className="game-panel" aria-label="Partieinformationen">
                    <div className="game-panel-header">
                      <div>
                        <span className="panel-label">Partieübersicht</span>
                        <h3>
                          {selectedGame.mode === 'ranked' ? 'Ranked' : 'Casual'} ·{' '}
                          {selectedGame.code}
                        </h3>
                      </div>
                      <span className="move-count">{moveHistory.length} Züge</span>
                    </div>
                    <div className="game-facts">
                      <div>
                        <span className="muted">Status</span>
                        <strong>{statusLabel(gameState.status)}</strong>
                      </div>
                      <div>
                        <span className="muted">Zeitkontrolle</span>
                        <strong>
                          {Math.round(selectedGame.timeControl.initialMs / 60000)} min
                        </strong>
                      </div>
                    </div>
                    <div className="panel-section move-history">
                      <div className="moves-heading">
                        <span className="panel-label">Zugverlauf</span>
                        <span className="muted">SAN</span>
                      </div>
                      {moveHistory.length === 0 ? (
                        <div className="moves-empty">
                          <span className="empty-icon" aria-hidden="true">
                            ♟
                          </span>
                          <span>Noch keine Züge</span>
                          <small>Die Partie beginnt, sobald beide Spieler bereit sind.</small>
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
                      <span className="panel-label">FEN</span>
                      <code>{gameState.fen}</code>
                    </div>
                    <button
                      className="quiet-button panel-back-button"
                      type="button"
                      onClick={() => setView('lobby')}
                    >
                      ← Zurück zur Lobby
                    </button>
                  </aside>
                </div>
              </section>
            ) : null}
          </section>
          <aside className="insights-panel">
            <div className="insight-card profile-insight">
              <div className="insight-heading">
                <span>DEIN STATUS</span>
                <span className="live-chip small">
                  <span className="live-dot" /> Live
                </span>
              </div>
              <div className="insight-avatar">{user.username.slice(0, 1).toUpperCase()}</div>
              <strong>{user.username}</strong>
              <span className="muted">Bereit für eine Partie?</span>
              <div className="insight-stats">
                <div>
                  <strong>{user.rating}</strong>
                  <span>Wertung</span>
                </div>
                <div>
                  <strong>{friends?.friends.length ?? 0}</strong>
                  <span>Freunde</span>
                </div>
              </div>
            </div>
            <div className="insight-card quick-match">
              <span className="panel-label">Schnellstart</span>
              <h3>Direkt ins Spiel</h3>
              <p className="muted">Eröffne eine Casual-Partie für deinen nächsten Zug.</p>
              <button
                className="primary-button"
                type="button"
                onClick={() => void createGame('casual')}
              >
                Partie erstellen <span aria-hidden="true">→</span>
              </button>
            </div>
          </aside>
        </div>
      </div>
      {promotionMove ? (
        <dialog open className="promotion-dialog" aria-label="Bauernumwandlung">
          <strong>Umwandeln zu</strong>
          <div className="promotion-actions">
            {PROMOTION_OPTIONS.map((promotion) => (
              <button
                key={promotion}
                type="button"
                onClick={() => commitMove({ ...promotionMove, promotion })}
              >
                {PROMOTION_LABELS[promotion]}
              </button>
            ))}
          </div>
        </dialog>
      ) : null}
    </main>
  );
}

function AuthScreen({
  authMode,
  setAuthMode,
  form,
  setForm,
  error,
  onSubmit,
}: Readonly<{
  authMode: 'login' | 'register';
  setAuthMode: (mode: 'login' | 'register') => void;
  form: { username: string; email: string; password: string };
  setForm: (form: { username: string; email: string; password: string }) => void;
  error: string;
  onSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => void;
}>) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">3D ONLINE-SCHACH</p>
        <h1>{authMode === 'login' ? 'Willkommen zurück' : 'Konto erstellen'}</h1>
        <p className="muted">Spiele online, finde Freunde und tritt einer Lobby bei.</p>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        <form className="auth-form" onSubmit={onSubmit}>
          <label>
            <span>Benutzername</span>
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
              E-Mail <span className="muted">(optional)</span>
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
            <span>Passwort</span>
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
            {authMode === 'login' ? 'Anmelden' : 'Registrieren'}
          </button>
        </form>
        <button
          className="link-button"
          type="button"
          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
        >
          {authMode === 'login' ? 'Noch kein Konto? Registrieren' : 'Bereits registriert? Anmelden'}
        </button>
      </section>
    </main>
  );
}

function LobbyView({
  games,
  onRefresh,
  onCreate,
  onJoin,
}: Readonly<{
  games: LobbyGame[];
  onRefresh: () => void;
  onCreate: (mode: GameMode) => void;
  onJoin: (code: string) => void;
}>) {
  return (
    <div className="lobby-content">
      <section className="welcome-card">
        <div>
          <span className="panel-label">Dein nächster Zug</span>
          <h2>Finde deine nächste Partie.</h2>
          <p>Spiele entspannt gegen Freunde oder setze deine Wertung aufs Spiel.</p>
          <div className="action-row">
            <button className="primary-button" type="button" onClick={() => onCreate('casual')}>
              Casual-Spiel erstellen <span aria-hidden="true">→</span>
            </button>
            <button className="ghost-button" type="button" onClick={() => onCreate('ranked')}>
              Ranked spielen
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
            <span className="muted">Offene Partien</span>
            <strong>{games.length}</strong>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon gold" aria-hidden="true">
            ✦
          </span>
          <div>
            <span className="muted">Spielmodi</span>
            <strong>Casual &amp; Ranked</strong>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-icon green" aria-hidden="true">
            ◉
          </span>
          <div>
            <span className="muted">Serverstatus</span>
            <strong>Online</strong>
          </div>
        </div>
      </div>
      <section className="content-card lobby-card">
        <div className="section-heading">
          <div>
            <span className="panel-label">Live-Spiele</span>
            <h2>Öffentliche Lobby</h2>
          </div>
          <button className="quiet-button" type="button" onClick={onRefresh}>
            <span aria-hidden="true">↻</span> Aktualisieren
          </button>
        </div>
        {games.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" aria-hidden="true">
              ♟
            </div>
            <strong>Noch keine offenen Partien</strong>
            <span className="muted">Eröffne ein Spiel und lade andere Spieler ein.</span>
          </div>
        ) : (
          <div className="lobby-list">
            {games.map((game) => (
              <div className="lobby-row" key={game.code}>
                <div className="game-mode-icon" aria-hidden="true">
                  {game.mode === 'ranked' ? '♛' : '♙'}
                </div>
                <div>
                  <strong>{gameLabel(game)}</strong>
                  <span className="muted">5 Minuten · offen</span>
                </div>
                <span className="waiting-label">
                  <span className="live-dot" />
                  {game.isOwner ? 'Deine Partie' : 'Wartet'}
                </span>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => onJoin(game.code)}
                >
                  {game.isOwner ? 'Öffnen' : 'Beitreten'} <span aria-hidden="true">→</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FriendsView({
  friends,
  searchQuery,
  setSearchQuery,
  searchResults,
  onSearch,
  onAdd,
  onRespond,
}: Readonly<{
  friends: FriendsOverview | null;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchResults: SocialUser[];
  onSearch: (event: React.SyntheticEvent<HTMLFormElement>) => void;
  onAdd: (username: string) => void;
  onRespond: (id: string, action: 'accept' | 'reject') => void;
}>) {
  return (
    <section className="social-grid">
      <div className="content-card">
        <div className="section-heading">
          <div>
            <span className="panel-label">Social</span>
            <h2>Freundesliste</h2>
          </div>
        </div>
        {friends?.friends.length ? (
          <div className="user-list">
            {friends.friends.map((friend) => (
              <div className="user-row" key={friend.id}>
                <span className={friend.online ? 'online-dot' : 'offline-dot'} />
                <strong>{friend.username}</strong>
                <span className="muted">{friend.rating}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Noch keine Freunde.</p>
        )}
        <h3>Eingehend</h3>
        {friends?.incomingRequests.map((request) => (
          <div className="user-row" key={request.id}>
            <strong>{request.sender.username}</strong>
            <button
              className="tiny-button"
              type="button"
              onClick={() => onRespond(request.id, 'accept')}
            >
              Annehmen
            </button>
            <button
              className="tiny-button danger"
              type="button"
              onClick={() => onRespond(request.id, 'reject')}
            >
              Ablehnen
            </button>
          </div>
        ))}
      </div>
      <div className="content-card">
        <span className="panel-label">Spieler finden</span>
        <h2>Benutzersuche</h2>
        <form className="search-row" onSubmit={onSearch}>
          <input
            autoComplete="off"
            name="user-search"
            placeholder="z. B. niklas…"
            spellCheck={false}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
          <button className="secondary-button" type="submit">
            Suchen
          </button>
        </form>
        <div className="user-list">
          {searchResults.map((result) => (
            <div className="user-row" key={result.id}>
              <span className={result.online ? 'online-dot' : 'offline-dot'} />
              <strong>{result.username}</strong>
              <span className="muted">{result.rating}</span>
              <button className="tiny-button" type="button" onClick={() => onAdd(result.username)}>
                + Freund
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
