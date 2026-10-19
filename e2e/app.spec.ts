import { readFile } from 'node:fs/promises';
import { expect, test as base } from '@playwright/test';
import type { Page } from '@playwright/test';

const DATA_KEY = 'lendulet-data-v1';
const DRAFT_KEY = 'lendulet-workout-v1';

const test = base.extend<{ browserErrors: string[] }>({
  browserErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await use(errors);
    expect(errors, 'No browser runtime or console errors').toEqual([]);
  }, { auto: true }],
});

async function navigate(page: Page, name: string) {
  const mobile = page.getByRole('navigation', { name: 'Mobil navigáció' });
  const desktop = page.getByRole('navigation', { name: 'Fő navigáció' });
  await (await mobile.isVisible() ? mobile : desktop).getByRole('button', { name, exact: true }).click();
}

async function openSettings(page: Page) {
  const mobile = page.getByRole('button', { name: 'Profil és beállítások', exact: true });
  await (await mobile.isVisible() ? mobile : page.getByRole('button', { name: 'Beállítások', exact: true })).click();
  return page.getByRole('dialog', { name: 'A te beállításaid' });
}

async function begin(page: Page) {
  await page.getByRole('button', { name: 'Nézzük a mai edzést', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A mai edzésed', exact: true })).toBeVisible();
}

async function addSquatSet(page: Page, reps = '8') {
  await page.getByRole('spinbutton', { name: 'Guggolás ismétlés', exact: true }).fill(reps);
  await page.getByRole('spinbutton', { name: 'Guggolás plusz súly', exact: true }).fill('5');
  await page.getByRole('combobox', { name: 'Guggolás ismétléstartalék', exact: true }).selectOption('2');
  await page.getByRole('button', { name: 'Guggolás sorozat rögzítése', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Minden edzés számít.' })).toBeVisible();
});

test('overview is responsive, defaults are correct, and the guide opens', async ({ page }, testInfo) => {
  await expect(page.getByRole('heading', { name: 'Ma magadért mozdulsz.' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('overview.png'), fullPage: true });
  const modal = await openSettings(page);
  await expect(modal.getByLabel('Az elsődleges célod')).toHaveValue('strength');
  await expect(modal.getByLabel('Tapasztalat')).toHaveValue('intermediate');
  await expect(modal.getByLabel('Erősítések hetente')).toHaveValue('3');
  await modal.getByRole('button', { name: 'Ablak bezárása' }).click();
  const guideOpened = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Tudomány és útmutató' }).click();
  const guide = await guideOpened;
  await expect(guide.getByRole('heading', { name: /Értsd a terhelést/ })).toBeVisible();
  expect(guide.url()).toBe(new URL('tudomany.html', page.url()).href);
  expect(await guide.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await guide.getByRole('link', { name: 'Az edzésemhez' }).click();
  await expect(guide.getByRole('heading', { name: 'Minden edzés számít.' })).toBeVisible();
  expect(guide.url()).toBe(page.url());
  await guide.close();
});

test('an unfinished session and its timer survive reload; pain pauses recording; strength is saved', async ({ page }) => {
  await begin(page);
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.entries.length, DRAFT_KEY)).toBeGreaterThan(0);
  await page.reload();
  await page.getByRole('button', { name: 'Edzés folytatása', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A mai edzésed', exact: true })).toBeVisible();

  const pain = page.getByRole('checkbox', { name: 'Fájdalmat érzek mozgás közben' });
  await pain.check();
  await expect(page.getByRole('button', { name: 'Guggolás sorozat rögzítése', exact: true })).toBeDisabled();
  await expect(page.getByText('Most állj meg a fájdalmas mozgással.', { exact: true })).toBeVisible();
  await pain.uncheck();
  await addSquatSet(page);
  await expect(page.getByRole('timer', { name: 'Pihenőidőzítő' })).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null')?.entries[0].sets.length, DRAFT_KEY)).toBe(1);
  const restEnd = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).restEnd as number, DRAFT_KEY);
  await page.reload();
  await page.getByRole('button', { name: 'Edzés folytatása', exact: true }).click();
  await expect(page.getByRole('timer', { name: 'Pihenőidőzítő' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).restEnd as number, DRAFT_KEY)).toBe(restEnd);
  await page.getByRole('button', { name: '+30 mp', exact: true }).click();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).restEnd as number, DRAFT_KEY)).toBe(restEnd + 30_000);
  await page.getByRole('button', { name: 'Pihenő lezárása', exact: true }).click();
  await addSquatSet(page, '7');
  await page.getByRole('button', { name: 'Pihenő lezárása', exact: true }).click();
  await page.getByPlaceholder('Mi ment jól? Milyen változatot végeztél?').fill('Kontrollált guggolás, stabil technika.');
  await page.getByRole('button', { name: 'Edzés befejezése', exact: true }).click();
  const row = page.getByRole('button', { name: /Kondipark · teljes test/ });
  await expect(row).toContainText('2 sorozat');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), DRAFT_KEY)).toBe(null);
  await page.reload();
  await navigate(page, 'Napló');
  await page.getByRole('button', { name: /Kondipark · teljes test/ }).click();
  const detail = page.getByRole('dialog', { name: 'Ez is a fejlődésed része.' });
  await expect(detail).toContainText('1. sorozat: 8 ism. · +5 kg · 2 RIR');
  await expect(detail).toContainText('2. sorozat: 7 ism. · +5 kg · 2 RIR');
  await expect(detail).toContainText('Kontrollált guggolás, stabil technika.');
});

