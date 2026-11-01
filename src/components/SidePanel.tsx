import { CLASSES, LOCATIONS, NPCS } from '../lib/content';
import { ru, modifier, signed, gameTime } from '../lib/i18n';
import type { Attribute, PublicCampaign, View } from '../lib/types';
import { Icon } from './Icons';
import { Portrait } from './Portrait';
export function SidePanel({
  campaign,
  onView,
  onAction,
  busy,
}: {
  campaign: PublicCampaign;
  onView: (v: View) => void;
  onAction: (text: string) => void;
  busy: boolean;
}) {
  const h = campaign.hero;
  const loc = LOCATIONS[campaign.world.location];
  const q =
    campaign.world.quests.find((q) => q.status === 'active') ??
    campaign.world.quests.find((q) => q.status === 'rumor');
  return (
    <aside className="side-panel">
      <div className="side-label">
        ВАШ ПУТНИК <span>СОЛО</span>
      </div>
      <button className="hero-card" onClick={() => onView('character')}>
        <div className="hero-portrait">
          <Portrait index={h.portrait} />
          <span>{h.level}</span>
        </div>
        <h2>{h.name}</h2>
        <p>
          {h.ancestry} · {CLASSES[h.classId].name}
        </p>
        <div className="hero-background">{h.background}</div>
      </button>
      <div className="resources">
        <div className="resource-label">
          <span>
            <Icon name="heart" size={13} />
            Здоровье
          </span>
          <b>
            {h.hp}
            <small> / {h.maxHp}</small>
          </b>
        </div>
        <div className="resource-bar health">
          <i style={{ width: `${(h.hp / h.maxHp) * 100}%` }} />
        </div>
        <div className="resource-label">
          <span>
            <Icon name="wand" size={13} />
            Мана
          </span>
          <b>
            {h.mana}
            <small> / {h.maxMana}</small>
          </b>
        </div>
        <div className="resource-bar mana">
          <i style={{ width: `${(h.mana / h.maxMana) * 100}%` }} />
        </div>
        <div className="xp-label">
          <span>Уровень {h.level}</span>
          <span>
            {h.xp} / {h.level * 100} опыта
          </span>
        </div>
        <div className="resource-bar xp">
          <i style={{ width: `${(h.xp / (h.level * 100)) * 100}%` }} />
        </div>
      </div>
      <div className="side-attributes">
        {Object.entries(h.attributes).map(([id, n]) => (
          <div key={id} title={ru.attributes[id as Attribute]}>
            <small>{ru.attributes[id as Attribute].slice(0, 3).toUpperCase()}</small>
            <b>{signed(modifier(n))}</b>
          </div>
        ))}
      </div>
      {h.conditions.length > 0 && (
        <div className="conditions">
          {h.conditions.map((s) => (
            <span key={s}>
              <Icon name="help" size={12} />
              {s}
            </span>
          ))}
        </div>
      )}
      <div className="side-coins">
        <Icon name="coins" size={17} />
        <strong>{h.gold}</strong>
        <span>монет</span>
        <button
          title="Открыть инвентарь"
          aria-label="Открыть инвентарь"
          onClick={() => onView('inventory')}
        >
          <Icon name="bag" size={16} />
        </button>
      </div>
      <section className="nearby">
        <div className="side-label">
          РЯДОМ С ВАМИ <Icon name="eye" size={13} />
        </div>
        {loc.npcs.length ? (
          loc.npcs
            .filter((id) => campaign.world.npcs[id].alive)
            .map((id) => (
              <button
                key={id}
                className="nearby-npc"
                onClick={() => onAction(`Поговорить с ${NPCS[id].name}`)}
                disabled={busy || !!campaign.combat || campaign.world.destroyed.includes(loc.id)}
              >
                <Portrait index={NPCS[id].portrait} />
                <div>
                  <b>{NPCS[id].name}</b>
                  <small>{NPCS[id].role}</small>
                </div>
                <Icon name="talk" size={14} />
              </button>
            ))
        ) : (
          <p className="muted small">Только вы и неизвестность.</p>
        )}
      </section>
      {q && (
        <button className="side-quest" onClick={() => onView('journal')}>
          <div className="side-label">
            <Icon name="scroll" size={12} />
            {q.status === 'rumor' ? 'СЛУХИ ВЕЙРА' : 'НИТЬ ИСТОРИИ'}
          </div>
          <h3>{q.title}</h3>
          <p>{q.objective}</p>
          <span>
            Дневник <Icon name="arrow" size={13} />
          </span>
        </button>
      )}
      <div className="side-location">
        <Icon name="moon" size={17} />
        <div>
          <strong>
            День {campaign.world.day} · {gameTime(campaign.world.tick)}
          </strong>
          <small>{loc.weather}</small>
        </div>
      </div>
    </aside>
  );
}
