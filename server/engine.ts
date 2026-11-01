import { ITEMS, LOCATIONS, NPCS } from '../src/lib/content';
import type { Campaign, Command, Intent, LocationId } from '../src/lib/types';
import { afterConsumable, combatAction, startCombat } from './combat';
import {
  advanceTime,
  check,
  completeQuest,
  crime,
  describeLocation,
  dice,
  event,
  gainItem,
  generateLayout,
  remember,
  secureRandom,
  takeItem,
  xp,
  type Random,
} from './rules';
function requireNpc(c: Campaign, id: string) {
  if (c.world.destroyed.includes(c.world.location))
    throw new Error('После пожара это место покинули все жители.');
  if (!LOCATIONS[c.world.location].npcs.includes(id) || !c.world.npcs[id]?.alive)
    throw new Error('Этого собеседника здесь нет.');
  return NPCS[id];
}
function requirePeace(c: Campaign) {
  if (c.combat) throw new Error('Во время боя это действие недоступно.');
}
export function resolve(
  c: Campaign,
  command: Command,
  parsed?: Intent,
  rng: Random = secureRandom,
  allowImprovisation = false,
) {
  if (command.type === 'roll') {
    const roll = dice(command.sides, 'Свободный бросок', 0, undefined, command.mode, rng);
    event(
      c,
      `Вы бросаете к${command.sides}. Свободный бросок не изменяет исход событий.`,
      'system',
      { roll },
    );
    return;
  }
  const i = command.type === 'intent' ? command.intent : parsed;
  if (!i) throw new Error('Не удалось распознать действие.');
  if (command.type === 'text') event(c, command.text, 'action');
  if (c.combat && ['attack', 'cast', 'guard', 'move', 'flee'].includes(i.kind)) {
    combatAction(c, i, rng);
    advanceTime(c, 1);
    return;
  }
  if (c.combat && !['use', 'look'].includes(i.kind)) throw new Error('Сначала завершите бой.');
  switch (i.kind) {
    case 'look':
      event(c, describeLocation(c, c.world.location));
      if (c.world.location === 'square')
        event(
          c,
          'Указ: звонарь обвинён в пробуждении мёртвых. Казнь назначена на рассвет. Рядом объявление: Медный союз предлагает 200 монет за возвращение старой таверны в работу.',
        );
      break;
    case 'talk': {
      requirePeace(c);
      const n = requireNpc(c, i.target);
      const state = c.world.npcs[n.id];
      const first = !c.world.flags[`met_${n.id}`];
      c.world.flags[`met_${n.id}`] = true;
      if (state.memories.some((m) => m.includes('преступление') || m.includes('Пожар'))) {
        event(
          c,
          '«Я помню, что вы сделали. Не подходите». Собеседник отступает, не сводя с вас глаз.',
          'dialogue',
          { speaker: n.name },
        );
        break;
      }
      event(c, first ? n.greeting : repeatDialogue(c, n.id), 'dialogue', { speaker: n.name });
      state.relationship = Math.min(100, state.relationship + (first ? 5 : 1));
      remember(c, n.id, `Встреча с ${c.hero.name} в ${LOCATIONS[c.world.location].name}.`);
      if (n.id === 'iva' && first) {
        gainItem(c, 'key');
        const q = c.world.quests.find((q) => q.id === 'bell')!;
        q.status = 'active';
        q.objective = 'Найдите вход в крипту под храмом. Ключ Ивы откроет решётку.';
        event(
          c,
          'Ива оставляет на столе ключ с чёрной нитью. «Когда спустишься, не отвечай, если позовут по имени».',
          'dialogue',
          { speaker: n.name },
        );
        c.world.discovered.push('crypt');
        xp(c, 15);
      }
      if (n.id === 'rook' && first) {
        const q = c.world.quests.find((q) => q.id === 'prisoner')!;
        if (q.status !== 'failed') {
          q.status = 'active';
          q.objective =
            'На площади попытайтесь освободить звонаря: хитростью или убеждением. Успейте до перевода в крепость.';
        }
        xp(c, 10);
      }
      if (n.id === 'oren' && first) {
        const q = c.world.quests.find((q) => q.id === 'daughter')!;
        q.status = 'active';
        q.objective = 'Обыщите дом в Тихом Броде. Найдите следы дочери Орена.';
        xp(c, 10);
      }
      if (n.id === 'vesna' && c.hero.inventory.seal) {
        if (!c.world.flags.blessed) {
          c.world.flags.blessed = true;
          gainItem(c, 'charm');
          event(
            c,
            'Весна вручает вам серебряного ворона. «Теперь тишина — это просто тишина».',
            'dialogue',
            { speaker: n.name },
          );
        }
      }
      break;
    }
    case 'travel': {
      requirePeace(c);
      const dest = i.target as LocationId;
      if (!LOCATIONS[c.world.location].exits.includes(dest))
        throw new Error('Прямой дороги нет. Выберите соседнее место на карте.');
      if (dest === 'crypt' && !c.hero.inventory.key)
        throw new Error('Решётка заперта. У незнакомки в таверне есть ключ с чёрной нитью.');
      if (c.world.destroyed.includes(dest)) {
        event(c, 'Вы ступаете в пепел. От прежнего здания остались только стены.');
      }
      c.world.location = dest;
      if (!c.world.visited.includes(dest)) {
        c.world.visited.push(dest);
        xp(c, 10);
      }
      if (dest === 'cave' && !c.world.cave) {
        c.world.cave = generateLayout(c.id + 'cave');
        c.world.discovered.push('cave');
      }
      event(c, describeLocation(c, dest));
      advanceTime(c, 10);
      break;
    }
    case 'buy': {
      requirePeace(c);
      if (
        c.world.destroyed.includes(c.world.location) ||
        !c.world.npcs[c.world.location === 'market' ? 'silas' : 'mara'].alive
      )
        throw new Error('Лавка больше не работает. Здесь некому продавать товары.');
      const id = i.target;
      const item = Object.hasOwn(ITEMS, id) ? ITEMS[id] : undefined;
      if (
        !item ||
        !c.world.stock[id] ||
        !(
          c.world.location === 'market' ||
          (c.world.location === 'tavern' && ['bread', 'potion', 'ether'].includes(id))
        )
      )
        throw new Error('Этот товар здесь не продаётся. Посетите Медные ряды.');
      const price = item.price + (id === 'bread' && c.world.flags.tax ? 2 : 0);
      if (c.hero.gold < price) throw new Error(`Недостаточно монет. Нужно ${price}.`);
      c.hero.gold -= price;
      c.world.stock[id]--;
      gainItem(c, id);
      event(c, `Куплено: ${item.name}. −${price} монет.`, 'system');
      break;
    }
    case 'sell': {
      requirePeace(c);
      if (c.world.destroyed.includes(c.world.location) || !c.world.npcs.silas.alive)
        throw new Error('Лавка больше не работает. Здесь некому покупать ваши вещи.');
      const item = Object.hasOwn(ITEMS, i.target) ? ITEMS[i.target] : undefined;
      if (c.world.location !== 'market') throw new Error('Продать вещи можно на рынке.');
      if (!item || item.type === 'quest') throw new Error('Этот предмет не продаётся.');
      if (Object.values(c.hero.equipment).includes(i.target))
        throw new Error('Сначала снимите предмет.');
      takeItem(c, i.target);
      const price = Math.floor(item.price / 2);
      c.hero.gold += price;
      c.world.stock[i.target] = (c.world.stock[i.target] ?? 0) + 1;
      event(c, `Продано: ${item.name}. +${price} монет.`, 'system');
      break;
    }
    case 'use': {
      const item = Object.hasOwn(ITEMS, i.target) ? ITEMS[i.target] : undefined;
      if (!item || item.type !== 'consumable') throw new Error('Выберите расходуемый предмет.');
      if (c.combat && i.target === 'bread') throw new Error('Во время боя некогда обедать.');
      if (item.heal && c.hero.hp === c.hero.maxHp)
        throw new Error('Здоровье уже полностью восстановлено.');
      if (item.mana && c.hero.mana === c.hero.maxMana)
        throw new Error('Мана уже полностью восстановлена.');
      takeItem(c, i.target);
      const heal =
        i.target === 'potion'
          ? dice(4, 'Зелье', 0, undefined, 'normal', rng).total +
            dice(4, 'Зелье', 0, undefined, 'normal', rng).total +
            2
          : (item.heal ?? 0);
      c.hero.hp = Math.min(c.hero.maxHp, c.hero.hp + heal);
      c.hero.mana = Math.min(c.hero.maxMana, c.hero.mana + (item.mana ?? 0));
      event(
        c,
        `${item.name}: ${heal ? `восстановлено ${heal} здоровья` : `восстановлено ${item.mana} маны`}.`,
        'system',
      );
      afterConsumable(c, rng);
      break;
    }
    case 'equip': {
      requirePeace(c);
      const item = Object.hasOwn(ITEMS, i.target) ? ITEMS[i.target] : undefined;
      if (!item || !c.hero.inventory[i.target]) throw new Error('Этого предмета нет в инвентаре.');
      const slot =
        item.type === 'weapon'
          ? 'weapon'
          : item.type === 'armor'
            ? 'armor'
            : item.type === 'trinket'
              ? 'charm'
              : null;
      if (!slot) throw new Error('Предмет нельзя экипировать.');
      if (c.hero.equipment[slot] === item.id && slot === 'charm') c.hero.equipment[slot] = '';
      else c.hero.equipment[slot] = item.id;
      event(c, `Снаряжение изменено: ${item.name}.`, 'system');
      break;
    }
    case 'rest': {
      requirePeace(c);
      if (c.world.location === 'tavern' && !c.world.npcs.mara.alive)
        throw new Error('Мара больше не сдаёт комнаты. В храме ещё можно найти приют.');
      if (!['tavern', 'temple', 'village'].includes(c.world.location))
        throw new Error('Здесь небезопасно спать. Вернитесь в таверну или храм.');
      if (c.world.destroyed.includes(c.world.location))
        throw new Error('В сгоревшем здании нельзя отдыхать.');
      const cost = c.world.location === 'tavern' ? 5 : 0;
      if (c.hero.gold < cost)
        throw new Error('Ночлег стоит 5 монет. В храме можно отдохнуть бесплатно.');
      c.hero.gold -= cost;
      c.hero.hp = c.hero.maxHp;
      c.hero.mana = c.hero.maxMana;
      c.hero.conditions = [];
      c.world.flags.secondWind = false;
      event(c, `Несколько часов сна возвращают вам силы.${cost ? ' Ночлег: −5 монет.' : ''}`);
      advanceTime(c, 180);
      break;
    }
    case 'wait':
      event(c, 'Вы наблюдаете, как мир продолжает жить без вашего участия.');
      advanceTime(c, 30);
      break;
    case 'search': {
      requirePeace(c);
      const loc = c.world.location;
      const key = `searched_${loc}`;
      if (c.world.flags[key]) {
        event(
          c,
          'Вы уже тщательно исследовали это место. Следы ваших прошлых поисков всё ещё заметны.',
        );
        break;
      }
      const roll = check(c, 'wis', loc === 'tavern' ? 8 : 11, 'Внимательность', rng);
      event(
        c,
        roll.success
          ? 'За привычными вещами проступает то, чего вы раньше не замечали.'
          : 'Тени и скрип дерева отвлекают. Попробуйте рассмотреть всё ещё раз.',
        'narration',
        { roll },
      );
      if (roll.success) {
        c.world.flags[key] = true;
        xp(c, 15);
        if (loc === 'tavern') {
          c.hero.gold += 7;
          event(
            c,
            'За каминным камнем вы находите семь старых монет и выцарапанный знак колокола. Кто-то здесь уже искал ответы.',
          );
          c.world.facts.push('Под камнем таверны обнаружен знак колокола.');
        } else if (loc === 'temple') {
          event(
            c,
            'Под алтарём — решётка. На замке знак колокола, как на ключе Ивы. Чёрная нить тянется в темноту.',
          );
          c.world.discovered.push('crypt');
        } else if (loc === 'village') {
          gainItem(c, 'relic');
          c.world.flags.daughterFound = true;
          completeQuest(
            c,
            'daughter',
            'Вы нашли девочку в доме у реки и помогли ей выбраться из деревни. Она не постарела ни на день.',
            30,
            65,
          );
          if (c.world.npcs.oren.alive) {
            remember(c, 'oren', 'Вы спасли мою дочь.');
            c.world.npcs.oren.relationship += 40;
          }
        } else if (loc === 'cave') {
          gainItem(c, 'relic');
          event(
            c,
            'Вы бережно извлекаете янтарную реликвию. Схема пещеры запомнена; при возвращении проходы останутся прежними.',
          );
        } else if (loc === 'crypt') {
          event(
            c,
            'На колоколе нет языка. Он звонит изнутри. Между вами и Печатью стоит безмолвный страж.',
          );
          if (!c.world.flags.cleared_crypt) startCombat(c, rng);
        } else if (loc === 'fortress') {
          gainItem(c, 'potion');
          c.hero.gold += 12;
          event(
            c,
            'В сундуке уцелели зелье исцеления и 12 монет. На внутренней стороне крышки — список людей, которых двор приказал забыть.',
          );
        } else if (loc === 'forest') {
          event(c, 'Следы ведут к Полой жиле — пещере, которой нет на городских картах.');
          c.world.discovered.push('cave');
        } else {
          c.hero.gold += 5;
          event(
            c,
            'Среди потерянных вещей вы находите пять медяков и записку о завтрашней забастовке.',
          );
        }
      }
      break;
    }
    case 'steal': {
      requirePeace(c);
      const n = requireNpc(c, i.target);
      if (c.world.flags[`robbed_${n.id}`])
        throw new Error('После прошлой попытки здесь уже нечего взять.');
      const roll = check(c, 'dex', 14, 'Ловкость рук', rng);
      event(
        c,
        roll.success
          ? 'Ваши пальцы бесшумно развязывают чужой кошелёк. +9 монет.'
          : 'Чужая ладонь перехватывает ваше запястье. Вас заметили.',
        'narration',
        { roll },
      );
      c.world.flags[`robbed_${n.id}`] = true;
      if (roll.success) {
        c.hero.gold += 9;
        xp(c, 10);
      } else crime(c, `${c.hero.name}: преступление — попытка ограбить ${n.name}.`, 2);
      break;
    }
    case 'persuade': {
      requirePeace(c);
      const n = requireNpc(c, i.target);
      const roll = check(c, 'cha', 13, 'Убеждение', rng);
      event(
        c,
        roll.success
          ? 'В голосе собеседника появляется осторожное доверие.'
          : 'Собеседник качает головой: «Слова — не доказательство».',
        'dialogue',
        { speaker: n.name, roll },
      );
      if (roll.success && !c.world.flags[`persuaded_${n.id}`]) {
        c.world.flags[`persuaded_${n.id}`] = true;
        c.world.npcs[n.id].relationship += 15;
        remember(c, n.id, 'Убедительный разговор о доверии.');
        xp(c, 20);
        if (n.id === 'iva')
          event(
            c,
            '«Я была ученицей последнего звонаря. Он не будил мёртвых. Он удерживал их во сне».',
            'dialogue',
            { speaker: n.name },
          );
      }
      break;
    }
    case 'attack': {
      if (
        LOCATIONS[c.world.location].danger < 2 ||
        LOCATIONS[c.world.location].npcs.includes(i.target)
      ) {
        const n = requireNpc(c, i.target);
        crime(c, `${c.hero.name}: преступление — нападение на ${n.name}.`, 3);
        event(
          c,
          `${n.name} защищается. Свидетели запомнят ваше нападение; победа в этом бою будет стоить собеседнику жизни.`,
        );
        startCombat(c, rng, n.id);
      } else {
        if (c.world.flags[`cleared_${c.world.location}`]) {
          event(c, 'Новых врагов здесь пока нет. Место уже очищено.');
          break;
        }
        startCombat(c, rng);
      }
      break;
    }
    case 'cast': {
      if (/леч|свет|дыхани/.test(i.target + ' ' + i.detail)) {
        const warrior = c.hero.classId === 'warrior';
        if (!warrior && c.hero.classId !== 'warden')
          throw new Error('Умение недоступно вашему классу.');
        if (warrior && c.world.flags.secondWind)
          throw new Error('Нужен отдых, чтобы использовать Второе дыхание снова.');
        if (!warrior && c.hero.mana < 3) throw new Error('Нужно 3 маны.');
        if (c.hero.hp === c.hero.maxHp) throw new Error('Здоровье уже восстановлено.');
        const heal = dice(
          warrior ? 10 : 8,
          'Исцеление',
          warrior ? c.hero.level : 3,
          undefined,
          'normal',
          rng,
        ).total;
        c.hero.hp = Math.min(c.hero.maxHp, c.hero.hp + heal);
        if (warrior) c.world.flags.secondWind = true;
        else c.hero.mana -= 3;
        event(c, `Вы восстанавливаете ${heal} здоровья.`);
      } else throw new Error('Для огненной искры нужен противник в бою.');
      break;
    }
    case 'burn': {
      requirePeace(c);
      const loc = c.world.location;
      if (!['tavern', 'village', 'market'].includes(loc))
        throw new Error('Камень и дождь не дают огню разгореться.');
      if (c.world.destroyed.includes(loc)) throw new Error('Здесь уже остался только пепел.');
      const roll = check(c, 'dex', 13, 'Поджог', rng);
      event(
        c,
        roll.success
          ? 'Огонь поднимается по балкам. Это место уже не станет прежним.'
          : 'Мокрое дерево дымится, но не загорается. Вы кашляете.',
        'narration',
        { roll },
      );
      crime(c, `Пожар: ${c.hero.name} попытался сжечь ${LOCATIONS[loc].name}.`, 3);
      if (roll.success) {
        c.world.destroyed.push(loc);
        c.world.facts.push(`${LOCATIONS[loc].name} уничтожено пожаром.`);
      } else if (!c.hero.conditions.includes('Дым в глазах'))
        c.hero.conditions.push('Дым в глазах');
      break;
    }
    case 'property': {
      requirePeace(c);
      if (c.world.destroyed.includes('market') || !c.world.npcs.silas.alive)
        throw new Error('Сделку некому заверить: лавка Силаса больше не работает.');
      if (c.world.location !== 'market')
        throw new Error('За правом собственности обратитесь к Силасу на рынке. Цена: 200 монет.');
      if (c.world.flags.ownsTavern) throw new Error('Старая таверна уже принадлежит вам.');
      if (c.hero.gold < 200)
        throw new Error('Старая таверна стоит 200 монет. Возвращайтесь, когда соберёте сумму.');
      c.hero.gold -= 200;
      c.world.flags.ownsTavern = true;
      c.world.facts.push('Старая таверна у реки принадлежит герою.');
      event(
        c,
        'Силас передаёт купчую. Отныне ваша таверна приносит 10 монет каждые два игровых часа.',
        'system',
      );
      break;
    }
    case 'join': {
      requirePeace(c);
      const faction = c.world.factions.find((f) => f.id === i.target);
      if (!faction || !['threads', 'court', 'flame', 'merchants'].includes(faction.id))
        throw new Error('Контакт с этой фракцией ещё не установлен.');
      const required = { threads: 'square', court: 'square', flame: 'temple', merchants: 'market' }[
        faction.id
      ];
      if (c.world.location !== required) throw new Error('Найдите представителя фракции в городе.');
      if (c.world.flags[`joined_${faction.id}`]) throw new Error('Вы уже связаны с этой фракцией.');
      faction.reputation += 10;
      c.world.flags[`joined_${faction.id}`] = true;
      event(
        c,
        `Фракция «${faction.name}» принимает вашу помощь. Репутация +10. Ваши поступки определят, насколько далеко зайдёт этот союз.`,
        'system',
      );
      break;
    }
    case 'quest': {
      requirePeace(c);
      if (i.target !== 'prisoner' || c.world.location !== 'square' || !c.world.flags.met_rook)
        throw new Error('Сначала поговорите с Сычом на площади.');
      if (c.world.flags.prisonerSaved || c.world.flags.prisonerMoved)
        throw new Error('Заключённого больше нет в городской тюрьме.');
      const roll = check(
        c,
        /хитр|тих|замок|крад/.test(i.detail) ? 'dex' : 'cha',
        14,
        'Освобождение звонаря',
        rng,
      );
      event(
        c,
        roll.success
          ? 'Вы выводите звонаря через служебную дверь, пока стража спорит о приказах.'
          : 'Стража отвергает вашу историю. Приходится отступить.',
        'narration',
        { roll },
      );
      if (roll.success) {
        c.world.flags.prisonerSaved = true;
        completeQuest(c, 'prisoner', 'Звонарь свободен. Серые нити сдержали обещание.', 35, 60);
        c.world.factions.find((f) => f.id === 'threads')!.reputation += 20;
      } else crime(c, 'Преступление — попытка освободить заключённого.', 1);
      break;
    }
    case 'improvise': {
      requirePeace(c);
      if (allowImprovisation) {
        const detail = i.detail.slice(0, 500);
        if (
          /монет|золот|предмет|оружи|убит|убить|богом|бессмерт|телепорт|миллион|здоровь|инструкц|правил|api|system|ключ|ignore/i.test(
            detail,
          )
        ) {
          event(
            c,
            'Одного намерения недостаточно, чтобы изменить владение вещами, здоровье или устройство мира. Опишите конкретное действие с доступными людьми и предметами.',
            'system',
          );
          break;
        }
        const attribute = /взлез|прыг|бег|проскольз|танц/.test(detail)
          ? 'dex'
          : /поднят|толк|слом|держат/.test(detail)
            ? 'str'
            : /вспом|изуч|вычисл|разгад/.test(detail)
              ? 'int'
              : /услыш|замет|поня|чувств/.test(detail)
                ? 'wis'
                : 'cha';
        const roll = check(c, attribute, 14, 'Импровизация', rng);
        event(
          c,
          roll.success
            ? 'Вы находите способ воплотить своё намерение. На этот раз обстоятельства на вашей стороне.'
            : 'Попытка не удаётся. Мир сопротивляется: для этого потребуется другой подход.',
          'narration',
          { roll },
        );
        c.world.facts.push(
          `${c.hero.name} предпринял действие: «${detail}». Проверка ${roll.success ? 'удалась' : 'не удалась'}; владение вещами, здоровье и деньги не изменены.`,
        );
        if (c.world.facts.length > 100) c.world.facts = c.world.facts.slice(-80);
        break;
      }
      event(
        c,
        'В ограниченной симуляции я не могу последовательно разрешить такое намерение. Попробуйте описать разговор, убеждение, кражу, исследование, путешествие или бой. В режиме ИИ свободные формулировки понимаются шире; последствия всё равно проверяет движок.',
        'system',
      );
      break;
    }
    default:
      throw new Error('Это действие сейчас недоступно.');
  }
  advanceTime(c, 5);
}
function repeatDialogue(c: Campaign, id: string) {
  if (id === 'oren' && c.world.flags.daughterFound)
    return '«Она дома». Орен впервые смотрит вам прямо в глаза. «Я не забуду. Ни я, ни лес». ';
  if (id === 'iva' && c.world.flags.bellSealed)
    return '«Тишина». Ива развязывает чёрную нить. «Я уже забыла, как она звучит. Спасибо». ';
  const lines: Record<string, string[]> = {
    mara: [
      '«Слухи — единственное, чего здесь наливают без меры. Поговори с девушкой у окна».',
      '«Комната — пять монет. Завтрак — три. Совет? Не спускайся под храм один».',
    ],
    iva: [
      '«Ключ у тебя. Храм — за площадью. Только не пытайся разбить колокол. Вынь печать после того, как усмиришь стража».',
      '«Семь лет назад город выбрал забыть. Но то, что под нами, ничего не забыло».',
    ],
    rook: [
      '«Звонаря держат у площади. Хитрость, уговоры — мне всё равно. До перевода осталось мало времени».',
      '«Двор боится звона больше, чем бунта. Подумай, почему».',
    ],
    silas: [
      '«Зелья, доспехи, редкости. А ещё купчая на старую таверну — двести монет».',
      '«Продаёшь? Половина цены. Покупаешь? Полная. Вот что я называю равновесием».',
    ],
    vesna: [
      '«Решётка под алтарём. Найди ключ. И помни: не всякую дверь следует открывать».',
      '«Верни печать из крипты. Я смогу успокоить то, что ещё не проснулось».',
    ],
    oren: [
      '«В Тихом Броде найди дом у реки. Не трогай ужин. Просто найди её».',
      '«В лесу есть пещера. Янтарь в ней помнит солнце, которого мы не видели».',
    ],
  };
  return lines[id]?.[Math.floor(c.world.tick / 5) % 2] ?? 'Собеседник внимательно слушает.';
}
