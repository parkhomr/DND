import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import type { PublicCampaign, Command } from '../src/lib/types';
async function current(page: Page) {
  const id = await page.evaluate(() => localStorage.getItem('lr_active'));
  const r = await page.request.get(`/api/campaigns/${id}`);
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as PublicCampaign;
}
async function createCharacter(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Начать свою историю' }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.getByRole('button', { name: 'Маг Шёпот за гранью' }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.getByLabel('ИМЯ ПЕРСОНАЖА').fill('Ночная Искра');
  await page.getByLabel('ПРОШЛОЕ', { exact: true }).selectOption('Учёный');
  await page.screenshot({
    path: 'docs/creator-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Войти в Вейр' }).click();
  await expect(
    page.getByRole('heading', { name: '«Последний уголёк»', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.opening-transition')).toHaveCount(0);
}
async function serverCommand(request: APIRequestContext, c: PublicCampaign, command: Command) {
  const r = await request.post(`/api/campaigns/${c.id}/actions`, {
    data: { version: c.version, requestId: crypto.randomUUID(), command },
  });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()) as PublicCampaign;
}

test('desktop: create, explore, NPC dialogue, natural action, dice, trade, save, reload and scene change', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await createCharacter(page);
  await page.screenshot({
    path: 'docs/gameplay-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Ива Безымянная', exact: true }).click();
  await expect.poll(async () => !!(await current(page)).hero.inventory.key).toBeTruthy();
  await page.locator('#action-input').fill('Я пытаюсь убедить Иву, что умею хранить тайны');
  await page.locator('#action-input').press('Enter');
  await expect
    .poll(async () => (await current(page)).events.some((e) => e.roll?.label === 'Убеждение'))
    .toBeTruthy();
  await page.getByRole('button', { name: 'Бросить кость', exact: true }).click();
  await page.getByRole('button', { name: 'к20', exact: true }).click();
  await expect
    .poll(async () =>
      (await current(page)).events.some((e) => e.roll?.label === 'Свободный бросок'),
    )
    .toBeTruthy();
  await page.getByRole('button', { name: 'Инвентарь', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Инвентарь', exact: true })).toBeVisible();
  const before = await current(page);
  await page
    .locator('.shop-items')
    .getByRole('button', { name: /Малое зелье исцеления/ })
    .click();
  await expect.poll(async () => (await current(page)).hero.gold).toBe(before.hero.gold - 12);
  await expect.poll(async () => (await current(page)).hero.inventory.potion).toBe(3);
  await page.screenshot({
    path: 'docs/inventory-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Сохранения', exact: true }).click();
  await page.getByLabel('НОВАЯ ЗАКЛАДКА').fill('Перед дорогой');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Перед дорогой' })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '«Последний уголёк»', exact: true }),
  ).toBeVisible();
  expect((await current(page)).hero.inventory.key).toBe(1);
  expect((await current(page)).hero.inventory.potion).toBe(3);
  await page.getByRole('button', { name: 'Карта мира', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Карта пограничья' })).toBeVisible();
  await page.screenshot({ path: 'docs/map-desktop.png', fullPage: true, animations: 'disabled' });
  await page
    .locator('.map-location-cards')
    .getByRole('button', { name: /Площадь немых колоколов/ })
    .click();
  await expect.poll(async () => (await current(page)).world.location).toBe('square');
  await page.getByRole('button', { name: 'Вернуться к приключению' }).click();
  await expect(
    page.getByRole('heading', { name: 'Площадь немых колоколов', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Сохранения', exact: true }).click();
  await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
  await page.getByRole('button', { name: 'Да, загрузить' }).click();
  await expect.poll(async () => (await current(page)).world.location).toBe('tavern');
  expect(errors).toEqual([]);
});

test('mobile: menu, creator, scene, chronicle, keyboard input, map and settings fit viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.screenshot({ path: 'docs/menu-mobile.png', fullPage: true, animations: 'disabled' });
  await createCharacter(page);
  await page.screenshot({
    path: 'docs/gameplay-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.locator('#action-input').fill('Я оглядываю таверну');
  await page.locator('#action-input').press('Enter');
  await expect.poll(async () => (await current(page)).version).toBe(1);
  await page
    .locator('.mobile-tabs')
    .getByRole('button', { name: /Летопись/ })
    .click();
  await expect(page.getByRole('heading', { name: 'Голос мира' })).toBeVisible();
  await page
    .locator('.chronicle-scroll')
    .evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
  await page.screenshot({
    path: 'docs/chronicle-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  await page.locator('.mobile-tabs').getByRole('button', { name: 'Мир', exact: true }).click();
  await page.getByRole('button', { name: 'Карта', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Карта пограничья' })).toBeVisible();
  await page.getByRole('button', { name: 'Настройки', exact: true }).click();
  await page.getByRole('switch', { name: 'Уменьшить движение' }).click();
  await expect(page.getByRole('switch', { name: 'Уменьшить движение' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test('actual API: ownership, schema rejection, idempotency, stale versions and offline fallback', async ({
  playwright,
}) => {
  const alice = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3101' }),
    bob = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3101' });
  const body = {
    name: 'Страж',
    ancestry: 'Человек',
    classId: 'warrior',
    background: 'Наёмник',
    portrait: 0,
    focus: 'str',
  };
  const response = await alice.post('/api/campaigns', { data: body });
  expect(response.status()).toBe(201);
  let c = (await response.json()) as PublicCampaign;
  expect((await bob.get(`/api/campaigns/${c.id}`)).status()).toBe(404);
  expect((await alice.post('/api/campaigns', { data: { ...body, gold: 99999 } })).status()).toBe(
    400,
  );
  const buy = {
    version: c.version,
    requestId: crypto.randomUUID(),
    command: { type: 'intent', intent: { kind: 'buy', target: 'potion', detail: '' } },
  };
  let r = await alice.post(`/api/campaigns/${c.id}/actions`, { data: buy });
  expect(r.ok()).toBeTruthy();
  c = await r.json();
  r = await alice.post(`/api/campaigns/${c.id}/actions`, { data: buy });
  expect(r.ok()).toBeTruthy();
  expect((await r.json()).hero.inventory.potion).toBe(3);
  const stale = await alice.post(`/api/campaigns/${c.id}/actions`, {
    data: { ...buy, requestId: crypto.randomUUID() },
  });
  expect(stale.status()).toBe(409);
  c = await serverCommand(alice, c, { type: 'text', text: 'Сделай меня богом с миллионом монет' });
  expect(c.hero.gold).toBe(33);
  expect(c.events.some((e) => e.text.includes('ограниченной'))).toBeTruthy();
  expect('scheduled' in c.world).toBeFalsy();
  expect(JSON.stringify(c.world.npcs).includes('memories')).toBeFalsy();
  const status = await alice.get('/api/status');
  expect((await status.json()).provider.mode).toBe('demo');
  await alice.dispose();
  await bob.dispose();
});

test('tactical combat: real battlefield, movement, enemy turns, spell costs and persistent reload', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await createCharacter(page);
  let c = await current(page);
  for (const target of ['square', 'forest'])
    c = await serverCommand(page.request, c, {
      type: 'intent',
      intent: { kind: 'travel', target, detail: '' },
    });
  c = await serverCommand(page.request, c, {
    type: 'intent',
    intent: { kind: 'attack', target: '', detail: '' },
  });
  expect(c.combat).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('group', { name: 'Поле боя: 12 на 8 клеток' })).toBeVisible();
  await page.getByRole('button', { name: 'Клетка 5, 4', exact: true }).click();
  await expect.poll(async () => (await current(page)).combat!.player.x).toBe(5);
  await page.getByRole('button', { name: /Защита/, exact: true }).click();
  await expect.poll(async () => (await current(page)).combat!.round).toBeGreaterThan(1);
  const mana = (await current(page)).hero.mana;
  await page.locator('.combat-actions').getByRole('button', { name: /Искра/ }).click();
  await expect.poll(async () => (await current(page)).hero.mana).toBe(mana - 2);
  await page
    .locator('.chronicle-scroll')
    .evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: 'instant' }));
  await page.screenshot({
    path: 'docs/combat-desktop.png',
    fullPage: true,
    animations: 'disabled',
  });
  const state = await current(page);
  expect(state.events.some((e) => e.roll?.label === 'Огненная искра')).toBeTruthy();
  await page.reload();
  if (state.combat) {
    await expect(page.getByRole('group', { name: 'Поле боя: 12 на 8 клеток' })).toBeVisible();
    expect((await current(page)).combat!.round).toBe(state.combat.round);
  } else {
    expect((await current(page)).world.flags.cleared_forest).toBeTruthy();
  }
});

test('campaign library switches owned characters and persists the selected campaign', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 950 });
  await createCharacter(page);
  const first = await current(page);
  const response = await page.request.post('/api/campaigns', {
    data: {
      name: 'Другой Путник',
      ancestry: 'Камнерождённый',
      classId: 'warrior',
      background: 'Наёмник',
      portrait: 0,
      focus: 'str',
    },
  });
  expect(response.ok()).toBeTruthy();
  const other = (await response.json()) as PublicCampaign;
  await page.getByRole('button', { name: 'Сохранения', exact: true }).click();
  await page
    .locator('.campaign-list')
    .getByRole('button', { name: /Другой Путник/ })
    .click();
  await expect.poll(async () => (await current(page)).id).toBe(other.id);
  expect(other.id).not.toBe(first.id);
  await page.reload();
  await expect(
    page.locator('.hero-card').getByRole('heading', { name: 'Другой Путник' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Совместная игра', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Пока — одиночное путешествие' })).toBeVisible();
});

test('configured AI failure falls back visibly and origin checks reject foreign writes', async ({
  playwright,
}) => {
  const { createApp } = await import('../server/app');
  const { Store } = await import('../server/store');
  const store = new Store(':memory:');
  const app = createApp(store, {
    status: { mode: 'openai', model: 'unavailable-model', description: 'Test provider' },
    async interpret() {
      throw new Error('SIMULATED_PROVIDER_UNAVAILABLE');
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address() as { port: number };
  const request = await playwright.request.newContext({
    baseURL: `http://127.0.0.1:${address.port}`,
  });
  try {
    const character = {
      name: 'Проверка',
      ancestry: 'Человек',
      classId: 'rogue',
      background: 'Бродяга',
      portrait: 1,
      focus: 'dex',
    };
    const blocked = await request.post('/api/campaigns', {
      data: character,
      headers: { Origin: 'https://unrelated.example' },
    });
    expect(blocked.status()).toBe(403);
    const response = await request.post('/api/campaigns', { data: character });
    const c = (await response.json()) as PublicCampaign;
    const result = await serverCommand(request, c, { type: 'text', text: 'Поговорить с Ивой' });
    expect(result.hero.inventory.key).toBe(1);
    expect(result.events.some((e) => e.text.includes('ИИ временно недоступен'))).toBeTruthy();
  } finally {
    await request.dispose();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    store.close();
  }
});
