import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

interface Credentials {
  username: string;
  password: string;
}

const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3001';

function createCredentials(): Credentials {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return {
    username: `e2e${suffix}`,
    password: `TestPass!${suffix}`,
  };
}

async function registerUser(request: APIRequestContext, credentials: Credentials) {
  const response = await request.post(`${apiUrl}/auth/register`, {
    data: credentials,
  });
  expect(response.status()).toBe(200);
  return (await response.json()).user as { id: string };
}

async function openLogin(page: Page) {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
}

async function switchToRegistration(page: Page) {
  await page.getByRole('button', { name: 'Noch kein Konto? Registrieren' }).click();
  await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
}

async function expectAuthenticated(page: Page, username: string) {
  await expect(page.getByRole('heading', { name: 'Bereit für den nächsten Zug?' })).toBeVisible();
  await expect(page.getByText(username, { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abmelden', exact: true })).toBeVisible();
}

test.describe('Authentifizierung', () => {
  test('registriert einen Benutzer und stellt die Session nach Reload wieder her', async ({
    page,
  }) => {
    const credentials = createCredentials();

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('E-Mail').fill(`${credentials.username}@example.test`);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();

    await expectAuthenticated(page, credentials.username);
    await expect(page.context().cookies()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'chess3d_session' })]),
    );

    await page.reload();
    await expectAuthenticated(page, credentials.username);
  });

  test('meldet einen bestehenden Benutzer an und lehnt ein falsches Passwort ab', async ({
    page,
    request,
  }) => {
    const credentials = createCredentials();
    await registerUser(request, credentials);

    await openLogin(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill('wrong-password');
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Invalid username or password');
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();

    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expectAuthenticated(page, credentials.username);
  });

  test('lehnt eine doppelte Registrierung ab und meldet korrekt ab', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerUser(request, credentials);

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText('Username or email is already registered');
    await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();

    await page.getByRole('button', { name: 'Bereits registriert? Anmelden' }).click();
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expectAuthenticated(page, credentials.username);

    await page.getByRole('button', { name: 'Abmelden', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Anmelden', exact: true })).toBeVisible();
    await expect(page.context().cookies()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'chess3d_session' })]),
    );

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Willkommen zurück' })).toBeVisible();
  });

  test('verhindert die Registrierung mit zu kurzem Passwort im Browser', async ({ page }) => {
    const credentials = createCredentials();

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill('short');
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Konto erstellen' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Bereit für den nächsten Zug?' }),
    ).not.toBeVisible();
  });

  test('wechselt Authentifizierung und Lobby ohne Reload auf Englisch', async ({ page }) => {
    const credentials = createCredentials();

    await openLogin(page);
    await page.getByRole('button', { name: 'Darstellung' }).click();
    await page.getByRole('menuitem', { name: 'Hell' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.getByRole('button', { name: 'Sprache' }).click();
    await page.getByRole('menuitem', { name: 'Englisch' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No account yet? Register' })).toBeVisible();

    await page.getByRole('button', { name: 'No account yet? Register' }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await page.getByLabel('Username').fill(credentials.username);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Register', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Ready for your next move?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Public lobby' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Language' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Theme' })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ready for your next move?' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Language' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('spannt das Dashboard ohne äußeren Rand über den gesamten Viewport', async ({ page }) => {
    const credentials = createCredentials();

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expectAuthenticated(page, credentials.username);

    const dashboardBounds = await page.locator('.dashboard-shell').evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return {
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      };
    });

    expect(dashboardBounds.left).toBe(0);
    expect(dashboardBounds.top).toBe(0);
    expect(dashboardBounds.width).toBe(dashboardBounds.viewportWidth);
    expect(dashboardBounds.height).toBeGreaterThanOrEqual(dashboardBounds.viewportHeight);
  });

  test('zeigt den responsiven Footer mit Version und Produktlinks', async ({ page }) => {
    const credentials = createCredentials();

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expectAuthenticated(page, credentials.username);

    const footer = page.locator('.app-footer');
    await expect(footer).toBeVisible();
    await expect(footer.getByText('Version 0.1.0')).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Repository' })).toHaveAttribute(
      'href',
      'https://github.com/niklasfulle/3D-Online-Schach',
    );
    await expect(footer.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      '/datenschutz',
    );

    await page.getByRole('button', { name: 'Sprache' }).click();
    await page.getByRole('menuitem', { name: 'Englisch' }).click();
    await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Imprint' })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(footer).toHaveCSS('flex-direction', 'column');
  });

  test('öffnet eine Partie über den Einladungslink und tritt ihr bei', async ({
    page,
    browser,
  }) => {
    const owner = createCredentials();
    const invitee = createCredentials();

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(owner.username);
    await page.getByLabel('Passwort').fill(owner.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expectAuthenticated(page, owner.username);
    await page.getByRole('button', { name: /Casual-Spiel erstellen/ }).click();
    await expect(page.getByRole('heading', { name: 'Am Brett' })).toBeVisible();

    await page.setViewportSize({ width: 640, height: 800 });
    const compactBoard = await page.locator('.board-canvas').evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return { width: bounds.width, viewportWidth: window.innerWidth };
    });
    expect(compactBoard.width).toBeGreaterThan(500);
    expect(compactBoard.width).toBeLessThanOrEqual(compactBoard.viewportWidth);
    await page.setViewportSize({ width: 1280, height: 720 });

    const invitationUrl = page.url();
    expect(invitationUrl).toMatch(/\/game\/[A-Z0-9]+$/);

    const inviteePage = await browser.newPage();
    try {
      await openLogin(inviteePage);
      await switchToRegistration(inviteePage);
      await inviteePage.getByLabel('Benutzername').fill(invitee.username);
      await inviteePage.getByLabel('Passwort').fill(invitee.password);
      await inviteePage.getByRole('button', { name: 'Registrieren', exact: true }).click();
      await expectAuthenticated(inviteePage, invitee.username);

      await inviteePage.goto(invitationUrl);
      await expect(inviteePage.getByRole('heading', { name: 'Am Brett' })).toBeVisible();
      await expect(inviteePage.getByText('Schwarz', { exact: true })).toBeVisible();
      await page.getByLabel('Chatnachricht').fill('Viel Erfolg!');
      await page.getByRole('button', { name: 'Senden' }).click();
      await expect(inviteePage.getByText('Viel Erfolg!', { exact: true })).toBeVisible();

      const spectatorPage = await browser.newPage();
      try {
        await spectatorPage.goto(invitationUrl.replace('/game/', '/watch/'));
        await expect(spectatorPage.getByRole('heading', { name: 'Am Brett' })).toBeVisible();
        await expect(spectatorPage.getByText('Zuschauer', { exact: true })).toBeVisible();
        await expect(
          spectatorPage.getByText('Als Zuschauer kannst du den Chat mitlesen.'),
        ).toBeVisible();
        await expect(spectatorPage.getByRole('button', { name: 'Senden' })).toHaveCount(0);
      } finally {
        await spectatorPage.close();
      }
    } finally {
      await inviteePage.close();
    }
  });

  test('leitet einen nicht mehr verfügbaren Partielink zur Lobby zurück', async ({
    page,
    request,
  }) => {
    const credentials = createCredentials();
    await registerUser(request, credentials);

    await openLogin(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expectAuthenticated(page, credentials.username);

    await page.goto('/game/EXPIRED1');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('dialog', { name: 'Lobby nicht verfügbar' })).toBeVisible();
    await expect(page.locator('.lobby-unavailable-popover')).toContainText('EXPIRED1');
  });

  test('liefert Freundschafts- und Spieleinladungen als Benachrichtigungen', async ({
    page,
    browser,
  }) => {
    const owner = createCredentials();
    const invitee = createCredentials();
    const inviteePage = await browser.newPage();

    try {
      await openLogin(inviteePage);
      await switchToRegistration(inviteePage);
      await inviteePage.getByLabel('Benutzername').fill(invitee.username);
      await inviteePage.getByLabel('Passwort').fill(invitee.password);
      await inviteePage.getByRole('button', { name: 'Registrieren', exact: true }).click();
      await expectAuthenticated(inviteePage, invitee.username);

      await openLogin(page);
      await switchToRegistration(page);
      await page.getByLabel('Benutzername').fill(owner.username);
      await page.getByLabel('Passwort').fill(owner.password);
      await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
      await expectAuthenticated(page, owner.username);

      await page.getByRole('button', { name: /Freunde/ }).click();
      await page.getByPlaceholder('z. B. niklas…').fill(invitee.username);
      await page.getByRole('button', { name: 'Suchen' }).click();
      await expect(page.getByText(invitee.username, { exact: true }).last()).toBeVisible();
      await page.getByRole('button', { name: '+ Freund' }).click();

      await inviteePage.reload();
      await expect(
        inviteePage.getByRole('button', { name: /Benachrichtigungen \(1\)/ }),
      ).toBeVisible();
      await inviteePage.getByRole('button', { name: /Benachrichtigungen/ }).click();
      await expect(inviteePage.getByText('Neue Freundschaftsanfrage')).toBeVisible();
      await inviteePage.getByRole('button', { name: /Freunde/ }).click();
      await inviteePage.getByRole('button', { name: 'Annehmen' }).click();

      await page.getByRole('button', { name: 'Lobby' }).click();
      await page.getByRole('button', { name: /Casual-Spiel erstellen/ }).click();
      await expect(page.getByRole('heading', { name: 'Am Brett' })).toBeVisible();
      await page.getByRole('button', { name: 'Zurück zur Lobby' }).first().click();
      await expect(page).toHaveURL(/\/$/);
      await page.getByRole('button', { name: /Freunde/ }).click();
      await expect(page.getByText(invitee.username, { exact: true }).last()).toBeVisible();
      await page.getByRole('button', { name: 'Einladen' }).click();

      await inviteePage.reload();
      await inviteePage.getByRole('button', { name: /Benachrichtigungen \(2\)/ }).click();
      await expect(inviteePage.getByText('Einladung zu einer Partie')).toBeVisible();
      await expect(inviteePage.getByRole('link', { name: /Partie öffnen/ })).toHaveAttribute(
        'href',
        /\/game\/[A-Z0-9]+/,
      );
    } finally {
      await inviteePage.close();
    }
  });

  test('zeigt die persönliche Spielhistorie mit Zügen und PGN-Link', async ({ page, request }) => {
    const player = createCredentials();
    const opponent = createCredentials();
    const playerUser = await registerUser(request, player);
    const opponentUser = await registerUser(request, opponent);

    const created = await request.post(`${apiUrl}/games`, {
      data: { playerId: playerUser.id, initialMs: 300_000 },
    });
    expect(created.status()).toBe(201);
    const game = (await created.json()) as { code: string };

    const joined = await request.post(`${apiUrl}/games/${game.code}/join`, {
      data: { playerId: opponentUser.id },
    });
    expect(joined.status()).toBe(200);

    for (const [playerId, from, to] of [
      [playerUser.id, 'e2', 'e4'],
      [opponentUser.id, 'e7', 'e5'],
      [playerUser.id, 'f1', 'c4'],
      [opponentUser.id, 'b8', 'c6'],
      [playerUser.id, 'd1', 'h5'],
      [opponentUser.id, 'g8', 'f6'],
      [playerUser.id, 'h5', 'f7'],
    ]) {
      const move = await request.post(`${apiUrl}/games/${game.code}/moves`, {
        data: { playerId, from, to },
      });
      expect(move.status()).toBe(200);
    }

    await openLogin(page);
    await page.getByLabel('Benutzername').fill(player.username);
    await page.getByLabel('Passwort').fill(player.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expectAuthenticated(page, player.username);

    await page.getByRole('button', { name: /Historie/ }).click();
    await expect(page.getByRole('heading', { name: 'Spielhistorie', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: new RegExp(game.code) })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(game.code) }).click();
    await expect(page.getByRole('region', { name: `Partiedetails ${game.code}` })).toBeVisible();
    await expect(page.getByText('Qxf7#')).toBeVisible();
    await expect(page.getByRole('link', { name: 'PGN herunterladen' })).toHaveAttribute(
      'href',
      new RegExp(`/games/${game.code}/pgn`),
    );
  });

  test('kann eine aktive Partie über die Spielansicht aufgeben', async ({ page, request }) => {
    const player = createCredentials();
    const opponent = createCredentials();
    const playerUser = await registerUser(request, player);
    const opponentUser = await registerUser(request, opponent);

    const created = await request.post(`${apiUrl}/games`, {
      data: { playerId: playerUser.id, initialMs: 300_000 },
    });
    expect(created.status()).toBe(201);
    const game = (await created.json()) as { code: string };

    const joined = await request.post(`${apiUrl}/games/${game.code}/join`, {
      data: { playerId: opponentUser.id },
    });
    expect(joined.status()).toBe(200);

    await openLogin(page);
    await page.getByLabel('Benutzername').fill(player.username);
    await page.getByLabel('Passwort').fill(player.password);
    await page.getByRole('button', { name: 'Anmelden', exact: true }).click();
    await expectAuthenticated(page, player.username);

    await page.goto(`/game/${game.code}`);
    await expect(page.getByRole('heading', { name: 'Am Brett' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aufgeben', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Aufgeben', exact: true }).click();

    await expect(page.getByText(`Casual · ${game.code} · Beendet`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aufgeben', exact: true })).toHaveCount(0);
  });

  test('zeigt das Benutzerprofil mit Statistiken und Bewertungsverlauf', async ({ page }) => {
    const credentials = createCredentials();

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(credentials.username);
    await page.getByLabel('Passwort').fill(credentials.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expectAuthenticated(page, credentials.username);

    await page.getByRole('button', { name: 'Dein Profil', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Mein Profil' })).toBeVisible();
    await expect(page.getByText('Partien gesamt')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Deine Entwicklung' })).toBeVisible();
    await expect(page.getByText('WERTUNGSVERLAUF')).toBeVisible();
  });

  test('öffnet ein öffentliches Spielerprofil aus der Spielersuche ohne private Daten', async ({
    page,
    request,
  }) => {
    const viewer = createCredentials();
    const target = createCredentials();

    const targetRegistration = await request.post(`${apiUrl}/auth/register`, {
      data: {
        ...target,
        email: `${target.username}@example.test`,
      },
    });
    expect(targetRegistration.status()).toBe(200);

    await openLogin(page);
    await switchToRegistration(page);
    await page.getByLabel('Benutzername').fill(viewer.username);
    await page.getByLabel('Passwort').fill(viewer.password);
    await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
    await expectAuthenticated(page, viewer.username);

    await page.getByRole('button', { name: /Freunde/ }).click();
    await page.getByPlaceholder('z. B. niklas…').fill(target.username);
    await page.getByRole('button', { name: 'Suchen' }).click();
    await page.getByRole('button', { name: target.username, exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Öffentliches Profil' })).toBeVisible();
    await expect(page.getByRole('heading', { name: target.username, level: 2 })).toBeVisible();
    await expect(page.getByText(`${target.username}@example.test`)).toHaveCount(0);
  });
});
