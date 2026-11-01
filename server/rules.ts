import { randomInt, randomUUID, createHash } from 'node:crypto';
import { CLASSES, ITEMS, LOCATIONS, NPCS } from '../src/lib/content';
import { modifier, ru } from '../src/lib/i18n';
import type {
  Attribute,
  Campaign,
  CharacterInput,
  GameEvent,
  Hero,
  LocationId,
  Roll,
  Tile,
} from '../src/lib/types';
export type Random = (min: number, max: number) => number;
export const secureRandom: Random = (min, max) => randomInt(min, max + 1);
export function dice(
  sides: number,
  label: string,
  mod = 0,
  dc?: number,
  mode: Roll['mode'] = 'normal',
  rng: Random = secureRandom,
): Roll {
  if (![4, 6, 8, 10, 12, 20].includes(sides)) throw new Error('Недопустимая кость.');
  const rolls = Array.from({ length: mode === 'normal' ? 1 : 2 }, () => rng(1, sides));
  const kept =
    mode === 'advantage'
      ? Math.max(...rolls)
      : mode === 'disadvantage'
        ? Math.min(...rolls)
        : rolls[0];
  return {
    sides,
    rolls,
    kept,
    modifier: mod,
    total: kept + mod,
    dc,
    success: dc === undefined ? undefined : kept + mod >= dc,
    label,
    mode,
  };
}
export function event(
  c: Campaign,
  text: string,
  kind: GameEvent['kind'] = 'narration',
  extra: Partial<GameEvent> = {},
) {
  c.events.push({ id: randomUUID(), kind, text, time: c.world.tick, ...extra });
}
export function check(
  c: Campaign,
  attribute: Attribute,
  dc: number,
  label: string,
  rng: Random = secureRandom,
  adv = false,
) {
  const bonus =
    modifier(c.hero.attributes[attribute]) +
    (attribute === 'wis' && c.hero.equipment.charm === 'charm' ? 1 : 0);
  const proficient =
    (c.hero.classId === 'rogue' && attribute === 'dex') ||
    (c.hero.classId === 'mage' && attribute === 'int') ||
    (c.hero.classId === 'warden' && attribute === 'wis') ||
    (c.hero.classId === 'warrior' && attribute === 'str');
  return dice(
    20,
    label,
    bonus + (proficient ? 2 : 0),
    dc,
    adv ? 'advantage' : c.hero.conditions.includes('Дым в глазах') ? 'disadvantage' : 'normal',
    rng,
  );
}
export function savingThrow(
  c: Campaign,
  attribute: Attribute,
  dc: number,
  label: string,
  rng: Random = secureRandom,
) {
  const proficiencies: Record<string, Attribute[]> = {
    warrior: ['str', 'con'],
    rogue: ['dex', 'int'],
    mage: ['int', 'wis'],
    warden: ['wis', 'cha'],
  };
  const bonus =
    modifier(c.hero.attributes[attribute]) +
    (proficiencies[c.hero.classId].includes(attribute) ? 2 : 0);
  return dice(20, label, bonus, dc, 'normal', rng);
}
export function armorClass(h: Hero) {
  const item = ITEMS[h.equipment.armor];
  return (
    (item?.ac ?? 10) +
    (item?.id === 'chain'
      ? 0
      : Math.min(modifier(h.attributes.dex), item?.id === 'leather' ? 2 : 10))
  );
}
export function gainItem(c: Campaign, id: string, amount = 1) {
  if (!Object.hasOwn(ITEMS, id)) throw new Error('Неизвестный предмет.');
  c.hero.inventory[id] = (c.hero.inventory[id] ?? 0) + amount;
}
export function takeItem(c: Campaign, id: string) {
  if (!(c.hero.inventory[id] > 0)) throw new Error('У вас нет этого предмета.');
  c.hero.inventory[id]--;
  if (!c.hero.inventory[id]) delete c.hero.inventory[id];
}
export function xp(c: Campaign, amount: number) {
  c.hero.xp += amount;
  while (c.hero.level < 10 && c.hero.xp >= c.hero.level * 100) {
    c.hero.xp -= c.hero.level * 100;
    c.hero.level++;
    const hp = 5 + modifier(c.hero.attributes.con);
    c.hero.maxHp += hp;
    c.hero.hp = Math.min(c.hero.maxHp, c.hero.hp + hp);
    c.hero.maxMana += 1;
    c.hero.mana = c.hero.maxMana;
    event(c, `Новый уровень: ${c.hero.level}. Здоровье +${hp}. Запас сил восстановлен.`, 'system');
  }
}
export function completeQuest(
  c: Campaign,
  id: string,
  text: string,
  gold: number,
  rewardXp: number,
) {
  const q = c.world.quests.find((q) => q.id === id);
  if (!q || q.status === 'completed' || q.status === 'failed') return false;
  q.status = 'completed';
  c.hero.gold += gold;
  xp(c, rewardXp);
  c.world.facts.push(text);
  event(c, `${text} Награда: ${gold} монет, ${rewardXp} опыта.`, 'system');
  return true;
}
export function generateLayout(seed: string): Tile[] {
  const bytes = createHash('sha256').update(seed).digest();
  const tiles: Tile[] = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 12; x++) {
      const border = x === 0 || y === 0 || x === 11 || y === 7;
      const corridor = y === 4 || x === 2 || x === 9;
      const n = bytes[(x + y * 12) % 32];
      tiles.push({
        x,
        y,
        type: border
          ? 'wall'
          : corridor
            ? 'floor'
            : n % 9 === 0
              ? 'wall'
              : n % 11 === 0
                ? 'rubble'
                : n % 13 === 0
                  ? 'water'
                  : 'floor',
      });
    }
  return tiles;
}
export function createCampaign(input: CharacterInput): Campaign {
  const archetype = CLASSES[input.classId];
  const attributes = { ...archetype.stats };
  attributes[input.focus] = Math.min(18, attributes[input.focus] + 1);
  if (input.ancestry === 'Камнерождённый') attributes.con++;
  if (input.ancestry === 'Сумеречный эльф') attributes.dex++;
  if (input.ancestry === 'Полурослик') attributes.cha++;
  if (input.ancestry === 'Человек') attributes.wis++;
  const c: Campaign = {
    id: randomUUID(),
    version: 0,
    hero: {
      ...input,
      attributes,
      hp: archetype.hp,
      maxHp: archetype.hp,
      mana: archetype.mana,
      maxMana: archetype.mana,
      gold: 45,
      xp: 0,
      level: 1,
      inventory: { [archetype.weapon]: 1, [archetype.armor]: 1, potion: 2, bread: 2, letter: 1 },
      equipment: { weapon: archetype.weapon, armor: archetype.armor, charm: '' },
      conditions: [],
    },
    world: {
      tick: 0,
      day: 1,
      location: 'tavern',
      visited: ['tavern'],
      discovered: [],
      facts: [],
      flags: {},
      npcs: Object.fromEntries(
        Object.keys(NPCS).map((id) => [id, { relationship: 0, memories: [], alive: true }]),
      ),
      factions: [
        {
          id: 'court',
          name: 'Пепельный двор',
          reputation: 0,
          progress: 15,
          goal: 'Удержать власть и скрыть источник звона',
        },
        {
          id: 'threads',
          name: 'Серые нити',
          reputation: 0,
          progress: 10,
          goal: 'Освободить заключённого звонаря',
        },
        {
          id: 'merchants',
          name: 'Медный союз',
          reputation: 0,
          progress: 25,
          goal: 'Добиться отмены хлебного налога',
        },
        {
          id: 'flame',
          name: 'Орден тихого пламени',
          reputation: 0,
          progress: 5,
          goal: 'Запечатать то, что проснулось под городом',
        },
        {
          id: 'mercenaries',
          name: 'Рота сломанного обета',
          reputation: 0,
          progress: 20,
          goal: 'Вернуть знамя из северной крепости',
        },
        { id: 'choir', name: 'Хор под камнем', reputation: 0, progress: 0, goal: 'Неизвестно' },
      ],
      quests: [
        {
          id: 'bell',
          title: 'Колокол под землёй',
          description:
            'Сегодня Вейр услышал три удара. Колоколов в городе нет уже семь лет. Незнакомка у окна, кажется, знает больше.',
          status: 'rumor',
          objective: 'Поговорите с Ивой в таверне.',
        },
        {
          id: 'prisoner',
          title: 'До первого рассвета',
          description:
            'На площади строят эшафот. Серые нити ищут человека, который умеет задавать неудобные вопросы.',
          status: 'rumor',
          objective: 'Найдите Сыча на площади.',
        },
        {
          id: 'daughter',
          title: 'Там, где не стынет хлеб',
          description: 'Лесной проводник каждую ночь возвращается к пустой деревне. Кого он ищет?',
          status: 'rumor',
          objective: 'Поговорите с Ореном в Чернолесье.',
        },
      ],
      stock: {
        potion: 8,
        ether: 5,
        bread: 12,
        sword: 2,
        dagger: 3,
        leather: 2,
        chain: 1,
        charm: 1,
      },
      destroyed: [],
      cave: null,
      scheduled: [
        { at: 60, id: 'tax', done: false },
        { at: 150, id: 'prison', done: false },
        { at: 240, id: 'bell', done: false },
      ],
      wanted: 0,
    },
    events: [],
    combat: null,
    summary: 'Путник прибыл в Вейр в ночь подземного звона.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  event(
    c,
    'Три удара. Один — под мостом. Второй — под вашими ногами. Третий вы почувствовали в груди. А потом город снова сделал вид, что ничего не случилось.',
  );
  event(
    c,
    `Вы толкаете тяжёлую дверь «Последнего уголька». Дождь остаётся снаружи. У окна сидит девушка с чёрной нитью на запястье. На вашем столе уже лежит письмо. Без подписи. Без адреса. С вашим именем: ${input.name}.`,
  );
  event(
    c,
    'Куда идти и кому верить — решаете вы. Нажимайте на метки в сцене или опишите своё действие внизу. Игра сохраняется автоматически.',
    'system',
  );
  return c;
}
export function advanceTime(c: Campaign, minutes: number) {
  const before = c.world.tick;
  c.world.tick += minutes;
  c.world.day = 1 + Math.floor((c.world.tick + 1200) / 1440);
  for (const f of c.world.factions)
    f.progress = Math.min(
      100,
      f.progress + Math.floor(c.world.tick / 30) - Math.floor(before / 30),
    );
  for (const scheduled of c.world.scheduled) {
    if (scheduled.done || scheduled.at > c.world.tick) continue;
    scheduled.done = true;
    if (scheduled.id === 'tax') {
      c.world.flags.tax = true;
      c.world.facts.push('Медный союз объявил забастовку из-за хлебного налога.');
      event(
        c,
        'Слух с площади: Медный союз объявил забастовку. Хлеб на рынке подорожал. Двор стягивает стражу к мостам.',
        'system',
      );
    }
    if (scheduled.id === 'prison' && !c.world.flags.prisonerSaved) {
      const q = c.world.quests.find((q) => q.id === 'prisoner')!;
      q.status = 'failed';
      c.world.flags.prisonerMoved = true;
      c.world.facts.push('Звонаря перевели из городской тюрьмы в крепость.');
      event(
        c,
        'Время не ждёт. Заключённого звонаря перевезли в северную крепость. План Серых нитей сорван, но он ещё жив.',
        'system',
      );
    }
    if (scheduled.id === 'bell' && !c.world.flags.bellSealed) {
      c.world.facts.push('Из-под земли снова донеслись три удара.');
      event(
        c,
        'Снова три удара. В окнах гаснут свечи. В Тихом Броде зажигаются огни, а Орден объявляет ночь без сна.',
        'system',
      );
    }
  }
  if (c.world.flags.ownsTavern && Math.floor(c.world.tick / 120) > Math.floor(before / 120)) {
    const earned = 10 * (Math.floor(c.world.tick / 120) - Math.floor(before / 120));
    c.hero.gold += earned;
    event(c, `Ваша таверна принесла ${earned} монет дохода.`, 'system');
  }
  if (c.events.length > 200) {
    const removed = c.events.splice(0, c.events.length - 150);
    c.summary = [c.summary, ...removed.filter((e) => e.kind === 'system').map((e) => e.text)]
      .join(' ')
      .slice(-3500);
  }
}
export function remember(c: Campaign, npcId: string, memory: string) {
  const n = c.world.npcs[npcId];
  if (n && !n.memories.includes(memory)) n.memories = [...n.memories, memory].slice(-12);
}
export function crime(c: Campaign, description: string, severity = 1) {
  const witnesses = LOCATIONS[c.world.location].npcs.filter((id) => c.world.npcs[id].alive);
  c.world.facts.push(description);
  if (!witnesses.length) return;
  c.world.wanted += severity;
  for (const id of witnesses) {
    remember(c, id, description);
    c.world.npcs[id].relationship -= severity * 10;
  }
  const f = c.world.factions.find((f) => f.id === 'court')!;
  f.reputation -= severity * 5;
}
export function describeLocation(c: Campaign, id: LocationId) {
  return c.world.destroyed.includes(id)
    ? `${LOCATIONS[id].name}: обугленные балки и холодная зола. Здесь помнят устроенный вами пожар.`
    : LOCATIONS[id].description;
}
