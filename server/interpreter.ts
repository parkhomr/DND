import { ITEMS, LOCATION_ALIASES, LOCATIONS, NPCS, NPC_ALIASES } from '../src/lib/content';
import type { Campaign, Intent, IntentKind } from '../src/lib/types';
export const intent = (kind: IntentKind, target = '', detail = ''): Intent => ({
  kind,
  target,
  detail,
});
export function interpretDemo(text: string, c: Campaign): Intent {
  const t = text.toLocaleLowerCase('ru').replaceAll('ё', 'е');
  const referencedNpc = Object.entries(NPC_ALIASES).find(([, names]) =>
    names.some((n) => t.includes(n)),
  )?.[0];
  const npc =
    referencedNpc ?? LOCATIONS[c.world.location].npcs.find((id) => c.world.npcs[id].alive) ?? '';
  const location =
    Object.entries(LOCATION_ALIASES).find(([, names]) => names.some((n) => t.includes(n)))?.[0] ??
    '';
  const item =
    Object.keys(ITEMS).find((id) =>
      ITEMS[id].name
        .toLowerCase()
        .split(' ')
        .some((w) => w.length > 4 && t.includes(w.slice(0, -1))),
    ) ??
    (/зел|лечебн/.test(t)
      ? 'potion'
      : /настой|ман[ау]/.test(t)
        ? 'ether'
        : /хлеб|ед[уыа]|поесть/.test(t)
          ? 'bread'
          : '');
  if (/куп.*(дом|таверн|здани)|откр.*таверн/.test(t)) return intent('property', 'tavern', text);
  if (/подж|сжеч|сжиг|пожар/.test(t)) return intent('burn', c.world.location, text);
  if (/укра|крад|обокр|вору|карман|ограб/.test(t)) return intent('steal', npc, text);
  if (/прод[ао]/.test(t)) return intent('sell', item, text);
  if (/куп|заказ|приобр/.test(t)) return intent('buy', item || 'bread', text);
  if (/вып[ьи]|использ|съес|восстанов.*ман/.test(t)) return intent('use', item || 'potion', text);
  if (/экип|надеть|вооруж/.test(t)) return intent('equip', item, text);
  if (/атак|удар|уб[ьи]|напас|сраж|противник|бой|охот/.test(t))
    return intent('attack', referencedNpc ?? '', text);
  if (/искр|заклин|колдов|огнен|магия|лечу|исцел|дыхани|живой свет/.test(t))
    return intent('cast', text, text);
  if (/защит|блок|стойк/.test(t)) return intent('guard', '', text);
  if (/беж|отступ|сбеж/.test(t)) return intent('flee', '', text);
  if (/отдых|спать|ночлег|посп|снять комнат/.test(t)) return intent('rest', '', text);
  if (/жд[ауе]|подожд|время/.test(t)) return intent('wait', '', text);
  if (/вступ|присоед|гильди|серы[емх].*нит/.test(t))
    return intent(
      'join',
      /двор/.test(t)
        ? 'court'
        : /орден/.test(t)
          ? 'flame'
          : /союз/.test(t)
            ? 'merchants'
            : 'threads',
      text,
    );
  if (/освобод|спасти.*заключ|вызвол|звонар/.test(t) && c.world.location === 'square')
    return intent('quest', 'prisoner', text);
  if (location && /ид[уте]|иду|пойд|отправ|возвр|вый|спус|пере[йх]|направ|путешеств/.test(t))
    return intent('travel', location, text);
  if (/поговор|говор|спро|сказать|бесед|привет|диалог/.test(t)) return intent('talk', npc, text);
  if (/убед|обман|уговор|запуг|посланник|представ/.test(t)) return intent('persuade', npc, text);
  if (/обыск|исслед|поиск|искать|следы|сундук|алтар|колодец|камин|колокол/.test(t))
    return intent('search', '', text);
  if (/осмотр|смотр|огляд|прислуш|объявлен/.test(t)) return intent('look', '', text);
  return intent('improvise', '', text);
}
export function visibleContext(c: Campaign) {
  return {
    hero: c.hero,
    scene: { ...LOCATIONS[c.world.location], description: undefined },
    time: c.world.tick,
    worldFacts: c.world.facts.slice(-15),
    summary: c.summary,
    recentEvents: c.events.slice(-10),
    quests: c.world.quests,
    combat: c.combat
      ? { round: c.combat.round, player: c.combat.player, enemies: c.combat.enemies }
      : null,
    npcs: LOCATIONS[c.world.location].npcs
      .filter((id) => c.world.npcs[id].alive)
      .map((id) => ({
        id,
        name: NPCS[id].name,
        description: NPCS[id].description,
        relationship: c.world.npcs[id].relationship,
        memories: c.world.npcs[id].memories,
      })),
    allowedLocations: LOCATIONS[c.world.location].exits.map((id) => ({
      id,
      name: LOCATIONS[id].name,
    })),
    items: Object.values(ITEMS).map(({ id, name }) => ({ id, name })),
  };
}
