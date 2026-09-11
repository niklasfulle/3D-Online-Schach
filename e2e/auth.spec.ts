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
});
