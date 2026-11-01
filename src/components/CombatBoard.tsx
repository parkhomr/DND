import { useState } from 'react';
import type { Intent, PublicCampaign } from '../lib/types';
import { Icon } from './Icons';
import { Portrait } from './Portrait';
export function CombatBoard({
  campaign,
  onAction,
  busy,
}: {
  campaign: PublicCampaign;
  onAction: (i: Intent) => void;
  busy: boolean;
}) {
  const b = campaign.combat!;
  const [target, setTarget] = useState('enemy-1');
  const alive = b.enemies.filter((e) => e.hp > 0);
  const selected = alive.find((e) => e.id === target) ?? alive[0];
  return (
    <div className="combat-view">
      <div className="combat-heading">
        <span>
          <Icon name="sword" /> ТАКТИЧЕСКИЙ БОЙ
        </span>
        <b>Раунд {b.round}</b>
        <span className="your-turn">
          <i className="live-dot" />
          Ваш ход
        </span>
      </div>
      <p className="combat-help">
        <Icon name="foot" size={15} />
        {b.moved
          ? 'Перемещение использовано. Выберите действие.'
          : 'Нажмите на свободную клетку, чтобы пройти до 3 клеток.'}
      </p>
      <div className="battlefield" role="group" aria-label="Поле боя: 12 на 8 клеток">
        {b.tiles.map((t) => {
          const hero = b.player.x === t.x && b.player.y === t.y;
          const enemy = b.enemies.find((e) => e.x === t.x && e.y === t.y && e.hp > 0);
          const near = Math.abs(b.player.x - t.x) + Math.abs(b.player.y - t.y) <= 3 && !b.moved;
          return (
            <button
              key={`${t.x},${t.y}`}
              className={`tile ${t.type} ${hero ? 'hero-tile' : ''} ${enemy ? 'enemy-tile' : ''} ${enemy?.id === selected?.id ? 'selected-target' : ''} ${near && t.type === 'floor' ? 'reachable' : ''}`}
              title={
                hero
                  ? campaign.hero.name
                  : enemy
                    ? `${enemy.name} · ${enemy.hp}/${enemy.maxHp}`
                    : `Клетка ${t.x}, ${t.y}`
              }
              aria-label={
                hero
                  ? 'Ваш персонаж'
                  : enemy
                    ? `${enemy.name}, ${enemy.hp} здоровья`
                    : `Клетка ${t.x}, ${t.y}`
              }
              disabled={busy || (!enemy && (t.type === 'wall' || t.type === 'water' || hero))}
              onClick={() =>
                enemy
                  ? setTarget(enemy.id)
                  : onAction({ kind: 'move', target: `${t.x},${t.y}`, detail: '' })
              }
            >
              {hero ? (
                <>
                  <Portrait index={campaign.hero.portrait} />
                  <span className="unit-hp">
                    <i style={{ width: `${(campaign.hero.hp / campaign.hero.maxHp) * 100}%` }} />
                  </span>
                </>
              ) : enemy ? (
                <>
                  <Icon name="skull" size={23} />
                  <span className="unit-hp enemy-hp">
                    <i style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%` }} />
                  </span>
                </>
              ) : t.type === 'wall' ? (
                <span className="rock" />
              ) : t.type === 'rubble' ? (
                <span className="rubble-mark">⋄</span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="enemy-roster">
        {alive.map((e) => (
          <button
            key={e.id}
            className={e.id === selected?.id ? 'active' : ''}
            onClick={() => setTarget(e.id)}
          >
            <Icon name="skull" size={15} />
            <span>{e.name}</span>
            <b>
              {e.hp}
              <small>/{e.maxHp}</small>
            </b>
          </button>
        ))}
      </div>
      <div className="combat-actions">
        <button
          className="button primary"
          disabled={busy}
          onClick={() => onAction({ kind: 'attack', target: selected?.id ?? '', detail: '' })}
        >
          <Icon name="sword" />
          Атаковать
        </button>
        {campaign.hero.classId === 'mage' && (
          <button
            className="button"
            disabled={busy || campaign.hero.mana < 2}
            onClick={() => onAction({ kind: 'cast', target: selected?.id ?? '', detail: '' })}
          >
            <Icon name="fire" />
            Искра <small>2 маны</small>
          </button>
        )}
        {['warden', 'warrior'].includes(campaign.hero.classId) && (
          <button
            className="button"
            disabled={busy}
            onClick={() => onAction({ kind: 'cast', target: 'лечение', detail: '' })}
          >
            <Icon name="heart" />
            {campaign.hero.classId === 'warrior' ? 'Второе дыхание' : 'Живой свет'}
          </button>
        )}
        <button
          className="button"
          disabled={busy}
          onClick={() => onAction({ kind: 'guard', target: '', detail: '' })}
        >
          <Icon name="shield" />
          Защита
        </button>
        <button
          className="button quiet"
          disabled={busy}
          onClick={() => onAction({ kind: 'flee', target: '', detail: '' })}
        >
          <Icon name="foot" />
          Отступить
        </button>
      </div>
      <small className="combat-footnote">
        Ближняя атака — с соседней клетки · зелье расходует действие · укрытия блокируют заклинания
      </small>
    </div>
  );
}
