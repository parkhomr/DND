import express from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { resolve as pathResolve } from 'node:path';
import { existsSync } from 'node:fs';
import { Store, publicState } from './store';
import type { Intent } from '../src/lib/types';
import { createCampaign, event } from './rules';
import { resolve } from './engine';
import { characterSchema, commandSchema } from './schemas';
import { createProvider, OpenAIProvider, type AIProvider } from './ai';
import { interpretDemo } from './interpreter';
export function createApp(store: Store, provider: AIProvider = createProvider()) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '12kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    if (
      req.method !== 'GET' &&
      req.headers.origin &&
      req.headers.origin !== `${req.protocol}://${req.headers.host}` &&
      !/^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(req.headers.origin)
    ) {
      res.status(403).json({ error: 'Запрос с другого сайта отклонён.' });
      return;
    }
    next();
  });
  app.use('/api', (req, res, next) => {
    const cookies = Object.fromEntries(
      (req.headers.cookie ?? '').split(';').map((s) => s.trim().split('=')),
    );
    const sid = store.session(cookies.lr_session);
    res.locals.owner = sid;
    if (sid !== cookies.lr_session)
      res.cookie('lr_session', sid, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.COOKIE_SECURE === 'true',
        maxAge: 365 * 86400000,
        path: '/',
      });
    next();
  });
  const limits = new Map<string, { count: number; reset: number }>();
  app.use('/api', (req, res, next) => {
    const key = res.locals.owner as string;
    const now = Date.now();
    let entry = limits.get(key);
    if (!entry || entry.reset < now) {
      entry = { count: 0, reset: now + 60000 };
      limits.set(key, entry);
    }
    entry.count++;
    if (limits.size > 5000) for (const [k, v] of limits) if (v.reset < now) limits.delete(k);
    if (entry.count > 100) {
      res.status(429).json({ error: 'Слишком много действий. Подождите минуту.' });
      return;
    }
    next();
  });
  const busy = new Set<string>();
  app.get('/api/status', (_req, res) =>
    res.json({ provider: provider.status, multiplayer: false }),
  );
  app.get('/api/campaigns', (_req, res) => res.json(store.list(res.locals.owner)));
  app.post('/api/campaigns', (req, res) => {
    const c = createCampaign(characterSchema.parse(req.body));
    store.create(res.locals.owner, c);
    res.status(201).json(publicState(c));
  });
  app.get('/api/campaigns/:id', (req, res) =>
    res.json(publicState(store.get(res.locals.owner, req.params.id))),
  );
  app.post('/api/campaigns/:id/actions', async (req, res) => {
    const body = z
      .object({ version: z.number().int().min(0), requestId: z.uuid(), command: commandSchema })
      .strict()
      .parse(req.body);
    const owner = res.locals.owner as string;
    const id = req.params.id;
    const before = store.get(owner, id);
    if (busy.has(id)) {
      res.status(409).json({ error: 'Предыдущее действие ещё разрешается.' });
      return;
    }
    busy.add(id);
    try {
      let parsed: Intent | undefined;
      let fallback = false;
      if (body.command.type === 'text') {
        try {
          parsed = await provider.interpret(body.command.text, before);
        } catch {
          parsed = interpretDemo(body.command.text, before);
          fallback = true;
        }
      }
      const c = store.transaction(owner, id, body.version, body.requestId, (state) => {
        resolve(
          state,
          body.command,
          parsed,
          undefined,
          provider.status.mode === 'openai' && !fallback,
        );
        if (fallback)
          event(
            state,
            'ИИ временно недоступен. Действие обработано ограниченной симуляцией.',
            'system',
          );
      });
      // Mechanical state is committed before optional prose. Failure cannot discard or duplicate a purchase/roll.
      if (
        body.command.type === 'text' &&
        provider instanceof OpenAIProvider &&
        !fallback &&
        c.version === body.version + 1
      ) {
        try {
          const prose = await provider.dialogue(body.command.text, before, c);
          if (prose) {
            const refreshed = store.transaction(owner, id, c.version, randomUUID(), (state) => {
              const speaker = c.events
                .filter((e) => !before.events.some((old) => old.id === e.id))
                .find((e) => e.kind === 'dialogue')?.speaker;
              event(state, prose, speaker ? 'dialogue' : 'narration', { speaker });
            });
            res.json(publicState(refreshed));
            return;
          }
        } catch {
          /* Keep already committed authored narration. */
        }
      }
      res.json(publicState(c));
    } finally {
      busy.delete(id);
    }
  });
  app.get('/api/campaigns/:id/saves', (req, res) =>
    res.json(store.saves(res.locals.owner, req.params.id)),
  );
  app.post('/api/campaigns/:id/saves', (req, res) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(60) })
      .strict()
      .parse(req.body);
    res.status(201).json({ id: store.save(res.locals.owner, req.params.id, name) });
  });
  app.post('/api/campaigns/:id/load', (req, res) => {
    const { saveId } = z.object({ saveId: z.uuid() }).strict().parse(req.body);
    if (busy.has(req.params.id)) {
      res.status(409).json({ error: 'Дождитесь завершения действия.' });
      return;
    }
    res.json(publicState(store.load(res.locals.owner, req.params.id, saveId)));
  });
  app.get('/api/campaigns/:id/export', (req, res) => {
    const c = publicState(store.get(res.locals.owner, req.params.id));
    res.attachment(`veyr-${c.id}.json`).json(c);
  });
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Неизвестный путь.' }));
  if (existsSync(pathResolve('dist/index.html'))) {
    app.use(express.static(pathResolve('dist')));
    app.get('/{*path}', (_req, res) => res.sendFile(pathResolve('dist/index.html')));
  }
  app.use(
    (err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      const message =
        err instanceof z.ZodError
          ? 'Проверьте введённые данные.'
          : err instanceof Error
            ? err.message
            : 'Действие не удалось.';
      const safe =
        message.includes('SQLITE') || message.includes('fetch')
          ? 'Сервер не смог сохранить действие. Попробуйте снова.'
          : message;
      res
        .status(
          message.includes('не найдена') ? 404 : message.includes('уже изменился') ? 409 : 400,
        )
        .json({ error: safe });
    },
  );
  return app;
}
