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
    await page.getByRole('combobox', { name: 'Sprache' }).selectOption('en');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No account yet? Register' })).toBeVisible();

    await page.getByRole('button', { name: 'No account yet? Register' }).click();
    await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
    await page.getByLabel('Username').fill(credentials.username);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Register', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Ready for your next move?' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Public lobby' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ready for your next move?' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Language' })).toHaveValue('en');
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
});
