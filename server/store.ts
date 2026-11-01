import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve as pathResolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Campaign, PublicCampaign } from '../src/lib/types';
export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(pathResolve(path)), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES sessions(id),state TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS saves(id TEXT PRIMARY KEY,campaign TEXT NOT NULL REFERENCES campaigns(id),owner TEXT NOT NULL,name TEXT NOT NULL,state TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS requests(id TEXT NOT NULL,campaign TEXT NOT NULL REFERENCES campaigns(id),PRIMARY KEY(id,campaign));`);
  }
  session(id?: string) {
    if (
      id &&
      /^[a-f0-9-]{36}$/.test(id) &&
      this.db.prepare('SELECT id FROM sessions WHERE id=?').get(id)
    )
      return id;
    const fresh = randomUUID();
    this.db.prepare('INSERT INTO sessions VALUES (?,?)').run(fresh, new Date().toISOString());
    return fresh;
  }
  list(owner: string) {
    return (
      this.db
        .prepare('SELECT state FROM campaigns WHERE owner=? ORDER BY updated_at DESC')
        .all(owner) as { state: string }[]
    ).map((r) => {
      const c = JSON.parse(r.state) as Campaign;
      return {
        id: c.id,
        name: c.hero.name,
        classId: c.hero.classId,
        level: c.hero.level,
        location: c.world.location,
        portrait: c.hero.portrait,
        updatedAt: c.updatedAt,
      };
    });
  }
  create(owner: string, c: Campaign) {
    this.db
      .prepare('INSERT INTO campaigns VALUES (?,?,?,?)')
      .run(c.id, owner, JSON.stringify(c), c.updatedAt);
  }
  get(owner: string, id: string) {
    const r = this.db
      .prepare('SELECT state FROM campaigns WHERE id=? AND owner=?')
      .get(id, owner) as { state: string } | undefined;
    if (!r) throw new Error('Кампания не найдена или недоступна.');
    return JSON.parse(r.state) as Campaign;
  }
  transaction(
    owner: string,
    id: string,
    version: number,
    requestId: string,
    mutate: (c: Campaign) => void,
  ) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const c = this.get(owner, id);
      if (this.db.prepare('SELECT id FROM requests WHERE id=? AND campaign=?').get(requestId, id)) {
        this.db.exec('COMMIT');
        return c;
      }
      if (c.version !== version)
        throw new Error('Мир уже изменился. Обновите состояние и повторите действие.');
      mutate(c);
      c.version++;
      c.updatedAt = new Date().toISOString();
      this.db
        .prepare('UPDATE campaigns SET state=?,updated_at=? WHERE id=? AND owner=?')
        .run(JSON.stringify(c), c.updatedAt, id, owner);
      this.db.prepare('INSERT INTO requests VALUES (?,?)').run(requestId, id);
      this.db.exec('COMMIT');
      return c;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  saves(owner: string, id: string) {
    this.get(owner, id);
    return this.db
      .prepare(
        'SELECT id,name,created_at as createdAt FROM saves WHERE campaign=? AND owner=? ORDER BY created_at DESC LIMIT 20',
      )
      .all(id, owner);
  }
  save(owner: string, id: string, name: string) {
    const c = this.get(owner, id);
    const sid = randomUUID();
    this.db
      .prepare('INSERT INTO saves VALUES (?,?,?,?,?,?)')
      .run(sid, id, owner, name, JSON.stringify(c), new Date().toISOString());
    return sid;
  }
  load(owner: string, id: string, saveId: string) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.get(owner, id);
      const r = this.db
        .prepare('SELECT state FROM saves WHERE id=? AND campaign=? AND owner=?')
        .get(saveId, id, owner) as { state: string } | undefined;
      if (!r) throw new Error('Сохранение не найдено.');
      const c = JSON.parse(r.state) as Campaign;
      c.version = current.version + 1;
      c.updatedAt = new Date().toISOString();
      this.db
        .prepare('UPDATE campaigns SET state=?,updated_at=? WHERE id=? AND owner=?')
        .run(JSON.stringify(c), c.updatedAt, id, owner);
      this.db.exec('COMMIT');
      return c;
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
export function publicState(c: Campaign): PublicCampaign {
  const { scheduled: _, cave, npcs, ...world } = c.world;
  return {
    ...c,
    world: {
      ...world,
      npcs: Object.fromEntries(
        Object.entries(npcs).map(([id, n]) => [
          id,
          { relationship: n.relationship, alive: n.alive },
        ]),
      ),
      ...(c.world.visited.includes('cave') && cave ? { cave } : {}),
    },
  };
}