test('cardio sport choice, saved values, reload and deletion work', async ({ page }) => {
  await page.getByRole('button', { name: /^Úszás Kikapcsolás/ }).click();
  const modal = page.getByRole('dialog', { name: 'Egy újabb jó mozdulat.' });
  await expect(modal.getByRole('button', { name: 'Úszás', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await modal.getByLabel('Időtartam (perc)').fill('42');
  await modal.getByLabel('Távolság (km)').fill('1.2');
  await modal.getByRole('slider').focus();
  await modal.getByRole('slider').press('ArrowRight');
  await modal.getByLabel('Megjegyzés').fill('Könnyű technikai úszás.');
  await modal.getByRole('button', { name: 'Aktivitás mentése', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Úszás/ })).toContainText('42');
  await page.reload();
  await navigate(page, 'Napló');
  await page.getByRole('button', { name: /^Úszás/ }).click();
  const detail = page.getByRole('dialog', { name: 'Ez is a fejlődésed része.' });
  await expect(detail).toContainText('1,2 km · Nehézség: 5/10 RPE');
  await expect(detail).toContainText('Könnyű technikai úszás.');
  page.once('dialog', dialog => dialog.accept());
  await detail.getByRole('button', { name: 'Bejegyzés törlése' }).click();
  await expect(page.getByRole('heading', { name: 'Itt kezdődik a történeted.' })).toBeVisible();
  await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).cardio.length, DATA_KEY)).toBe(0);
});

