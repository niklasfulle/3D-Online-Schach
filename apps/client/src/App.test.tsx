import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode } from 'react';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (payload: unknown) => void>();
  const socket = {
    on: vi.fn((event: string, handler: (payload: unknown) => void) => {
      listeners.set(event, handler);
      return socket;
    }),
    emit: vi.fn(),
    disconnect: vi.fn(),
  };

  return {
    requestJson: vi.fn(),
    socket,
    listeners,
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
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  vi.useRealTimers();
  vi.clearAllMocks();
  mocks.listeners.clear();
});

describe('App', () => {
  it('renders a localized footer with version and product links', async () => {
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });

    expect(screen.getByRole('contentinfo', { name: 'Footer' })).toBeTruthy();
    expect(screen.getByText('Version 0.1.0')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Repository' }).getAttribute('href')).toBe(
      'https://github.com/niklasfulle/3D-Online-Schach',
    );
    expect(screen.getByRole('link', { name: 'Datenschutz' }).getAttribute('href')).toBe(
      '/datenschutz',
    );
    expect(screen.getByRole('link', { name: 'Impressum' }).getAttribute('href')).toBe('/impressum');

    fireEvent.click(screen.getByRole('button', { name: 'Sprache: Deutsch' }));

    expect(screen.getByRole('contentinfo', { name: 'Footer' })).toBeTruthy();
    expect(screen.getByText('Version 0.1.0')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Privacy' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Imprint' })).toBeTruthy();
  });

  it('switches language and persists the preference', async () => {
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });

    fireEvent.click(screen.getByRole('button', { name: 'Darstellung: Dunkel' }));
    expect(localStorage.getItem('chess3d.theme')).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: 'Sprache: Deutsch' }));

    expect(localStorage.getItem('chess3d.language')).toBe('en');
    expect(screen.getByRole('button', { name: 'Language: English' })).toBeTruthy();
    expect(screen.queryByRole('menu')).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Ready for your next move?' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Public lobby' })).toBeTruthy();
    expect(screen.getByText('Find your next game.')).toBeTruthy();
  });

  it('loads, filters, opens and paginates the personal game history', async () => {
    const historyGames = [
      {
        id: 'history-1',
        code: 'ABC123',
        mode: 'ranked' as const,
        result: 'white' as const,
        createdAt: '2026-09-10T18:00:00.000Z',
        finishedAt: '2026-09-10T18:20:00.000Z',
        whitePlayer: { id: user.id, username: user.username },
        blackPlayer: { id: 'user-2', username: 'Mara' },
        moves: [
          {
            moveNumber: 1,
            from: 'e2',
            to: 'e4',
            promotion: null,
            san: 'e4',
            fenAfterMove: 'fen-after-e4',
          },
        ],
      },
      {
        id: 'history-2',
        code: 'XYZ789',
        mode: 'casual' as const,
        result: 'black' as const,
        createdAt: '2026-09-09T18:00:00.000Z',
        finishedAt: '2026-09-09T18:20:00.000Z',
        whitePlayer: { id: user.id, username: user.username },
        blackPlayer: { id: 'user-3', username: 'Leo' },
        moves: [],
      },
    ];
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      if (path === '/games/history?limit=20')
        return { games: historyGames, nextCursor: 'next-page' };
      if (path === '/games/history?limit=20&cursor=next-page')
        return { games: [], nextCursor: undefined };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Historie/ }));

    expect(await screen.findByRole('heading', { name: 'Spielhistorie', level: 1 })).toBeTruthy();
    expect(mocks.requestJson).toHaveBeenCalledWith(expect.any(String), '/games/history?limit=20');
    expect(screen.getByRole('button', { name: /ABC123/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /XYZ789/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ABC123/ }).className).toContain(
      'grid-cols-[2.1rem_minmax(0,1fr)_auto_auto]',
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Ergebnis' }), {
      target: { value: 'wins' },
    });
    expect(screen.getByRole('button', { name: /ABC123/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /XYZ789/ })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /ABC123/ }));
    expect(screen.getByRole('region', { name: 'Partiedetails ABC123' })).toBeTruthy();
    expect(screen.getByText('e4')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'PGN herunterladen' }).getAttribute('href')).toContain(
      '/games/ABC123/pgn',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mehr laden' }));
    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        '/games/history?limit=20&cursor=next-page',
      ),
    );
  });

  it('opens the user profile with game statistics and rating history', async () => {
    const profile = {
      user: { ...user, createdAt: '2026-01-01T00:00:00.000Z' },
      stats: {
        totalGames: 4,
        wins: 2,
        losses: 1,
        draws: 1,
        ranked: { totalGames: 2, wins: 1, losses: 0, draws: 1 },
        casual: { totalGames: 2, wins: 1, losses: 1, draws: 0 },
        ratingHistory: [
          { at: '2026-02-01T00:00:00.000Z', rating: 1200 },
          { at: '2026-02-04T00:00:00.000Z', rating: 1240 },
        ],
      },
    };
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      if (path === '/profile') return profile;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    const profileButton = screen.getByRole('button', { name: 'Dein Profil' });
    expect(
      within(screen.getByRole('navigation', { name: 'Hauptnavigation' })).queryByRole('button', {
        name: 'Dein Profil',
      }),
    ).toBeNull();
    fireEvent.click(profileButton);

    expect(await screen.findByRole('heading', { name: 'Mein Profil' })).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Deine Entwicklung' })).toBeTruthy();
    expect(screen.getByText('1240')).toBeTruthy();
    expect(mocks.requestJson).toHaveBeenCalledWith(expect.any(String), '/profile');
    expect(window.location.pathname).toBe('/profile');
  });

  it('restores the profile view from its direct URL', async () => {
    window.history.replaceState({}, '', '/profile');
    const profile = {
      user: { ...user, createdAt: '2026-01-01T00:00:00.000Z' },
      stats: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        ranked: { totalGames: 0, wins: 0, losses: 0, draws: 0 },
        casual: { totalGames: 0, wins: 0, losses: 0, draws: 0 },
        ratingHistory: [{ at: '2026-01-01T00:00:00.000Z', rating: 1200 }],
      },
    };
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      if (path === '/profile') return profile;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Mein Profil' })).toBeTruthy();
    expect(window.location.pathname).toBe('/profile');
  });

  it('opens a public profile from the friends list without showing private contact data', async () => {
    const publicProfile = {
      user: {
        id: 'friend-1',
        username: 'Max',
        rating: 1250,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      stats: {
        totalGames: 1,
        wins: 1,
        losses: 0,
        draws: 0,
        ranked: { totalGames: 1, wins: 1, losses: 0, draws: 0 },
        casual: { totalGames: 0, wins: 0, losses: 0, draws: 0 },
        ratingHistory: [{ at: '2026-01-01T00:00:00.000Z', rating: 1250 }],
      },
    };
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') {
        return {
          ...emptyFriends,
          friends: [{ id: 'friend-1', username: 'Max', rating: 1250, online: true }],
        };
      }
      if (path === '/notifications') return { notifications: [] };
      if (path === '/users/friend-1/profile') return publicProfile;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Freunde/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Max$/ }));

    expect(await screen.findByRole('heading', { name: 'Öffentliches Profil' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Max', level: 2 })).toBeTruthy();
    expect(screen.queryByText('max@example.com')).toBeNull();
    expect(mocks.requestJson).toHaveBeenCalledWith(expect.any(String), '/users/friend-1/profile');
  });

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
    expect(screen.getByText(/verfällt in/)).toBeTruthy();
    const appShell = screen.getByRole('main');
    expect(appShell.className).toContain('grid-rows-[1fr_auto]');
    expect((appShell.firstElementChild as HTMLElement).className).toContain('grid-rows-[auto_1fr]');
    fireEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

    expect(await screen.findByRole('heading', { name: 'Willkommen zurück' })).toBeTruthy();
    expect(mocks.requestJson).toHaveBeenCalledWith(
      expect.any(String),
      '/auth/logout',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('uses icon controls and opens the profile directly from the header', async () => {
    const profile = {
      user: { ...user, createdAt: '2026-01-01T00:00:00.000Z' },
      stats: {
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        ranked: { totalGames: 0, wins: 0, losses: 0, draws: 0 },
        casual: { totalGames: 0, wins: 0, losses: 0, draws: 0 },
        ratingHistory: [{ at: '2026-01-01T00:00:00.000Z', rating: 1200 }],
      },
    };
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      if (path === '/profile') return profile;
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });

    const notificationButton = screen.getByRole('button', { name: 'Benachrichtigungen (0)' });
    const logoutButton = screen.getByRole('button', { name: 'Abmelden' });
    expect(notificationButton.textContent).toBe('');
    expect(logoutButton.textContent).toBe('');
    expect(notificationButton.querySelector('svg')).not.toBeNull();
    expect(logoutButton.querySelector('svg')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Niklas · 1200' }));
    expect(await screen.findByRole('heading', { name: 'Mein Profil' })).toBeTruthy();
    expect(screen.queryByRole('dialog', { name: 'Dein Profil' })).toBeNull();
  });

  it('refreshes the public lobby games every five seconds', async () => {
    vi.useFakeTimers();
    const newlyListedGame = { ...waitingGame, code: 'NEW456', isOwner: false };
    let lobbyRequestCount = 0;
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') {
        lobbyRequestCount += 1;
        return { games: lobbyRequestCount === 1 ? [] : [newlyListedGame] };
      }
      if (path === '/friends') return emptyFriends;
      if (path === '/notifications') return { notifications: [] };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByRole('heading', { name: 'Bereit für den nächsten Zug?' })).toBeTruthy();
    expect(screen.queryByText('Casual · NEW456')).toBeNull();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByText('Casual · NEW456')).toBeTruthy();
  });

  it('shows the admin area only for admins and updates a user role', async () => {
    const adminUser = { ...user, role: 'admin' as const };
    const managedUsers = [
      { id: adminUser.id, username: adminUser.username, rating: 1200, role: 'admin' as const },
      { id: 'user-2', username: 'Mara', rating: 1250, role: 'user' as const },
    ];
    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') return { user: adminUser };
        if (path === '/lobby') return { games: [] };
        if (path === '/friends') return emptyFriends;
        if (path === '/admin/users' && !options?.method) return { users: managedUsers };
        if (path === '/admin/users/user-2/role' && options?.method === 'PATCH') {
          return { user: { ...managedUsers[1], role: 'spectator' as const } };
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Administration/ }));

    expect(await screen.findByRole('heading', { name: 'Benutzer und Rollen' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: 'Rolle für Mara' }), {
      target: { value: 'spectator' },
    });

    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        '/admin/users/user-2/role',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ role: 'spectator' }),
        }),
      ),
    );
  });

  it('opens a spectator link without requiring an account', async () => {
    const activeGame = { ...waitingGame, status: 'active' as const, blackPlayerId: 'opponent-1' };
    const sync = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      game: activeGame,
      moves: [],
    };
    window.history.replaceState({}, '', '/watch/ABC123');
    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') throw new Error('Nicht angemeldet');
      if (path === '/games/ABC123/spectate') return sync;
      if (path === '/games/ABC123/chat') throw new Error('Gast darf Chat nicht laden');
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Am Brett' })).toBeTruthy();
    expect(screen.getByText('Zuschauer', { exact: true })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Willkommen zurück' })).toBeNull();
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:spectate', { code: 'ABC123' });
  });

  it('deletes an own waiting game from the lobby', async () => {
    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') return { user };
        if (path === '/lobby') return { games: [waitingGame] };
        if (path === '/friends') return emptyFriends;
        if (path === `/lobby/games/${waitingGame.code}` && options?.method === 'DELETE') {
          return { ok: true };
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);

    expect(await screen.findByText('Casual · ABC123')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Partie ABC123 löschen' }));

    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        '/lobby/games/ABC123',
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    expect(screen.queryByText('Casual · ABC123')).toBeNull();
  });

  it('searches for players and responds to friendship actions', async () => {
    const incomingRequest = {
      id: 'request-1',
      status: 'pending' as const,
      createdAt: '2026-09-11T00:00:00.000Z',
      sender: { id: 'sender-1', username: 'Lena', rating: 1100, online: true },
      receiver: user,
    };
    const outgoingRequest = {
      id: 'request-2',
      status: 'pending' as const,
      createdAt: '2026-09-11T00:00:00.000Z',
      sender: user,
      receiver: { id: 'receiver-1', username: 'Jonas', rating: 1180, online: false },
    };
    const friend = { id: 'friend-1', username: 'Max', rating: 1250, online: false };
    const overview = {
      friends: [friend],
      incomingRequests: [incomingRequest],
      outgoingRequests: [outgoingRequest],
    };

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return overview;
      if (path.startsWith('/users/search')) {
        return { users: [{ ...friend, username: 'Mara' }, outgoingRequest.receiver] };
      }
      if (path === '/friends/requests') return { ok: true };
      if (path === '/friends/requests/request-1/accept') return { ok: true };
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Freunde/ }));

    expect(await screen.findByRole('heading', { name: 'Deine Freunde' })).toBeTruthy();
    expect(screen.getByText('Max')).toBeTruthy();
    expect(screen.getByText('Anfrage gesendet')).toBeTruthy();
    expect(screen.getByText('Jonas')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('z. B. niklas…'), {
      target: { value: 'Mara' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Suchen' }));
    expect(await screen.findByText('Mara')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Anfrage gesendet' }).getAttribute('disabled'),
    ).not.toBeNull();

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
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:sync', { code: activeGame.code });

    const gameUpdatedHandler = mocks.socket.on.mock.calls.find(
      ([event]) => event === 'game:updated',
    )?.[1] as ((game: typeof activeGame) => void) | undefined;
    gameUpdatedHandler?.({ ...activeGame, status: 'finished' });
    expect((await screen.findAllByText('Beendet')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Casual · ABC123 · Beendet')).toBeNull();
    expect(mocks.socket.emit).toHaveBeenCalledWith('game:sync', { code: activeGame.code });
  });

  it('returns to the root path from the game view', async () => {
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
    await screen.findByRole('heading', { name: 'Am Brett' });

    expect(screen.getByText('Status')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: 'Zurück zur Lobby' })[0]);

    expect(window.location.pathname).toBe('/');
    expect(
      await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' }),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Aktive Partie' }));
    await screen.findByRole('heading', { name: 'Am Brett' });
    expect(window.location.pathname).toBe('/game/ABC123');
  });

  it('lets the owner delete a waiting game from the game view', async () => {
    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') return { user };
        if (path === '/lobby') return { games: [] };
        if (path === '/friends') return emptyFriends;
        if (path === '/notifications') return { notifications: [] };
        if (path === '/lobby/games' && options?.method === 'POST') return waitingGame;
        if (path === `/lobby/games/${waitingGame.code}` && options?.method === 'DELETE') {
          return { ok: true };
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));
    await screen.findByRole('heading', { name: 'Am Brett' });

    fireEvent.click(screen.getByRole('button', { name: 'Partie löschen' }));
    expect(screen.getByRole('dialog', { name: 'Partie löschen' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Aufgeben' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Löschung bestätigen' }));

    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        `/lobby/games/${waitingGame.code}`,
        expect.objectContaining({ method: 'DELETE' }),
      ),
    );
    expect(window.location.pathname).toBe('/');
    expect(
      await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' }),
    ).toBeTruthy();
  });

  it('shows a helpful translated message when deleting a game loses the network', async () => {
    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') return { user };
        if (path === '/lobby') return { games: [] };
        if (path === '/friends') return emptyFriends;
        if (path === '/lobby/games' && options?.method === 'POST') return waitingGame;
        if (path === `/lobby/games/${waitingGame.code}` && options?.method === 'DELETE') {
          throw new TypeError('Failed to fetch');
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));
    await screen.findByRole('heading', { name: 'Am Brett' });

    fireEvent.click(screen.getByRole('button', { name: 'Partie löschen' }));
    fireEvent.click(screen.getByRole('button', { name: 'Löschung bestätigen' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Partie konnte nicht gelöscht werden');
    expect(alert.textContent).not.toContain('Failed to fetch');
    expect(window.location.pathname).toBe(`/game/${waitingGame.code}`);
  });

  it('lets an active player resign', async () => {
    const activeGame = {
      ...waitingGame,
      status: 'active' as const,
      blackPlayerId: 'opponent-1',
    };

    mocks.requestJson.mockImplementation(
      async (_baseUrl: string, path: string, options?: RequestInit) => {
        if (path === '/auth/me') return { user };
        if (path === '/lobby') return { games: [] };
        if (path === '/friends') return emptyFriends;
        if (path === '/lobby/games') return activeGame;
        if (path === `/games/${activeGame.code}/resign` && options?.method === 'POST') {
          return { game: { ...activeGame, status: 'finished' as const, result: 'black' as const } };
        }
        throw new Error(`Unexpected request: ${path}`);
      },
    );

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Casual-Spiel erstellen/ }));
    await screen.findByRole('heading', { name: 'Am Brett' });

    fireEvent.click(screen.getByRole('button', { name: 'Aufgeben' }));
    expect(screen.queryByRole('dialog', { name: 'Partie aufgeben' })).toBeTruthy();
    expect(mocks.requestJson).not.toHaveBeenCalledWith(
      expect.any(String),
      `/games/${activeGame.code}/resign`,
      expect.anything(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Abbrechen' }));
    expect(screen.queryByRole('dialog', { name: 'Partie aufgeben' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Aufgeben' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Aufgeben' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aufgabe bestätigen' }));

    await waitFor(() =>
      expect(mocks.requestJson).toHaveBeenCalledWith(
        expect.any(String),
        `/games/${activeGame.code}/resign`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect((await screen.findAllByText('Beendet')).length).toBeGreaterThan(0);
    expect(screen.queryByText('Casual · ABC123 · Beendet')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aufgeben' })).toBeNull();
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

    const invitationLinkButton = screen.getByRole('button', { name: 'Link kopieren' });
    const spectatorLinkButton = screen.getByRole('button', { name: 'Zuschauerlink kopieren' });
    expect(invitationLinkButton.textContent).toBe('');
    expect(spectatorLinkButton.textContent).toBe('');
    expect(invitationLinkButton.querySelector('svg')).not.toBeNull();
    expect(spectatorLinkButton.querySelector('svg')).not.toBeNull();

    fireEvent.click(invitationLinkButton);

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining('/game/ABC123')),
    );
    expect(screen.getByRole('button', { name: 'Link kopiert' })).toBeTruthy();
    expect(window.location.pathname).toBe('/game/ABC123');

    fireEvent.click(spectatorLinkButton);
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

  it('redirects unavailable game links to the lobby and shows a code popover', async () => {
    window.history.replaceState({}, '', '/game/EXPIRED1');

    mocks.requestJson.mockImplementation(async (_baseUrl: string, path: string) => {
      if (path === '/auth/me') return { user };
      if (path === '/lobby') return { games: [] };
      if (path === '/friends') return emptyFriends;
      if (path === '/games/EXPIRED1') throw new Error('Request failed with status 404');
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);

    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    expect(window.location.pathname).toBe('/');
    expect(await screen.findByRole('dialog', { name: 'Lobby nicht verfügbar' })).toBeTruthy();
    expect(screen.getByText(/EXPIRED1/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Hinweis schließen' }));
    expect(screen.queryByRole('dialog', { name: 'Lobby nicht verfügbar' })).toBeNull();
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

  it('links spectator invitations to the read-only spectator view', async () => {
    const notification = {
      id: 'notification-spectator-1',
      type: 'spectator_invitation',
      title: 'Einladung zum Zuschauen',
      message: 'Mara lädt dich ein, ihre Partie zu beobachten.',
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
      if (path === '/notifications/notification-spectator-1/read') {
        return { ...notification, read: true };
      }
      throw new Error(`Unexpected request: ${path}`);
    });

    render(<App />);
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
    fireEvent.click(screen.getByRole('button', { name: /Benachrichtigungen/ }));

    const invitationLink = await screen.findByRole('link', { name: /Zuschaueransicht öffnen/ });
    expect(invitationLink.getAttribute('href')).toBe('/watch/ABC123');
  });

  it('keeps side menus out of the game and invites a friend from the lobby', async () => {
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
    expect(screen.queryByRole('button', { name: /Freunde/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Zurück zur Lobby' }));
    await screen.findByRole('heading', { name: 'Bereit für den nächsten Zug?' });
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
    const chatColumn = screen.getByRole('complementary', { name: 'Partiechat' });
    expect(chatColumn.className).toContain('h-full');
    expect(chatColumn.className).toContain('self-stretch');
    const chatToggle = screen.getByRole('button', { name: 'Chat schließen' });
    expect(chatToggle.textContent).toBe('');
    expect(chatToggle.querySelector('svg')).toBeTruthy();
    expect(chatToggle.getAttribute('aria-expanded')).toBe('true');
    const sendButton = within(chatColumn).getByRole('button', { name: 'Senden' });
    expect(sendButton.querySelector('svg')).toBeTruthy();
    expect(sendButton.getAttribute('aria-label')).toBe('Senden');
    fireEvent.click(chatToggle);
    expect(screen.queryByRole('complementary', { name: 'Partiechat' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Chat öffnen' }));
    expect(await screen.findByRole('complementary', { name: 'Partiechat' })).toBeTruthy();
    const reopenedChatColumn = screen.getByRole('complementary', { name: 'Partiechat' });
    expect(
      within(reopenedChatColumn).getByText('Viel Erfolg!').closest('[aria-label]'),
    ).toBeTruthy();
    expect(within(reopenedChatColumn).getByText('12:00')).toBeTruthy();

    const chatLog = within(reopenedChatColumn).getByRole('log');
    Object.defineProperties(chatLog, {
      clientHeight: { configurable: true, value: 100 },
      scrollHeight: { configurable: true, value: 1000 },
      scrollTop: { configurable: true, writable: true, value: 0 },
      scrollTo: { configurable: true, value: vi.fn() },
    });
    mocks.listeners.get('chat:message')?.({
      id: 'message-2',
      senderId: 'opponent-1',
      senderUsername: 'Mara',
      message: 'Dein Zug!',
      createdAt: '2026-09-11T10:01:00.000Z',
    });
    expect(await screen.findByRole('button', { name: 'Neue Nachrichten' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Neue Nachrichten' }));
    expect(screen.queryByRole('button', { name: 'Neue Nachrichten' })).toBeNull();

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
