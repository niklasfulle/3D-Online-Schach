import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
  isOwner: true,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('App', () => {
  it('allows a guest to register and opens the lobby dashboard', async () => {
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') throw new Error('Nicht angemeldet');
      if (path === '/auth/register') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      throw new Error(`Unexpected request: ${path}`);
    });

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
      status: 'active' as const,
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
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:sync', { code: activeGame.code });
  });
});
