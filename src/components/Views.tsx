import { useEffect, useState } from 'react';
import { CLASSES, ITEMS, LOCATIONS } from '../lib/content';
import type { Attribute, Intent, ProviderStatus, PublicCampaign, View } from '../lib/types';
import { modifier, ru, signed } from '../lib/i18n';
import { api, post } from '../lib/api';
import { Icon } from './Icons';
import { Portrait } from './Portrait';
import { WorldMap } from './WorldMap';
export interface Preferences {
  sound: boolean;
  volume: number;
  particles: boolean;
  reducedMotion: boolean;
  largeText: boolean;
}
export const defaultPreferences: Preferences = {
  sound: false,
  volume: 0.35,
  particles: true,
  reducedMotion: false,
  largeText: false,
};
export function PageHeader({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow gold">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-seal">
        <Icon name={icon} size={34} />
      </div>
    </div>
  );
}
export function SettingsView({
  preferences,
  onPreferences,
  provider,
}: {
  preferences: Preferences;
  onPreferences: (p: Preferences) => void;
  provider: ProviderStatus;
}) {
  const change = (key: keyof Preferences, value: boolean | number) =>
    onPreferences({ ...preferences, [key]: value });
  return (
    <div className="content-page settings-page">
      <PageHeader
        eyebrow="ВАШ МИР — ВАШ РИТМ"
        title="Настройки"
        description="Пусть ничто не отвлекает от вашей истории."
        icon="settings"
      />
      <section className="settings-card">
        <h2>
          <Icon name="music" />
          Атмосфера
        </h2>
        <Toggle
          title="Звуки мира"
          description="Тихий дождь и звуковой отклик на действия. По умолчанию выключены."
          value={preferences.sound}
          onChange={(v) => change('sound', v)}
        />
        <div className="setting-row">
          <div>
            <b>Громкость</b>
            <small>Окружение и эффекты</small>
          </div>
          <input
            type="range"
            aria-label="Громкость"
            min="0"
            max="1"
            step="0.05"
            value={preferences.volume}
            onChange={(e) => change('volume', Number(e.target.value))}
          />
          <span>{Math.round(preferences.volume * 100)}%</span>
        </div>
        <Toggle
          title="Частицы и погода"
          description="Искры, туман и дождь в сценах."
          value={preferences.particles}
          onChange={(v) => change('particles', v)}
        />
        <Toggle
          title="Уменьшить движение"
          description="Отключить атмосферные анимации и переходы."
          value={preferences.reducedMotion}
          onChange={(v) => change('reducedMotion', v)}
        />
        <Toggle
          title="Крупный текст"
          description="Увеличить текст летописи для удобного чтения."
          value={preferences.largeText}
          onChange={(v) => change('largeText', v)}
        />
      </section>
      <section className="settings-card">
        <h2>
          <Icon name="feather" />
          Мастер игры
        </h2>
        <div className="provider-card">
          <span className="live-dot" />
          <b>{provider.mode === 'demo' ? 'Авторская симуляция' : 'Подключён ИИ-мастер'}</b>
          <p>{provider.description}</p>
          {provider.mode === 'demo' && (
            <small>
              Подключение ИИ настраивается владельцем игры на сервере. Ключи не вводятся в браузере.
              Инструкция — в файле README.md проекта.
            </small>
          )}
        </div>
        <p className="settings-note">
          Состояние мира и броски всегда рассчитывает сервер. При недоступности ИИ игра использует
          ограниченную симуляцию и сообщает об этом в летописи.
        </p>
      </section>
      <section className="settings-card">
        <h2>
          <Icon name="help" />
          Под рукой
        </h2>
        <div className="shortcuts">
          {[
            ['I', 'Инвентарь'],
            ['C', 'Персонаж'],
            ['J', 'Дневник'],
            ['M', 'Карта'],
            ['Esc', 'Вернуться к приключению'],
            ['Enter', 'Выполнить действие'],
          ].map(([key, label]) => (
            <div key={key}>
              <kbd>{key}</kbd>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <p className="settings-note">
          Игровые правила — адаптация открытого SRD 5.1. Это самостоятельная облегчённая система, а
          не полная реализация настольных правил.{' '}
          <a href="/credits.html" target="_blank" rel="noreferrer">
            Авторы и лицензии <Icon name="up" size={12} />
          </a>
        </p>
      </section>
    </div>
  );
}
function Toggle({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <b>{title}</b>
        <small>{description}</small>
      </div>
      <button
        className={`toggle ${value ? 'on' : ''}`}
        role="switch"
        aria-label={title}
        aria-checked={value}
        onClick={() => onChange(!value)}
      >
        <span />
      </button>
    </div>
  );
}
export function CampaignView({
  view,
  campaign,
  onAction,
  busy,
  onLoaded,
  onError,
}: {
  view: View;
  campaign: PublicCampaign;
  onAction: (i: Intent) => void;
  busy: boolean;
  onLoaded: (c: PublicCampaign) => void;
  onError: (m: string) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<string | null>(null);
  const h = campaign.hero;
  if (view === 'map')
    return (
      <div className="content-page map-page">
        <PageHeader
          eyebrow="ЗЕМЛИ ПЕРВОГО ЗВОНА"
          title="Карта пограничья"
          description="Дорога не выбирает за вас. Светлые метки — места, куда можно отправиться сейчас."
          icon="compass"
        />
        <WorldMap
          campaign={campaign}
          busy={busy}
          onTravel={(id) => onAction({ kind: 'travel', target: id, detail: '' })}
        />
        <div className="map-location-cards">
          {LOCATIONS[campaign.world.location].exits.map((id) => (
            <button
              disabled={busy || !!campaign.combat}
              key={id}
              onClick={() => onAction({ kind: 'travel', target: id, detail: '' })}
            >
              <Icon name="compass" />
              <div>
                <b>{LOCATIONS[id].name}</b>
                <small>{LOCATIONS[id].subtitle} · 15 минут</small>
              </div>
              <Icon name={id === 'crypt' && !h.inventory.key ? 'lock' : 'arrow'} />
            </button>
          ))}
        </div>
      </div>
    );
  if (view === 'inventory') {
    const items = Object.entries(h.inventory).filter(
      ([id, n]) => n > 0 && (filter === 'all' || ITEMS[id].type === filter),
    );
    const item = selected ? ITEMS[selected] : null;
    const weight = Object.entries(h.inventory).reduce(
      (n, [id, count]) => n + (ITEMS[id]?.weight ?? 0) * count,
      0,
    );
    const market = campaign.world.location === 'market';
    return (
      <div className="content-page inventory-page">
        <PageHeader
          eyebrow="ТО, ЧТО ВЫ НЕСЁТЕ С СОБОЙ"
          title="Инвентарь"
          description="Некоторые вещи весят больше, чем кажется. Особенно — чужие тайны."
          icon="bag"
        />
        <div className="inventory-summary">
          <span>
            <Icon name="coins" />
            {h.gold} <small>монет</small>
          </span>
          <span>
            <Icon name="bag" />
            {weight.toFixed(1)} <small>вес · без штрафа</small>
          </span>
          <span>
            <Icon name="shield" />
            {Object.values(h.equipment).filter(Boolean).length} <small>предмета надето</small>
          </span>
        </div>
        <div className="inventory-tabs">
          {[
            ['all', 'Всё'],
            ['weapon', 'Оружие'],
            ['armor', 'Доспехи'],
            ['consumable', 'Расходуемое'],
            ['quest', 'Важное'],
            ['trinket', 'Редкости'],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? 'active' : ''}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="inventory-layout">
          <div className="item-grid">
            {items.map(([id, count]) => {
              const it = ITEMS[id];
              const equipped = Object.values(h.equipment).includes(id);
              return (
                <button
                  key={id}
                  className={`item-card ${selected === id ? 'selected' : ''} ${it.type === 'quest' ? 'quest-item' : ''}`}
                  onClick={() => setSelected(id)}
                >
                  <div className="item-icon">
                    <Icon name={it.icon} size={32} />
                  </div>
                  {equipped && (
                    <span className="equipped-dot" title="Надето">
                      <Icon name="check" size={12} />
                    </span>
                  )}
                  <b>{it.name}</b>
                  <small>
                    {count > 1
                      ? `${count} шт.`
                      : it.type === 'quest'
                        ? 'Сюжетный предмет'
                        : equipped
                          ? 'Надето'
                          : `${it.weight} вес`}
                  </small>
                </button>
              );
            })}
            {!items.length && (
              <div className="empty-state">
                <Icon name="bag" size={36} />
                <h3>Здесь пока пусто</h3>
                <p>В дороге обязательно что-нибудь найдётся.</p>
              </div>
            )}
          </div>
          <aside className="item-details">
            {item ? (
              <>
                <div className={`item-showcase ${item.type === 'quest' ? 'quest-item' : ''}`}>
                  <Icon name={item.icon} size={64} />
                </div>
                <span className="eyebrow gold">
                  {item.type === 'quest'
                    ? 'НИТЬ ИСТОРИИ'
                    : item.type === 'consumable'
                      ? 'РАСХОДУЕМЫЙ ПРЕДМЕТ'
                      : 'СНАРЯЖЕНИЕ'}
                </span>
                <h2>{item.name}</h2>
                <p>{item.description}</p>
                <div className="item-meta">
                  <span>
                    Вес <b>{item.weight}</b>
                  </span>
                  <span>
                    Цена <b>{item.price} монет</b>
                  </span>
                </div>
                {item.type === 'consumable' && (
                  <button
                    disabled={busy || !h.inventory[item.id]}
                    className="button primary"
                    onClick={() => onAction({ kind: 'use', target: item.id, detail: '' })}
                  >
                    <Icon name="potion" />
                    Использовать
                  </button>
                )}
                {['armor', 'weapon', 'trinket'].includes(item.type) && (
                  <button
                    disabled={busy || !h.inventory[item.id]}
                    className="button primary"
                    onClick={() => onAction({ kind: 'equip', target: item.id, detail: '' })}
                  >
                    <Icon name="shield" />
                    {Object.values(h.equipment).includes(item.id) ? 'Экипировано' : 'Экипировать'}
                  </button>
                )}
                {market && item.type !== 'quest' && (
                  <button
                    disabled={
                      busy || Object.values(h.equipment).includes(item.id) || !h.inventory[item.id]
                    }
                    className="button"
                    onClick={() => onAction({ kind: 'sell', target: item.id, detail: '' })}
                  >
                    <Icon name="coins" />
                    Продать за {Math.floor(item.price / 2)}
                  </button>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Icon name="eye" size={36} />
                <h3>У каждой вещи своя история</h3>
                <p>Выберите предмет, чтобы рассмотреть его.</p>
              </div>
            )}
          </aside>
        </div>
        {!campaign.world.destroyed.includes(campaign.world.location) &&
          campaign.world.npcs[market ? 'silas' : 'mara'].alive &&
          (market || campaign.world.location === 'tavern') && (
            <section className="shop-section">
              <div className="section-heading">
                <h2>
                  <Icon name="coins" /> {market ? 'Лавка Силаса' : 'Припасы Мары'}
                </h2>
                <span className="eyebrow">ТОЛЬКО РЕАЛЬНЫЕ СДЕЛКИ</span>
              </div>
              <div className="shop-items">
                {Object.entries(campaign.world.stock)
                  .filter(
                    ([id, n]) => n > 0 && (market || ['bread', 'potion', 'ether'].includes(id)),
                  )
                  .map(([id, count]) => {
                    const it = ITEMS[id];
                    const price = it.price + (id === 'bread' && campaign.world.flags.tax ? 2 : 0);
                    return (
                      <button
                        key={id}
                        disabled={busy || h.gold < price || !!campaign.combat}
                        onClick={() => onAction({ kind: 'buy', target: id, detail: '' })}
                      >
                        <Icon name={it.icon} size={25} />
                        <div>
                          <b>{it.name}</b>
                          <small>В наличии: {count}</small>
                        </div>
                        <strong>
                          {price} <Icon name="coins" size={12} />
                        </strong>
                      </button>
                    );
                  })}
              </div>
            </section>
          )}
      </div>
    );
  }
  if (view === 'character') {
    const a = ITEMS[h.equipment.armor];
    const ac =
      (a.ac ?? 10) +
      (a.id === 'chain' ? 0 : Math.min(modifier(h.attributes.dex), a.id === 'leather' ? 2 : 10));
    return (
      <div className="content-page character-page">
        <PageHeader
          eyebrow="ЛИЦО ВАШЕЙ ИСТОРИИ"
          title={h.name}
          description={`${h.ancestry} · ${CLASSES[h.classId].name} · ${h.background}`}
          icon="user"
        />
        <div className="character-sheet">
          <div className="sheet-portrait">
            <Portrait index={h.portrait} />
            <div>
              <b>{h.level}</b>
              <span>уровень</span>
            </div>
          </div>
          <div className="sheet-info">
            <div className="sheet-vitals">
              <span>
                <Icon name="heart" />
                <b>
                  {h.hp}/{h.maxHp}
                </b>
                Здоровье
              </span>
              <span>
                <Icon name="shield" />
                <b>{ac}</b>Класс брони
              </span>
              <span>
                <Icon name="wand" />
                <b>
                  {h.mana}/{h.maxMana}
                </b>
                Мана
              </span>
              <span>
                <Icon name="star" />
                <b>
                  {h.xp}/{h.level * 100}
                </b>
                Опыт
              </span>
            </div>
            <div className="attribute-grid large">
              {Object.entries(h.attributes).map(([id, v]) => (
                <div key={id}>
                  <small>{ru.attributes[id as Attribute]}</small>
                  <b>{v}</b>
                  <span>{signed(modifier(v))}</span>
                </div>
              ))}
            </div>
            <div className="sheet-ability">
              <Icon name="star" size={22} />
              <div>
                <h3>Особое умение</h3>
                <p>{CLASSES[h.classId].ability}</p>
              </div>
            </div>
            <div className="sheet-equipment">
              <h3>Ваше снаряжение</h3>
              {Object.entries(h.equipment)
                .filter(([, id]) => id)
                .map(([slot, id]) => (
                  <div key={slot}>
                    <Icon name={ITEMS[id].icon} />
                    <span>{ITEMS[id].name}</span>
                    <small>
                      {slot === 'weapon' ? 'Оружие' : slot === 'armor' ? 'Доспех' : 'Талисман'}
                    </small>
                  </div>
                ))}
            </div>
          </div>
        </div>
        <section className="faction-section">
          <h2>Ваше имя в Вейре</h2>
          <p className="muted">
            {campaign.world.wanted > 0
              ? `Розыск: ${campaign.world.wanted}. Свидетели помнят ваши преступления.`
              : 'Стража пока не интересуется вашими делами.'}
          </p>
          <div className="faction-grid">
            {campaign.world.factions.map((f) => (
              <div key={f.id}>
                <Icon
                  name={
                    f.id === 'court'
                      ? 'crown'
                      : f.id === 'threads'
                        ? 'feather'
                        : f.id === 'flame'
                          ? 'fire'
                          : 'coins'
                  }
                  size={22}
                />
                <div>
                  <h3>{f.name}</h3>
                  <p>{f.goal}</p>
                  <div className="faction-meta">
                    <span>
                      Репутация{' '}
                      <b className={f.reputation < 0 ? 'danger' : 'gold'}>{signed(f.reputation)}</b>
                    </span>
                    <span>Влияние {f.progress}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }
  if (view === 'journal')
    return (
      <div className="content-page journal-page">
        <PageHeader
          eyebrow="СЛОВА, КОТОРЫЕ ОСТАНУТСЯ"
          title="Дневник путника"
          description="Обещания можно нарушить. Истории можно оставить незаконченными. Мир пойдёт дальше."
          icon="book"
        />
        <div className="journal-layout">
          <section>
            <div className="section-heading">
              <h2>Нити истории</h2>
              <small>
                {campaign.world.quests.filter((q) => q.status === 'completed').length} /{' '}
                {campaign.world.quests.length} завершено
              </small>
            </div>
            {campaign.world.quests.map((q, i) => (
              <article key={q.id} className={`quest-card ${q.status}`}>
                <div className="quest-number">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <span className="quest-status">
                    {q.status === 'active'
                      ? 'В пути'
                      : q.status === 'completed'
                        ? 'Завершено'
                        : q.status === 'failed'
                          ? 'Возможность упущена'
                          : 'Непроверенный слух'}
                  </span>
                  <h2>{q.title}</h2>
                  <p>{q.description}</p>
                  <div className="quest-objective">
                    <Icon name={q.status === 'completed' ? 'check' : 'compass'} size={17} />
                    {q.status === 'completed'
                      ? 'Эта история стала частью вашей легенды.'
                      : q.status === 'failed'
                        ? 'Обстоятельства изменились. Ищите другой путь в мире.'
                        : q.objective}
                  </div>
                </div>
              </article>
            ))}
          </section>
          <aside className="world-facts">
            <h2>
              <Icon name="feather" />
              Память мира
            </h2>
            {campaign.world.facts.length ? (
              campaign.world.facts.map((f, i) => (
                <p key={i}>
                  <span className="tiny-diamond" />
                  {f}
                </p>
              ))
            ) : (
              <div className="empty-state">
                <p>Ваши поступки ещё не изменили Вейр. Но ночь только начинается.</p>
              </div>
            )}
            <h3>Открытые места</h3>
            <div className="discovered-list">
              {campaign.world.visited.map((id) => (
                <span key={id}>
                  <Icon name="compass" size={14} />
                  {LOCATIONS[id].name}
                </span>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  if (view === 'saves')
    return <SavesView campaign={campaign} busy={busy} onLoaded={onLoaded} onError={onError} />;
  if (view === 'lobby')
    return (
      <div className="content-page">
        <PageHeader
          eyebrow="ИСТОРИИ СТАНОВЯТСЯ ЛУЧШЕ ВМЕСТЕ"
          title="У костра есть место"
          description="В этой версии Вейр ждёт одного путника."
          icon="users"
        />
        <div className="lobby-card">
          <Icon name="camp" size={64} />
          <h2>Пока — одиночное путешествие</h2>
          <p>
            Совместная игра на 2–5 участников ещё не реализована. Кампания, персонажи и сохранения
            уже хранятся на сервере, но комнаты и синхронизация ходов требуют отдельной разработки.
          </p>
          <div className="lobby-slots">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i}>
                {i === 0 ? <Portrait index={h.portrait} /> : <Icon name="lock" size={22} />}
                <span>{i === 0 ? h.name : 'В будущем'}</span>
              </div>
            ))}
          </div>
          <span className="status-pill">Одиночная кампания · серверные сохранения</span>
        </div>
      </div>
    );
  return null;
}
function SavesView({
  campaign,
  busy,
  onLoaded,
  onError,
}: {
  campaign: PublicCampaign;
  busy: boolean;
  onLoaded: (c: PublicCampaign) => void;
  onError: (m: string) => void;
}) {
  const [saves, setSaves] = useState<{ id: string; name: string; createdAt: string }[]>([]);
  const [name, setName] = useState('У порога неизвестности');
  const [working, setWorking] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const refresh = () =>
    api<typeof saves>(`/campaigns/${campaign.id}/saves`)
      .then(setSaves)
      .catch((e) => onError(e.message));
  useEffect(() => {
    void refresh();
  }, [campaign.id]);
  async function save() {
    setWorking(true);
    try {
      await post(`/campaigns/${campaign.id}/saves`, { name });
      await refresh();
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  async function load(id: string) {
    setWorking(true);
    try {
      const c = await post<PublicCampaign>(`/campaigns/${campaign.id}/load`, { saveId: id });
      onLoaded(c);
      setConfirm(null);
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <div className="content-page saves-page">
      <PageHeader
        eyebrow="ВЕРНУТЬСЯ К НУЖНОЙ СТРАНИЦЕ"
        title="Сохранения"
        description="Каждое действие сохраняется автоматически. Здесь можно оставить отдельную закладку в истории."
        icon="save"
      />
      <div className="autosave-card">
        <Icon name="check" size={25} />
        <div>
          <h3>Автосохранение включено</h3>
          <p>Последнее изменение: {new Date(campaign.updatedAt).toLocaleString('ru-RU')}</p>
        </div>
        <span className="live-dot" />
      </div>
      <div className="manual-save">
        <label className="field-label" htmlFor="save-name">
          НОВАЯ ЗАКЛАДКА
        </label>
        <div>
          <input
            id="save-name"
            className="field"
            value={name}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            className="button primary"
            disabled={working || busy || !name.trim()}
            onClick={() => void save()}
          >
            <Icon name="save" />
            Сохранить
          </button>
        </div>
      </div>
      <div className="save-list">
        {saves.map((s) => (
          <div key={s.id}>
            <div className="save-icon">
              <Icon name="book" size={25} />
            </div>
            <div>
              <h3>{s.name}</h3>
              <p>{new Date(s.createdAt).toLocaleString('ru-RU')}</p>
            </div>
            {confirm === s.id ? (
              <div className="save-confirm">
                <span>Вернуться к этой закладке?</span>
                <button
                  className="button"
                  disabled={working || busy}
                  onClick={() => void load(s.id)}
                >
                  Да, загрузить
                </button>
                <button className="text-button" onClick={() => setConfirm(null)}>
                  Отмена
                </button>
              </div>
            ) : (
              <button
                className="button"
                disabled={working || busy}
                onClick={() => setConfirm(s.id)}
              >
                <Icon name="undo" size={15} />
                Загрузить
              </button>
            )}
          </div>
        ))}
        {!saves.length && (
          <div className="empty-state">
            <Icon name="book" size={40} />
            <h3>История ещё без закладок</h3>
            <p>Автосохранение уже бережёт ваш прогресс.</p>
          </div>
        )}
      </div>
      <a className="button quiet" href={`/api/campaigns/${campaign.id}/export`} download>
        <Icon name="download" size={16} />
        Выгрузить видимую хронику
      </a>
      <CampaignList
        current={campaign.id}
        disabled={busy || working}
        onLoaded={onLoaded}
        onError={onError}
      />
      <p className="settings-note">
        Выгрузка предназначена для чтения; импорт кампаний в этой версии не поддерживается. Для
        резервной копии сохранений скопируйте файл базы данных после остановки сервера.
      </p>
    </div>
  );
}

function CampaignList({
  current,
  disabled,
  onLoaded,
  onError,
}: {
  current: string;
  disabled: boolean;
  onLoaded: (c: PublicCampaign) => void;
  onError: (m: string) => void;
}) {
  const [list, setList] = useState<
    {
      id: string;
      name: string;
      classId: keyof typeof CLASSES;
      level: number;
      portrait: number;
      location: keyof typeof LOCATIONS;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api<typeof list>('/campaigns')
      .then(setList)
      .catch((e) => onError(e.message));
  }, [current]);
  async function select(id: string) {
    setLoading(true);
    try {
      onLoaded(await api<PublicCampaign>(`/campaigns/${id}`));
    } catch (e) {
      onError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="campaign-list">
      <div className="section-heading">
        <h2>Другие истории</h2>
        <small>Путники в этом браузере</small>
      </div>
      {list.map((c) => (
        <button
          key={c.id}
          disabled={disabled || loading || c.id === current}
          onClick={() => void select(c.id)}
        >
          <Portrait index={c.portrait} />
          <div>
            <h3>{c.name}</h3>
            <p>
              {CLASSES[c.classId].name} · уровень {c.level} · {LOCATIONS[c.location].name}
            </p>
          </div>
          {c.id === current ? (
            <span className="status-pill">Текущая</span>
          ) : (
            <Icon name="arrow" size={17} />
          )}
        </button>
      ))}
    </section>
  );
}
