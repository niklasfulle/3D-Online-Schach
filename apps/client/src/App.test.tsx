import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';

const mocks = vi.hoisted(() => {
  const socket = {
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };
  socket.on.mockReturnValue(socket);

  return {
    requestJson: vi.fn(),
    socket,
  };
});

vi.mock('./request', () => ({ requestJson: mocks.requestJson }));
vi.mock('socket.io-client', () => ({ io: vi.fn(() => mocks.socket) }));
vi.mock('@react-three/fiber', () => ({
  Canvas: () => null,
}));
vi.mock('./board/ChessScene', () => ({ ChessScene: () => null }));

import { App } from './App';

const user = {
  id: 'user-1',
  username: 'Niklas',
  email: 'niklas@example.com',
  rating: 1200,
};

const emptyFriends = {
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
};

const waitingGame = {
  id: 'game-1',
  code: 'ABC123',
  status: 'waiting' as const,
  mode: 'casual' as const,
  whitePlayerId: user.id,
  timeControl: { initialMs: 300000, incrementMs: 0 },
  whiteRemainingMs: 300000,
  blackRemainingMs: 300000,
  expiresAt: Date.now() + 30 * 60 * 1000,
  isOwner: true,
};

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('App', () => {
  it('allows a guest to register and opens the lobby dashboard', async () => {
    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') throw new Error('Nicht angemeldet');
        if (path === '/auth/register') return { user };
        if (path === '/lobby') return { games: [] };
        if (path === '/friends') return emptyFriends;
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Willkommen zurück' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Noch kein Konto/ }));
    expect(await screen.findByRole('heading', { name: 'Konto erstellen' })).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Benutzername'), { target: { value: user.username } });
    fireEvent.change(screen.getByRole('textbox', { name: /E-Mail/ }), {
      target: { value: user.email },
    });
    fireEvent.change(screen.getByLabelText('Passwort'), { target: { value: 'secure-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrieren' }));

    expect(
      await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' }),
    ).toBeTruthy();
    expect(mocks.requestJson).toHaveBeenCalledWith(
      expect.any(String),
      '/auth/register',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('loads the lobby and logs the user out', async () => {
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [waitingGame] };
      if (path === '/friends') return emptyFriends;
      if (path === '/auth/logout') return { ok: true };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);

    expect(await screen.findByText('Casual · ABC123')).toBeTruthy();
    expect(screen.getByText(/verfällt in/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByRole('heading', { name: 'Willkommen zurück' })).toBeTruthy();
    expect(mocks.requestJson).toHaveBeenCalledWith(
      expect.any(String),
      '/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('searches for players and responds to friendship actions', async () => {
    const incomingRequest = {
      id: 'request-1',
      status: 'pending' as const,
      createdAt: '2026-09-11T00:00:00.000Z',
      sender: { id: 'sender-1', username: 'Lena', rating: 1100, online: true },
      receiver: user,
    };
    const friend = { id: 'friend-1', username: 'Max', rating: 1250, online: false };
    const overview = {
      friends: [friend],
      incomingRequests: [incomingRequest],
      outgoingRequests: [],
    };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return overview;
      if (path.startsWith('/users/search')) return { users: [{ ...friend, username: 'Mara' }] };
      if (path === '/friends/requests') return { ok: true };
      if (path === '/friends/requests/request-1/accept') return { ok: true };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Freunde/ }));

    expect(await screen.findByRole('heading', { name: 'Deine Freunde' })).toBeTruthy();
    expect(screen.getByText('Max')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('z. B. niklas…'), {
      target: { value: 'Mara' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    expect(await screen.findByText('Mara')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ Freund' }));
    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        '/friends/requests',
        expect.objectContaining({ method: 'POST' }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Annehmen' }));
    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        '/friends/requests/request-1/accept',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
  });

  it('opens a newly created casual game', async () => {
    const activeGame = {
      ...waitingGame,
      status: 'active' as 'active' | 'finished',
      blackPlayerId: 'opponent-1',
    };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/lobby/games') return activeGame;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));

    expect(await screen.findByRole('heading', { name: 'Am Brett' })).toBeTruthy();
    expect(screen.getByText('ABC123')).toBeTruthy();
    expect(document.querySelector('.app-shell')?.className).toContain('game-mode');
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:sync', { code: activeGame.code });

    const gameUpdatedHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'game:updated',
    )?.[1] as ((game: typeof activeGame) => void) | undefined;
    gameUpdatedHandler?.({ ...activeGame, status: 'finished' });
    expect(await screen.findByText('Casual · ABC123 · finished')).toBeTruthy();
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:sync', { code: activeGame.code });
  });

  it('copies a shareable link for the active game', async () => {
    const activeGame = {
      ...waitingGame,
      status: 'active' as const,
      blackPlayerId: 'opponent-1',
    };
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/lobby/games') return activeGame;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));
    await screen.findByRole('heading', { name: 'Am Brett' });

    fireEvent.click(screen.getByRole('button', { name: 'Link kopieren' }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/game/ABC123')),
    );
    expect(screen.getByRole('button', { name: 'Link kopiert' })).toBeTruthy();
    expect(window.location.pathname).toBe('/game/ABC123');

    fireEvent.click(screen.getByRole('button', { name: 'Zuschauerlink kopieren' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/watch/ABC123')),
    );
  });

  it('opens and joins a waiting game from its invitation path', async () => {
    window.history.replaceState({}, '', '/game/ABC123');
    const invitedGame = {
      ...waitingGame,
      whitePlayerId: 'owner-1',
    };
    const joinedGame = {
      ...waitingGame,
      status: 'active' as const,
      blackPlayerId: user.id,
    };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/games/ABC123') return invitedGame;
      if (path === '/lobby/games/ABC123/join') return joinedGame;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    expect(await screen.findByRole('heading', { name: 'Am Brett' })).toBeTruthy();
    expect(
      mocks.requestJson.mock.calls.filter(([, path]) => path === '/lobby/games/ABC123/join'),
    ).toHaveLength(1);
  });

  it('shows notifications and links a game invitation to the game', async () => {
    const notification = {
      id: 'notification-1',
      type: 'game_invitation',
      title: 'Einladung zu einer Partie',
      message: 'Mara hat dich eingeladen.',
      gameCode: 'ABC123',
      read: false,
      createdAt: '2026-09-11T10:00:00.000Z',
      actor: { id: 'friend-1', username: 'Mara', rating: 1250, online: true },
    };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [notification] };
      if (path === '/notifications/notification-1/read') return { ...notification, read: true };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Benachrichtigungen/ }));

    expect(await screen.findByText('Einladung zu einer Partie')).toBeTruthy();
    const invitationLink = screen.getByRole('link', { name: /Partie öffnen/ });
    expect(invitationLink.getAttribute('href')).toBe('/game/ABC123');
  });

  it('invites a friend from an own waiting game', async () => {
    const friend = { id: 'friend-1', username: 'Mara', rating: 1250, online: true };
    const ownWaitingGame = { ...waitingGame, whitePlayerId: user.id };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return { ...emptyFriends, friends: [friend] };
      if (path === '/lobby/games') return ownWaitingGame;
      if (path === '/games/ABC123/invitations') return { id: 'notification-2' };
      if (path === '/notifications') return { notifications: [] };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));
    await screen.findByRole('heading', { name: 'Am Brett' });
    fireEvent.click(screen.getByRole('button', { name: /Freunde/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Einladen' }));

    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        '/games/ABC123/invitations',
        expect.objectContaining({ method: 'POST', body: JSON.stringify({ username: 'Mara' }) }),
      ),
    );
  });

  it('loads and sends chat messages inside a game', async () => {
    const activeGame = {
      ...waitingGame,
      status: 'active' as const,
      blackPlayerId: 'opponent-1',
    };
    const chatMessage = {
      id: 'message-1',
      senderId: 'opponent-1',
      senderUsername: 'Mara',
      message: 'Viel Erfolg!',
      createdAt: '2026-09-11T10:00:00.000Z',
    };

    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') return { user };
        if (path === '/lobby') return { games: [] };
        if (path === '/friends') return emptyFriends;
        if (path === '/notifications') return { notifications: [] };
        if (path === '/lobby/games') return activeGame;
        if (path === '/games/ABC123/chat') {
          return options?.method === 'POST' ? chatMessage : { messages: [chatMessage] };
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));
    await screen.findByRole('heading', { name: 'Am Brett' });
    expect(await screen.findByText('Viel Erfolg!')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Chatnachricht'), {
      target: { value: 'Danke!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Senden' }));
    expect(mocks.socket.emit).toHaveBeenCalledWith('chat:send', {
      code: 'ABC123',
      message: 'Danke!',
    });
  });

  it('opens an active game in read-only spectator mode', async () => {
    window.history.replaceState({}, '', '/watch/ABC123');
    const activeGame = {
      ...waitingGame,
      status: 'active' as const,
      whitePlayerId: 'owner-1',
      blackPlayerId: 'opponent-1',
    };
    const sync = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      game: activeGame,
      moves: [],
    };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      if (path === '/games/ABC123/spectate') return sync;
      if (path === '/games/ABC123/chat') return { messages: [] };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Am Brett' })).toBeTruthy();
    expect(screen.getByText('Zuschauer')).toBeTruthy();
    expect(screen.getByText(/nur Zuschauen/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Senden' })).toBeNull();
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:spectate', { code: 'ABC123' });
    expect(window.location.pathname).toBe('/watch/ABC123');
  });
});
