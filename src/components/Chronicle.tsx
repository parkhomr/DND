import { useEffect, useRef, useState } from 'react';
import type { PublicCampaign } from '../lib/types';
import { gameTime, signed } from '../lib/i18n';
import { Icon, Sigil } from './Icons';
export function Chronicle({
  campaign,
  busy,
  visible,
}: {
  campaign: PublicCampaign;
  busy: boolean;
  visible: boolean;
}) {
  const [tab, setTab] = useState('story');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'nearest',
    });
  }, [campaign.events.length, tab, busy, visible]);
  const events = tab === 'dice' ? campaign.events.filter((e) => e.roll) : campaign.events;
  return (
    <aside className="chronicle">
      <div className="chronicle-heading">
        <div className="dm-seal">
          <Sigil size={27} />
        </div>
        <div>
          <span className="eyebrow">ЛЕТОПИСЕЦ ВЕЙРА</span>
          <h2>Голос мира</h2>
        </div>
        <Icon name="feather" size={22} />
      </div>
      <div className="chronicle-tabs">
        <button className={tab === 'story' ? 'active' : ''} onClick={() => setTab('story')}>
          История<span>{campaign.events.length}</span>
        </button>
        <button className={tab === 'dice' ? 'active' : ''} onClick={() => setTab('dice')}>
          <Icon name="dice" size={15} />
          Броски
        </button>
      </div>
      <div className="chronicle-scroll" aria-live="polite" aria-relevant="additions">
        <div className="chronicle-day">
          <span />
          День {campaign.world.day} · Ночь первого звона
          <span />
        </div>
        {events.map((e, index) => (
          <article
            key={e.id}
            className={`story-event ${e.kind} ${index === events.length - 1 ? 'latest' : ''}`}
          >
            <div className="event-meta">
              {e.kind === 'action' ? (
                <>
                  <Icon name="user" size={12} /> ВЫ
                </>
              ) : e.kind === 'dialogue' ? (
                <>
                  <Icon name="talk" size={12} />
                  {e.speaker}
                </>
              ) : e.kind === 'system' ? (
                <>
                  <Icon name="star" size={12} /> НИТЬ СУДЬБЫ
                </>
              ) : e.kind === 'combat' ? (
                <>
                  <Icon name="sword" size={12} /> БОЙ
                </>
              ) : (
                <>
                  <span className="tiny-diamond" /> ЛЕТОПИСЕЦ
                </>
              )}
              <time>{gameTime(e.time)}</time>
            </div>
            <p>{e.text}</p>
            {e.roll && (
              <div
                className={`roll-card ${e.roll.success === true ? 'success' : e.roll.success === false ? 'failure' : ''}`}
              >
                <div className="dice-result">
                  <Icon name="dice" size={28} />
                  <b>{e.roll.kept}</b>
                </div>
                <div>
                  <span>{e.roll.label}</span>
                  <div className="roll-math">
                    к{e.roll.sides}{' '}
                    {e.roll.modifier
                      ? `${signed(e.roll.modifier)} = ${e.roll.total}`
                      : `= ${e.roll.total}`}
                    {e.roll.dc !== undefined && <small> / СЛ {e.roll.dc}</small>}
                  </div>
                  {e.roll.rolls.length > 1 && (
                    <small>
                      {e.roll.mode === 'advantage' ? 'Преимущество' : 'Помеха'}:{' '}
                      {e.roll.rolls.join(', ')}
                    </small>
                  )}
                </div>
                {e.roll.success !== undefined && (
                  <span className="roll-verdict">
                    <Icon name={e.roll.success ? 'check' : 'close'} size={14} />
                    {e.roll.success ? 'Успех' : 'Неудача'}
                  </span>
                )}
              </div>
            )}
          </article>
        ))}
        {busy && (
          <div className="thinking">
            <span />
            <span />
            <span />
            <i>Мир прислушивается…</i>
          </div>
        )}
        <div ref={end} />
      </div>
      <footer className="chronicle-footer">
        <Icon name="leaf" size={13} />
        Мир помнит ваши решения
      </footer>
    </aside>
  );
}
