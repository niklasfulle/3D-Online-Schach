import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const outputDirectory = resolve('docs/images');
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const username = `readme${suffix}`;

mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

try {
  await page.goto(baseUrl);
  await page.getByRole('heading', { name: 'Willkommen zurück' }).waitFor();
  await page.screenshot({ path: resolve(outputDirectory, 'auth-login.png'), fullPage: true });

  await page.getByRole('button', { name: 'Noch kein Konto? Registrieren' }).click();
  await page.getByLabel('Benutzername').fill(username);
  await page.getByLabel('E-Mail').fill(`${username}@example.test`);
  await page.getByLabel('Passwort').fill(`ReadmePass!${suffix}`);
  await page.getByRole('button', { name: 'Registrieren', exact: true }).click();
  await page.getByRole('heading', { name: 'Bereit für den nächsten Zug?' }).waitFor();
  await page.screenshot({ path: resolve(outputDirectory, 'dashboard-lobby.png'), fullPage: true });

  await page.getByRole('button', { name: /Freunde/ }).click();
  await page.getByRole('heading', { name: 'Deine Freunde' }).waitFor();
  await page.screenshot({
    path: resolve(outputDirectory, 'dashboard-friends.png'),
    fullPage: true,
  });

  await page.getByRole('button', { name: /Lobby/ }).click();
  await page
    .getByRole('button', { name: /Partie erstellen/ })
    .first()
    .click();
  await page.getByRole('heading', { name: 'Am Brett' }).waitFor();
  await page.screenshot({ path: resolve(outputDirectory, 'game-screen.png'), fullPage: true });
} finally {
  await browser.close();
}