test('settings persist and exported backups are validated before restoration', async ({ page }) => {
  let modal = await openSettings(page);
  await modal.getByLabel('Hogy szólíthatunk?').fill('Dóri');
  await modal.getByLabel('Az elsődleges célod').selectOption('muscle');
  await modal.getByLabel('Tapasztalat').selectOption('beginner');
  await modal.getByLabel('Erősítések hetente').selectOption('2');
  await modal.getByRole('button', { name: 'Beállítások mentése' }).click();
  await expect(page.getByRole('heading', { name: 'Szia, Dóri!' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Szia, Dóri!' })).toBeVisible();
  modal = await openSettings(page);
  await expect(modal.getByLabel('Az elsődleges célod')).toHaveValue('muscle');
  await expect(modal.getByLabel('Tapasztalat')).toHaveValue('beginner');

  const downloaded = page.waitForEvent('download');
  await modal.getByRole('button', { name: 'Mentés letöltése' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^lendulet-\d{4}-\d{2}-\d{2}\.json$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const backup = JSON.parse(await readFile(filePath!, 'utf8'));
  expect(backup.profile).toEqual({ name: 'Dóri', goal: 'muscle', level: 'beginner', daysPerWeek: 2 });

  const input = modal.locator('input[type=file]');
  await input.setInputFiles({ name: 'hibas.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...backup, version: 999 })) });
  await expect(page.getByRole('status')).toContainText('Nem támogatott mentési formátum');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).profile.name, DATA_KEY)).toBe('Dóri');
  backup.profile.name = 'Visszaállított napló';
  page.once('dialog', dialog => dialog.accept());
  await input.setInputFiles({ name: 'mentes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
  await expect(page.getByRole('status')).toContainText('A biztonsági mentést visszaállítottuk.');
  await modal.getByRole('button', { name: 'Ablak bezárása' }).click();
  await expect(page.getByRole('heading', { name: 'Szia, Visszaállított napló!' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Szia, Visszaállított napló!' })).toBeVisible();
});

test('damaged stored data is preserved until a valid backup is restored', async ({ page }) => {
  const valid = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), DATA_KEY);
  valid.profile.name = 'Helyreállítva';
  const damaged = JSON.stringify({ ...valid, workouts: [{ id: 'incomplete-record' }] });
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: DATA_KEY, value: damaged });
  await page.reload();
  await expect(page.getByText(/Egy erősítő edzés adatai hibásak/)).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), DATA_KEY)).toBe(damaged);

  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tárolt adatok letöltése' }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('lendulet-helyreallitas.json');
  const filePath = await download.path();
  expect(await readFile(filePath!, 'utf8')).toBe(damaged);

  const modal = await openSettings(page);
  page.once('dialog', dialog => dialog.accept());
  await modal.locator('input[type=file]').setInputFiles({ name: 'mentes.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(valid)) });
  await expect(page.getByRole('status')).toContainText('A biztonsági mentést visszaállítottuk.');
  await modal.getByRole('button', { name: 'Ablak bezárása' }).click();
  await expect(page.getByText(/Egy erősítő edzés adatai hibásak/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Szia, Helyreállítva!' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).profile.name, DATA_KEY)).toBe('Helyreállítva');
});

test('real logged sets populate the progress chart and the complete current week', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-21T12:00:00.000Z') });
  await page.reload();
  await begin(page);
  await page.getByRole('spinbutton', { name: 'Fekvőtámasz ismétlés', exact: true }).fill('8');
  await page.getByRole('button', { name: 'Fekvőtámasz sorozat rögzítése', exact: true }).click();
  await page.getByRole('button', { name: 'Pihenő lezárása', exact: true }).click();
  await page.getByRole('button', { name: 'Edzés befejezése', exact: true }).click();
  await navigate(page, 'Fejlődés');
  await expect(page.getByRole('img', { name: 'Fekvőtámasz maximális ismétlései az utolsó 1 edzésen: 8', exact: true })).toBeVisible();
  await expect(page.locator('.bar-chart > div').last()).toContainText('1 p');
  await expect(page.locator('.load-value')).toContainText('6');
});

test('production service worker allows reload, guide and new sessions while offline', async ({ page, context }) => {
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Minden edzés számít.' })).toBeVisible();
  await page.getByRole('button', { name: /^Futás Egy könnyű kör/ }).click();
  const modal = page.getByRole('dialog', { name: 'Egy újabb jó mozdulat.' });
  await modal.getByLabel('Időtartam (perc)').fill('25');
  await modal.getByRole('button', { name: 'Aktivitás mentése', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Futás/ })).toContainText('25');
  await page.reload();
  await navigate(page, 'Napló');
  await expect(page.getByRole('button', { name: /^Futás/ })).toContainText('25');
  await page.goto('tudomany.html');
  await expect(page.getByRole('heading', { name: /Értsd a terhelést/ })).toBeVisible();
  await context.setOffline(false);
});
