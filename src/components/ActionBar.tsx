import { useRef, useState } from 'react';
import type { Command, PublicCampaign, Roll, View } from '../lib/types';
import { LOCATIONS } from '../lib/content';
import { Icon } from './Icons';
export function ActionBar({
  campaign,
  onCommand,
  onView,
  busy,
}: {
  campaign: PublicCampaign;
  onCommand: (c: Command) => void;
  onView: (v: View) => void;
  busy: boolean;
}) {
  const [text, setText] = useState('');
  const [diceOpen, setDiceOpen] = useState(false);
  const [mode, setMode] = useState<Roll['mode']>('normal');
  const input = useRef<HTMLTextAreaElement>(null);
  const submit = () => {
    if (!text.trim() || busy) return;
    onCommand({ type: 'text', text: text.trim() });
    setText('');
  };
  const suggestions = campaign.combat
    ? ['Атаковать противника', 'Защитная стойка', 'Попытаться отступить']
    : LOCATIONS[campaign.world.location].suggestions;
  return (
    <div className="action-area">
      <div className="suggestions">
        <span>ЧТО ВЫ СДЕЛАЕТЕ?</span>
        {suggestions.map((s, i) => (
          <button key={s} disabled={busy} onClick={() => onCommand({ type: 'text', text: s })}>
            <Icon name={['talk', 'search', 'compass'][i]} size={14} />
            {s}
            <Icon name="up" size={12} />
          </button>
        ))}
      </div>
      <form
        className={`action-composer ${busy ? 'busy' : ''}`}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="composer-icon">
          <Icon name="feather" size={24} />
        </div>
        <div className="composer-input">
          <label htmlFor="action-input">ВАШ ХОД · ЧТО ВЫ ХОТИТЕ ПРЕДПРИНЯТЬ?</label>
          <textarea
            id="action-input"
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            maxLength={1500}
            placeholder={
              campaign.combat
                ? 'Опишите действие в бою…'
                : 'Я подхожу к незнакомке и спрашиваю о колоколе…'
            }
            disabled={busy}
          />
        </div>
        <button
          className="send-button"
          type="submit"
          aria-label="Совершить действие"
          title="Совершить действие · Enter"
          disabled={busy || !text.trim()}
        >
          <Icon name={busy ? 'loading' : 'arrow'} className={busy ? 'spin' : ''} size={22} />
        </button>
      </form>
      <div className="composer-hint">
        <span>
          <span className="live-dot" />
          Вы можете попробовать что угодно. Успех не гарантирован.
        </span>
        <span>
          <kbd>↵</kbd> действие <kbd>Shift ↵</kbd> новая строка
        </span>
      </div>
      <div className="bottom-toolbar">
        <div className="tool-group">
          {(['inventory', 'character', 'journal', 'map'] as View[]).map((v, i) => (
            <button
              key={v}
              aria-label={['Инвентарь', 'Персонаж', 'Дневник', 'Карта'][i]}
              onClick={() => onView(v)}
              title={['Инвентарь · I', 'Персонаж · C', 'Дневник · J', 'Карта мира · M'][i]}
            >
              <Icon name={['bag', 'user', 'book', 'map'][i]} size={19} />
              <span>{['Инвентарь', 'Персонаж', 'Дневник', 'Карта'][i]}</span>
              <kbd>{['I', 'C', 'J', 'M'][i]}</kbd>
            </button>
          ))}
        </div>
        <div className="quick-slots">
          <button
            aria-label="Использовать зелье исцеления"
            title="Использовать зелье исцеления"
            disabled={busy || !campaign.hero.inventory.potion}
            onClick={() =>
              onCommand({ type: 'intent', intent: { kind: 'use', target: 'potion', detail: '' } })
            }
          >
            <Icon name="potion" size={21} />
            <span>{campaign.hero.inventory.potion ?? 0}</span>
          </button>
          <button
            title="Отдохнуть (в таверне — 5 монет)"
            disabled={busy || !!campaign.combat}
            onClick={() =>
              onCommand({ type: 'intent', intent: { kind: 'rest', target: '', detail: '' } })
            }
          >
            <Icon name="camp" size={21} />
          </button>
          <div className="dice-control">
            <button
              className={diceOpen ? 'active' : ''}
              aria-expanded={diceOpen}
              title="Бросить кость"
              onClick={() => setDiceOpen(!diceOpen)}
            >
              <Icon name="dice" size={23} />
            </button>
            {diceOpen && (
              <div className="dice-popover">
                <h3>Доверьтесь судьбе</h3>
                <p>Свободные броски не меняют мир.</p>
                <label htmlFor="roll-mode">Условия броска</label>
                <select
                  id="roll-mode"
                  value={mode}
                  onChange={(e) => setMode(e.target.value as Roll['mode'])}
                >
                  <option value="normal">Обычный бросок</option>
                  <option value="advantage">Преимущество</option>
                  <option value="disadvantage">Помеха</option>
                </select>
                <div>
                  {[4, 6, 8, 10, 12, 20].map((n) => (
                    <button
                      key={n}
                      disabled={busy}
                      onClick={() => {
                        onCommand({ type: 'roll', sides: n, mode });
                        setDiceOpen(false);
                      }}
                    >
                      к{n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
