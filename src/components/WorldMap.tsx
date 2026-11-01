import { LOCATIONS } from '../lib/content';
import type { LocationId, PublicCampaign } from '../lib/types';
import { Icon } from './Icons';
export function WorldMap({
  campaign,
  onTravel,
  busy,
}: {
  campaign: PublicCampaign;
  onTravel: (id: LocationId) => void;
  busy: boolean;
}) {
  const here = LOCATIONS[campaign.world.location];
  return (
    <div className="world-map">
      <svg viewBox="0 0 1000 700" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <radialGradient id="parchment">
            <stop stopColor="#30392b" />
            <stop offset="1" stopColor="#111d1a" />
          </radialGradient>
          <pattern id="maplines" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#b9b08b" strokeOpacity=".035" />
          </pattern>
        </defs>
        <rect width="1000" height="700" fill="url(#parchment)" />
        <rect width="1000" height="700" fill="url(#maplines)" />
        <path d="M850 0Q600 150 750 300T700 700H1000V0" fill="#183637" />
        <path
          d="M800 0Q550 150 700 300T650 700"
          stroke="#859d88"
          strokeOpacity=".3"
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M365 0q140 120 20 190t80 200 40 310"
          fill="none"
          stroke="#406265"
          strokeWidth="17"
          opacity=".6"
        />
        {Array.from({ length: 95 }, (_, i) => {
          const x = 60 + ((i * 83) % 590),
            y = 25 + ((i * 47) % 285);
          return (
            <g key={i} opacity={0.15 + (i % 3) * 0.08}>
              <path d={`M${x} ${y + 25}l10-26 10 26h-8v8h-4v-8Z`} fill="#899b70" />
            </g>
          );
        })}
        {[...Array(8)].map((_, i) => (
          <path
            key={i}
            d={`M${i * 42 + 30} 100l30-65 35 65m-49-30 14-35 14 35`}
            fill="none"
            stroke="#a89f74"
            strokeOpacity=".25"
          />
        ))}
        {Object.values(LOCATIONS).flatMap((l) =>
          l.exits.map((id) => {
            if (l.id > id) return null;
            const to = LOCATIONS[id];
            return (
              <path
                key={l.id + id}
                d={`M${l.x * 10} ${l.y * 7}Q${(l.x + to.x) * 5 + 20} ${(l.y + to.y) * 3.5 + 12} ${to.x * 10} ${to.y * 7}`}
                fill="none"
                stroke="#a79963"
                strokeDasharray="3 7"
                strokeOpacity=".4"
              />
            );
          }),
        )}
        <text
          x="705"
          y="215"
          fill="#839d93"
          fontSize="24"
          letterSpacing="10"
          transform="rotate(75 705 215)"
          fontFamily="Georgia"
        >
          СЕРОЕ МОРЕ
        </text>
        <text
          x="100"
          y="260"
          fill="#97a17d"
          opacity=".35"
          fontSize="17"
          letterSpacing="8"
          fontFamily="Georgia"
        >
          ЧЕРНОЛЕСЬЕ
        </text>
        <text
          x="470"
          y="600"
          fill="#b3ad87"
          opacity=".25"
          fontSize="36"
          letterSpacing="12"
          fontFamily="Georgia"
        >
          ВЕЙР
        </text>
        <path
          d="M880 550v70m-35-35h70m-35-30 8 30-8 30-8-30Z"
          fill="none"
          stroke="#b2a575"
          strokeWidth="1"
        />
        <text x="874" y="540" fill="#b2a575" fontSize="12">
          С
        </text>
      </svg>
      {Object.values(LOCATIONS).map((l) => {
        const current = l.id === here.id;
        const accessible = here.exits.includes(l.id);
        const hidden =
          ['crypt', 'cave'].includes(l.id) &&
          !campaign.world.discovered.includes(l.id) &&
          !campaign.world.visited.includes(l.id);
        if (hidden) return null;
        return (
          <button
            key={l.id}
            className={`map-node ${current ? 'current' : ''} ${accessible ? 'accessible' : ''} ${campaign.world.visited.includes(l.id) ? 'visited' : ''}`}
            style={{ left: `${l.x}%`, top: `${l.y}%` }}
            onClick={() => onTravel(l.id)}
            disabled={busy || !accessible || !!campaign.combat}
            title={
              current
                ? 'Вы здесь'
                : accessible
                  ? 'Отправиться'
                  : `Нет прямой дороги. Ближайшие пути: ${l.exits.map((x) => LOCATIONS[x].name).join(', ')}`
            }
          >
            <span>
              <Icon
                name={
                  l.id === 'tavern'
                    ? 'home'
                    : l.id === 'forest'
                      ? 'leaf'
                      : l.id === 'fortress'
                        ? 'crown'
                        : l.id === 'crypt'
                          ? 'skull'
                          : l.id === 'cave'
                            ? 'mountain'
                            : l.id === 'temple'
                              ? 'fire'
                              : l.id === 'market'
                                ? 'coins'
                                : 'compass'
                }
                size={18}
              />
            </span>
            <b>{l.name}</b>
            {current && <small>ВЫ ЗДЕСЬ</small>}
          </button>
        );
      })}
      <div className="map-legend">
        <span>
          <i className="gold-dot" /> Ваше местоположение
        </span>
        <span>
          <i /> Известные дороги
        </span>
        <span>Нажмите на соседнее место, чтобы отправиться в путь</span>
      </div>
    </div>
  );
}
