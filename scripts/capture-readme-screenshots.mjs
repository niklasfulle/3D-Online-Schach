import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { chromium } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const apiUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:3001';
const outputDirectory = resolve('docs/images');
const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const username = `readme${suffix}`;

mkdirSync(outputDirectory, { recursive: true });

const browser = await chromium.launch({
  headless: process.env.README_HEADED !== '1',
  args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const fontErrors = [];
page.on('console', (message) => {
  if (message.text().includes('Failure loading font')) fontErrors.push(message.text());
});

try {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() => localStorage.setItem('chess3d.theme', 'dark'));
  await page.goto(baseUrl);
  await page.locator('[data-theme="dark"]').first().waitFor();
  await page.getByRole('heading', { name: 'Willkommen zurück' }).waitFor();
  await page.screenshot({ path: resolve(outputDirectory, 'auth-login.png'), fullPage: true });

  const registration = await page.request.post(`${apiUrl}/auth/register`, {
    data: {
      username,
      email: `${username}@example.test`,
      password: `ReadmePass!${suffix}`,
    },
  });
  if (!registration.ok()) throw new Error(`Registrierung fehlgeschlagen: HTTP ${registration.status()}`);
  await page.reload();
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
    .getByRole('button', { name: /Casual-Spiel erstellen/ })
    .first()
    .click();
  await page.getByRole('heading', { name: 'Am Brett' }).waitFor();
  await page.locator('canvas').waitFor({ state: 'visible' });
  await page.waitForTimeout(6000);
  if (fontErrors.length > 0) throw new Error(fontErrors.join('\n'));
  await page.screenshot({ path: resolve(outputDirectory, 'game-screen.png'), fullPage: true });
} finally {
  await browser.close();
}
