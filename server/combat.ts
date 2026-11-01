import type { Campaign, Intent, Tile } from '../src/lib/types';
import { ITEMS, LOCATIONS, NPCS } from '../src/lib/content';
import { modifier } from '../src/lib/i18n';
import {
  armorClass,
  check,
  completeQuest,
  dice,
  event,
  gainItem,
  generateLayout,
  savingThrow,
  secureRandom,
  xp,
  type Random,
} from './rules';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const open = (tiles: Tile[], x: number, y: number) =>
  tiles.some((t) => t.x === x && t.y === y && t.type !== 'wall' && t.type !== 'water');
export function pathTo(
  tiles: Tile[],
  from: { x: number; y: number },
  to: { x: number; y: number },
  blocked: { x: number; y: number }[] = [],
) {
  const q = [{ ...from, path: [] as { x: number; y: number }[] }];
  const seen = new Set<string>();
  while (q.length) {
    const cur = q.shift()!;
    if (cur.x === to.x && cur.y === to.y) return cur.path;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = cur.x + dx,
        y = cur.y + dy,
        k = `${x},${y}`;
      if (!seen.has(k) && open(tiles, x, y) && !blocked.some((b) => b.x === x && b.y === y)) {
        seen.add(k);
        q.push({ x, y, path: [...cur.path, { x, y }] });
      }
    }
  }
  return null;
}
export function lineOfSight(
  tiles: Tile[],
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  let x = a.x,
    y = a.y;
  const dx = Math.abs(b.x - x),
    dy = -Math.abs(b.y - y),
    sx = x < b.x ? 1 : -1,
    sy = y < b.y ? 1 : -1;
  let err = dx + dy;
  while (x !== b.x || y !== b.y) {
    const e = 2 * err;
    if (e >= dy) {
      err += dy;
      x += sx;
    }
    if (e <= dx) {
      err += dx;
      y += sy;
    }
    if (tiles.find((t) => t.x === x && t.y === y)?.type === 'wall') return false;
  }
  return true;
}
export function startCombat(c: Campaign, rng: Random = secureRandom, targetNpc?: string) {
  if (c.combat) return;
  const loc = c.world.location;
  const hard = ['crypt', 'fortress'].includes(loc);
  const initiative = dice(
    20,
    'Инициатива',
    modifier(c.hero.attributes.dex),
    undefined,
    'normal',
    rng,
  );
  const enemyInit = dice(20, 'Инициатива противника', 1, undefined, 'normal', rng).total;
  c.combat = {
    targetNpc,
    round: 1,
    player: { x: 2, y: 4 },
    enemies: [
      {
        id: 'enemy-1',
        name: targetNpc
          ? NPCS[targetNpc].name
          : loc === 'crypt'
            ? 'Безмолвный страж'
            : loc === 'forest'
              ? 'Голодный волк'
              : loc === 'fortress'
                ? 'Клятвопреступник'
                : 'Пепельная тень',
        hp: hard ? 18 : 12,
        maxHp: hard ? 18 : 12,
        ac: hard ? 12 : 10,
        x: 9,
        y: 4,
        damage: hard ? 6 : 4,
        initiative: enemyInit,
      },
      ...(hard
        ? [
            {
              id: 'enemy-2',
              name: 'Осколок эха',
              hp: 8,
              maxHp: 8,
              ac: 10,
              x: 9,
              y: 3,
              damage: 4,
              initiative: enemyInit,
            },
          ]
        : []),
    ],
    tiles: loc === 'cave' && c.world.cave ? c.world.cave : generateLayout(c.id + loc),
    moved: false,
    guarded: false,
    initiative,
  };
  event(
    c,
    'Из темноты выступает противник. Выберите клетку для перемещения, затем атакуйте. За ход можно пройти до 3 клеток и выполнить одно действие.',
    'combat',
    { roll: initiative },
  );
  if (enemyInit > initiative.total) {
    event(c, 'Противник действует первым.', 'combat');
    enemyTurn(c, rng);
  }
}
function enemyTurn(c: Campaign, rng: Random) {
  const combat = c.combat;
  if (!combat) return;
  if (c.hero.conditions.includes('Испуг')) {
    const save = savingThrow(c, 'wis', 11, 'Спасбросок: преодолеть страх', rng);
    event(
      c,
      save.success ? 'Вы берёте страх под контроль.' : 'Чужой шёпот всё ещё сковывает вашу волю.',
      'combat',
      { roll: save },
    );
    if (save.success) c.hero.conditions = c.hero.conditions.filter((s) => s !== 'Испуг');
  }
  for (const enemy of combat.enemies.filter((e) => e.hp > 0)) {
    if (distance(enemy, combat.player) > 1) {
      const p = pathTo(
        combat.tiles,
        enemy,
        combat.player,
        combat.enemies.filter((e) => e !== enemy && e.hp > 0),
      );
      if (p) {
        for (const step of p.slice(0, 2)) {
          if (distance(step, combat.player) === 0) break;
          enemy.x = step.x;
          enemy.y = step.y;
        }
      }
    }
    if (distance(enemy, combat.player) <= 1) {
      const roll = dice(
        20,
        `${enemy.name}: атака`,
        2,
        armorClass(c.hero) + (combat.guarded ? 3 : 0),
        'normal',
        rng,
      );
      const hit = roll.kept !== 1 && (roll.kept === 20 || roll.total >= roll.dc!);
      roll.success = hit;
      const damage = hit
        ? Math.max(1, dice(enemy.damage, 'Урон', 0, undefined, 'normal', rng).total) *
          (roll.kept === 20 ? 2 : 1)
        : 0;
      c.hero.hp = Math.max(0, c.hero.hp - damage);
      event(
        c,
        hit
          ? `${enemy.name} наносит ${damage} урона.`
          : `${enemy.name} промахивается. Ваш доспех выдержал удар.`,
        'combat',
        { roll },
      );
    } else if (enemy.id === 'enemy-2' && combat.round % 2 === 1) {
      const save = savingThrow(c, 'wis', 11, 'Спасбросок мудрости', rng);
      event(
        c,
        save.success
          ? 'Потусторонний шёпот не находит пути в ваши мысли.'
          : 'Голос из-под камня пробуждает страх. Ваши атаки совершаются с помехой до успешного спасброска.',
        'combat',
        { roll: save },
      );
      if (!save.success && !c.hero.conditions.includes('Испуг')) c.hero.conditions.push('Испуг');
    } else event(c, `${enemy.name} приближается сквозь тьму.`, 'combat');
    if (c.hero.hp === 0) {
      defeat(c);
      return;
    }
  }
  combat.round++;
  combat.moved = false;
  combat.guarded = false;
}
function defeat(c: Campaign) {
  c.combat = null;
  const lost = Math.min(c.hero.gold, 12);
  c.hero.gold -= lost;
  c.hero.hp = Math.ceil(c.hero.maxHp / 2);
  c.hero.conditions = ['Ранение'];
  c.world.location =
    c.world.destroyed.includes('tavern') || !c.world.npcs.mara.alive ? 'temple' : 'tavern';
  event(
    c,
    `Тьма смыкается. Вы приходите в себя под присмотром лекаря. Перевязка стоила ${lost} монет. Ранение пройдёт после отдыха. Путешествие продолжается.`,
    'system',
  );
}
function victory(c: Campaign) {
  const targetNpc = c.combat?.targetNpc;
  c.combat = null;
  if (targetNpc) {
    c.world.npcs[targetNpc].alive = false;
    const fact = `${NPCS[targetNpc].name} погибает от вашей руки. Эту смерть нельзя отменить отдыхом или уходом из сцены.`;
    c.world.facts.push(fact);
    event(c, fact, 'system');
    if (targetNpc === 'iva' && !c.hero.inventory.key) {
      gainItem(c, 'key');
      c.world.discovered.push('crypt');
      const quest = c.world.quests.find((q) => q.id === 'bell')!;
      if (quest.status !== 'completed') {
        quest.status = 'active';
        quest.objective =
          'Ключ с чёрной нитью открывает решётку под храмом. Найдите источник звона.';
      }
      event(
        c,
        'В складках плаща вы находите ключ с чёрной нитью. История колокола не закончилась вместе с её жизнью.',
        'system',
      );
    }
    for (const witness of LOCATIONS[c.world.location].npcs.filter(
      (id) => id !== targetNpc && c.world.npcs[id].alive,
    )) {
      c.world.npcs[witness].memories.push(
        `Преступление: ${c.hero.name} убил ${NPCS[targetNpc].name}.`,
      );
      c.world.npcs[witness].relationship = -100;
    }
  }
  c.hero.conditions = c.hero.conditions.filter((s) => s !== 'Испуг');
  const rewardFlag = targetNpc ? `defeated_${targetNpc}` : `cleared_${c.world.location}`;
  const first = !c.world.flags[rewardFlag];
  c.world.flags[rewardFlag] = true;
  const reward = first ? 25 : 8;
  c.hero.gold += reward;
  xp(c, first ? 60 : 15);
  event(c, `Бой окончен. Добыча: ${reward} монет, ${first ? 60 : 15} опыта.`, 'system');
  if (first) gainItem(c, 'potion');
  if (c.world.location === 'crypt' && !c.world.flags.bellSealed) {
    gainItem(c, 'seal');
    c.world.flags.bellSealed = true;
    completeQuest(c, 'bell', 'Вы извлекли Печать безмолвия. Звон под Вейром стих.', 40, 70);
    c.world.factions.find((f) => f.id === 'flame')!.reputation += 20;
  }
  if (
    c.world.location === 'fortress' &&
    c.world.flags.prisonerMoved &&
    !c.world.flags.prisonerSaved
  ) {
    c.world.flags.prisonerSaved = true;
    c.world.facts.push('Звонарь освобождён из крепости.');
    c.hero.gold += 20;
    event(
      c,
      'В камере под башней вы находите живого звонаря. Он свободен — вопреки приговору двора.',
      'system',
    );
  }
}
export function combatAction(c: Campaign, intent: Intent, rng: Random = secureRandom) {
  const b = c.combat;
  if (!b) throw new Error('Сейчас нет боя.');
  if (intent.kind === 'move') {
    if (b.moved) throw new Error('Вы уже перемещались. Выполните действие.');
    const parts = intent.target.split(',').map(Number);
    if (parts.length !== 2 || !parts.every(Number.isInteger))
      throw new Error('Выберите клетку поля.');
    const [x, y] = parts;
    if (b.enemies.some((e) => e.hp > 0 && e.x === x && e.y === y))
      throw new Error('Клетка занята противником.');
    const p = pathTo(
      b.tiles,
      b.player,
      { x, y },
      b.enemies.filter((e) => e.hp > 0),
    );
    if (!p || p.length > 3 || p.length === 0)
      throw new Error('Можно пройти до 3 свободных клеток за ход.');
    b.player = { x, y };
    b.moved = true;
    event(c, `Вы перемещаетесь на ${p.length} клеток.`, 'combat');
    return;
  }
  if (intent.kind === 'flee') {
    const roll = check(c, 'dex', 11, 'Отступление', rng);
    event(
      c,
      roll.success ? 'Вы отрываетесь от преследования.' : 'Противник преграждает путь.',
      'combat',
      { roll },
    );
    if (roll.success) {
      c.combat = null;
      return;
    }
    enemyTurn(c, rng);
    return;
  }
  if (intent.kind === 'guard') {
    b.guarded = true;
    event(c, 'Вы занимаете защитную стойку. +3 к броне до следующего хода.', 'combat');
    enemyTurn(c, rng);
    return;
  }
  if (intent.kind === 'cast' && /леч|свет|дыхани/.test(intent.target + ' ' + intent.detail)) {
    const warrior = c.hero.classId === 'warrior';
    if (!warrior && c.hero.classId !== 'warden') throw new Error('Это умение вам недоступно.');
    if (warrior && c.world.flags.secondWind)
      throw new Error('Второе дыхание восстановится после отдыха.');
    if (!warrior && c.hero.mana < 3) throw new Error('Нужно 3 маны.');
    const heal = dice(
      warrior ? 10 : 8,
      'Исцеление',
      warrior ? c.hero.level : modifier(c.hero.attributes.wis),
      undefined,
      'normal',
      rng,
    ).total;
    if (warrior) c.world.flags.secondWind = true;
    else c.hero.mana -= 3;
    c.hero.hp = Math.min(c.hero.maxHp, c.hero.hp + heal);
    event(c, `Живительная сила восстанавливает ${heal} здоровья.`, 'combat');
    enemyTurn(c, rng);
    return;
  }
  if (intent.kind !== 'attack' && intent.kind !== 'cast')
    throw new Error('Сначала завершите бой: двигайтесь, атакуйте, защищайтесь или отступайте.');
  const enemy =
    b.enemies.find((e) => e.id === intent.target && e.hp > 0) ?? b.enemies.find((e) => e.hp > 0)!;
  const spell = intent.kind === 'cast';
  if (spell && c.hero.classId !== 'mage') throw new Error('Огненная искра доступна магу.');
  if (spell && c.hero.mana < 2) throw new Error('Нужно 2 маны.');
  if (!spell && distance(b.player, enemy) > 1)
    throw new Error('Противник далеко. Подойдите на соседнюю клетку.');
  if (spell && (distance(b.player, enemy) > 8 || !lineOfSight(b.tiles, b.player, enemy)))
    throw new Error('Противник вне дальности или скрыт за стеной.');
  if (spell) c.hero.mana -= 2;
  const weapon = ITEMS[c.hero.equipment.weapon];
  const stat = spell ? 'int' : weapon.id === 'dagger' ? 'dex' : 'str';
  const roll = dice(
    20,
    spell ? 'Огненная искра' : 'Атака',
    modifier(c.hero.attributes[stat]) + 2,
    enemy.ac,
    c.hero.conditions.some((s) => ['Испуг', 'Дым в глазах'].includes(s))
      ? 'disadvantage'
      : 'normal',
    rng,
  );
  const hit = roll.kept !== 1 && (roll.kept === 20 || roll.total >= enemy.ac);
  roll.success = hit;
  if (hit) {
    const sides = spell ? 10 : (weapon.damage ?? 6);
    let dmg = dice(
      sides,
      'Урон',
      Math.max(0, modifier(c.hero.attributes[stat])),
      undefined,
      'normal',
      rng,
    ).total;
    if (roll.kept === 20) dmg += dice(sides, 'Критический урон', 0, undefined, 'normal', rng).total;
    if (c.hero.classId === 'rogue' && enemy.hp < enemy.maxHp)
      dmg += dice(6, 'Точный удар', 0, undefined, 'normal', rng).total;
    enemy.hp = Math.max(0, enemy.hp - dmg);
    event(
      c,
      `${roll.kept === 20 ? 'Критическое попадание! ' : ''}${enemy.name} получает ${dmg} урона.${enemy.hp === 0 ? ' Противник повержен.' : ''}`,
      'combat',
      { roll },
    );
  } else event(c, 'Удар рассекает воздух. Противник ускользает.', 'combat', { roll });
  if (b.enemies.every((e) => e.hp === 0)) {
    victory(c);
    return;
  }
  enemyTurn(c, rng);
}
export function afterConsumable(c: Campaign, rng: Random = secureRandom) {
  if (c.combat) enemyTurn(c, rng);
}
