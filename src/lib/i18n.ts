import type { Attribute, ClassId } from './types';
// Central UI vocabulary. Authored world content lives in content.ts; a second locale can implement this contract.
export const ru = {
  attributes: {
    str: 'Сила',
    dex: 'Ловкость',
    con: 'Телосложение',
    int: 'Интеллект',
    wis: 'Мудрость',
    cha: 'Харизма',
  } satisfies Record<Attribute, string>,
  classes: { warrior: 'Воин', rogue: 'Плут', mage: 'Маг', warden: 'Хранитель' } satisfies Record<
    ClassId,
    string
  >,
  nav: {
    play: 'Приключение',
    inventory: 'Инвентарь',
    character: 'Персонаж',
    map: 'Карта мира',
    journal: 'Дневник',
    settings: 'Настройки',
    saves: 'Сохранения',
    lobby: 'Совместная игра',
  },
  ancestries: ['Человек', 'Сумеречный эльф', 'Камнерождённый', 'Полурослик'],
  backgrounds: ['Изгнанник', 'Наёмник', 'Учёный', 'Бродяга', 'Дворянин'],
};
export const modifier = (value: number) => Math.floor((value - 10) / 2);
export const signed = (value: number) => (value >= 0 ? `+${value}` : String(value));
export const gameTime = (tick: number) =>
  `${String((20 + Math.floor(tick / 60)) % 24).padStart(2, '0')}:${String(tick % 60).padStart(2, '0')}`;
