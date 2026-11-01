import { useCallback, useEffect, useState } from 'react';
import { MainMenu } from './components/MainMenu';
import { CharacterCreator } from './components/CharacterCreator';
import { Icon, Sigil } from './components/Icons';
import { SidePanel } from './components/SidePanel';
import { Chronicle } from './components/Chronicle';
import { SceneArt } from './components/SceneArt';
import { ActionBar } from './components/ActionBar';
import { CombatBoard } from './components/CombatBoard';
import {
  CampaignView,
  SettingsView,
  defaultPreferences,
  type Preferences,
} from './components/Views';
import { LOCATIONS } from './lib/content';
import { ru } from './lib/i18n';
import { api, post } from './lib/api';
import { soundscape } from './lib/audio';
import type {
  CharacterInput,
  Command,
  Intent,
  ProviderStatus,
  PublicCampaign,
  View,
} from './lib/types';
interface CampaignBrief {
  id: string;
  name: string;
}
function loadPreferences(): Preferences {
  try {
    return { ...defaultPreferences, ...JSON.parse(localStorage.getItem('lr_preferences') || '{}') };
  } catch {
    return defaultPreferences;
  }
}
const demo: ProviderStatus = {
  mode: 'demo',
  model: null,
  description: 'Ограниченная авторская симуляция. Полноценная языковая модель не подключена.',
};
export function App() {
  const [screen, setScreen] = useState<'menu' | 'creator' | 'game' | 'settings'>('menu');
  const [view, setView] = useState<View>('play');
  const [campaign, setCampaign] = useState<PublicCampaign | null>(null);
  const [briefs, setBriefs] = useState<CampaignBrief[]>([]);
  const [provider, setProvider] = useState<ProviderStatus>(demo);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preferences, setPreferences] = useState(loadPreferences);
  const [transition, setTransition] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<'world' | 'chronicle'>('world');
  const reportError = useCallback((message: string) => setError(message), []);
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [status, list] = await Promise.all([
          api<{ provider: ProviderStatus }>('/status'),
          api<CampaignBrief[]>('/campaigns'),
        ]);
        if (!active) return;
        setProvider(status.provider);
        setBriefs(list);
        const id = localStorage.getItem('lr_active');
        if (id && list.some((c) => c.id === id)) {
          const c = await api<PublicCampaign>(`/campaigns/${id}`);
          if (active) {
            setCampaign(c);
            setScreen('game');
          }
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    localStorage.setItem('lr_preferences', JSON.stringify(preferences));
    document.documentElement.classList.toggle('reduce-motion', preferences.reducedMotion);
    document.documentElement.classList.toggle('large-text', preferences.largeText);
    void soundscape.set(preferences.sound, preferences.volume).catch(() => {});
  }, [preferences]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 6500);
    return () => clearTimeout(t);
  }, [error]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      if (screen !== 'game') return;
      const keys: Record<string, View> = {
        i: 'inventory',
        ш: 'inventory',
        c: 'character',
        с: 'character',
        j: 'journal',
        о: 'journal',
        m: 'map',
        ь: 'map',
        Escape: 'play',
      };
      if (keys[e.key]) {
        e.preventDefault();
        setView(keys[e.key]);
      }
    }
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [screen]);
  async function create(input: CharacterInput) {
    setBusy(true);
    try {
      const c = await post<PublicCampaign>('/campaigns', input);
      setCampaign(c);
      localStorage.setItem('lr_active', c.id);
      setBriefs((bs) => [{ id: c.id, name: c.hero.name }, ...bs]);
      setTransition(true);
      setView('play');
      setScreen('game');
      setTimeout(() => setTransition(false), 1700);
    } catch (e) {
      reportError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function resume() {
    if (campaign) {
      setScreen('game');
      localStorage.setItem('lr_active', campaign.id);
      return;
    }
    if (!briefs.length) return;
    setBusy(true);
    try {
      const c = await api<PublicCampaign>(`/campaigns/${briefs[0].id}`);
      setCampaign(c);
      localStorage.setItem('lr_active', c.id);
      setScreen('game');
    } catch (e) {
      reportError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function command(cmd: Command) {
    if (!campaign || busy) return;
    setBusy(true);
    try {
      const c = await post<PublicCampaign>(`/campaigns/${campaign.id}/actions`, {
        version: campaign.version,
        requestId: crypto.randomUUID(),
        command: cmd,
      });
      setCampaign(c);
      soundscape.play(
        cmd.type === 'roll'
          ? 'roll'
          : c.combat
            ? 'combat'
            : cmd.type === 'intent' && cmd.intent.kind === 'travel'
              ? 'travel'
              : 'click',
      );
    } catch (e) {
      reportError((e as Error).message);
      try {
        setCampaign(await api<PublicCampaign>(`/campaigns/${campaign.id}`));
      } catch {
        /* Keep last visible state. */
      }
    } finally {
      setBusy(false);
    }
  }
  const action = (intent: Intent) => void command({ type: 'intent', intent });
  function openView(v: View) {
    setView(v);
    setMobilePanel('world');
  }
  const location = campaign ? LOCATIONS[campaign.world.location] : null;
  return (
    <>
      <a className="skip-link" href="#main-content">
        К содержимому
      </a>
      {loading ? (
        <div className="boot-screen">
          <Sigil size={65} />
          <span>МИР ПРОБУЖДАЕТСЯ</span>
          <div className="loading-line" />
        </div>
      ) : screen === 'menu' ? (
        <MainMenu
          hasSave={!!briefs.length || !!campaign}
          loading={busy}
          provider={provider}
          onNew={() => setScreen('creator')}
          onContinue={() => void resume()}
          onSettings={() => setScreen('settings')}
        />
      ) : screen === 'creator' ? (
        <CharacterCreator
          busy={busy}
          onCreate={(c) => void create(c)}
          onBack={() => setScreen('menu')}
        />
      ) : screen === 'settings' ? (
        <div className="standalone-settings">
          <header className="standalone-header">
            <button className="text-button" onClick={() => setScreen('menu')}>
              <Icon name="left" />К главному меню
            </button>
            <div className="brand">
              <Sigil size={28} />
              ЖИВЫЕ МИРЫ
            </div>
          </header>
          <SettingsView
            preferences={preferences}
            onPreferences={setPreferences}
            provider={provider}
          />
        </div>
      ) : campaign && location ? (
        <div className={`game-shell ${mobilePanel === 'chronicle' ? 'show-chronicle' : ''}`}>
          <header className="game-header">
            <button
              className="brand"
              title="Главное меню — прогресс сохранён"
              onClick={() => {
                localStorage.removeItem('lr_active');
                setScreen('menu');
              }}
            >
              <Sigil size={37} />
              <span>
                ЖИВЫЕ МИРЫ<small>ХРОНИКИ ВЕЙРА</small>
              </span>
            </button>
            <nav className="main-nav" aria-label="Главная навигация">
              {(['play', 'map', 'journal'] as View[]).map((v, i) => (
                <button key={v} className={view === v ? 'active' : ''} onClick={() => openView(v)}>
                  <Icon name={['compass', 'map', 'book'][i]} size={16} />
                  {['Приключение', 'Карта мира', 'Дневник'][i]}
                  {v === 'journal' && campaign.world.quests.some((q) => q.status === 'active') && (
                    <i className="nav-dot" />
                  )}
                </button>
              ))}
            </nav>
            <div className="header-tools">
              <span className="save-status">
                <Icon name={busy ? 'loading' : 'check'} className={busy ? 'spin' : ''} size={13} />
                {busy ? 'Мир меняется' : 'Прогресс сохранён'}
              </span>
              <span
                className={`mode-badge ${provider.mode === 'openai' ? 'ai' : ''}`}
                title={provider.description}
              >
                {provider.mode === 'demo' ? 'СИМУЛЯЦИЯ' : 'ИИ-МАСТЕР'}
              </span>
              <button
                aria-label={preferences.sound ? 'Выключить звук' : 'Включить звук'}
                title={preferences.sound ? 'Выключить звук' : 'Включить звук'}
                onClick={() => setPreferences({ ...preferences, sound: !preferences.sound })}
              >
                <Icon name={preferences.sound ? 'volume' : 'mute'} size={18} />
              </button>
              <button
                title="Совместная игра"
                aria-label="Совместная игра"
                onClick={() => openView('lobby')}
              >
                <Icon name="users" size={18} />
              </button>
              <button title="Сохранения" aria-label="Сохранения" onClick={() => openView('saves')}>
                <Icon name="save" size={18} />
              </button>
              <button title="Настройки" aria-label="Настройки" onClick={() => openView('settings')}>
                <Icon name="settings" size={18} />
              </button>
            </div>
          </header>
          <SidePanel
            campaign={campaign}
            busy={busy}
            onView={openView}
            onAction={(text) => void command({ type: 'text', text })}
          />
          <main
            id="main-content"
            className={`game-main ${view !== 'play' ? 'secondary-view' : ''}`}
          >
            {view === 'play' ? (
              <>
                <div className="scene-breadcrumb">
                  <span>
                    <Icon name="compass" size={14} />
                    Пограничье
                    <Icon name="chevron" size={12} />
                    {location.subtitle}
                  </span>
                  <button className="text-button" onClick={() => openView('map')}>
                    Открыть карту
                    <Icon name="up" size={13} />
                  </button>
                </div>
                {campaign.combat ? (
                  <CombatBoard campaign={campaign} busy={busy} onAction={action} />
                ) : (
                  <section
                    className={`scene-container ${campaign.world.destroyed.includes(location.id) ? 'destroyed' : ''}`}
                    aria-label={location.name}
                  >
                    <SceneArt location={location.id} />
                    <div className="scene-grain" />
                    <div className="scene-shade" />
                    <div className="scene-top">
                      <span className="scene-region">
                        <i className="live-dot" />
                        {location.danger > 1 ? 'ОПАСНЫЕ ЗЕМЛИ' : 'БЕЗОПАСНОЕ МЕСТО'}
                      </span>
                      <span className="weather-label">
                        <Icon
                          name={
                            location.weather.includes('Дожд') || location.weather.includes('дожд')
                              ? 'leaf'
                              : 'moon'
                          }
                          size={13}
                        />
                        {location.weather}
                      </span>
                    </div>
                    <div className="scene-compass">
                      <span>С</span>
                      <Icon name="compass" size={35} />
                    </div>
                    {!campaign.world.destroyed.includes(location.id) &&
                      location.objects
                        .filter(
                          (o) => !campaign.world.npcs[o.id] || campaign.world.npcs[o.id].alive,
                        )
                        .map((o) => (
                          <button
                            key={o.id}
                            className={`scene-marker marker-${o.id}`}
                            style={{ left: `${o.x}%`, top: `${o.y}%` }}
                            disabled={busy}
                            title={o.action}
                            onClick={() => void command({ type: 'text', text: o.action })}
                          >
                            <span className="marker-ring">
                              <Icon name={o.icon} size={17} />
                            </span>
                            <span className="marker-label">
                              {o.label}
                              <Icon name="chevron" size={11} />
                            </span>
                          </button>
                        ))}
                    {preferences.particles && (
                      <div
                        className={`scene-particles ${location.id === 'tavern' ? 'warm' : 'cold'}`}
                      >
                        {Array.from({ length: 16 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              left: `${(i * 17 + 4) % 100}%`,
                              animationDelay: `${i * 0.55}s`,
                              animationDuration: `${6 + (i % 5)}s`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    <div className="scene-caption">
                      <div className="eyebrow">
                        {campaign.world.destroyed.includes(location.id)
                          ? 'ПЕПЕЛ ПОМНИТ ВАШИ РУКИ'
                          : location.subtitle.toUpperCase()}
                      </div>
                      <h1>{location.name}</h1>
                      <p>
                        {campaign.world.destroyed.includes(location.id)
                          ? 'Обугленные балки. Холодная зола. Пожар оставил здесь неизгладимый след.'
                          : location.description}
                      </p>
                    </div>
                    <div className="scene-bottom">
                      <span>
                        <Icon name="eye" size={13} />
                        Исследуйте сцену или опишите своё действие
                      </span>
                      <span>
                        ВЕЙР <span className="tiny-diamond" /> I
                      </span>
                    </div>
                  </section>
                )}
                <ActionBar
                  campaign={campaign}
                  busy={busy}
                  onCommand={(c) => void command(c)}
                  onView={openView}
                />
              </>
            ) : (
              <>
                <div className="view-back">
                  <button className="text-button" onClick={() => openView('play')}>
                    <Icon name="left" size={15} />
                    Вернуться к приключению
                  </button>
                  <span className="eyebrow">{ru.nav[view]}</span>
                </div>
                {view === 'settings' ? (
                  <SettingsView
                    preferences={preferences}
                    onPreferences={setPreferences}
                    provider={provider}
                  />
                ) : (
                  <CampaignView
                    view={view}
                    campaign={campaign}
                    busy={busy}
                    onAction={action}
                    onLoaded={(c) => {
                      setCampaign(c);
                      localStorage.setItem('lr_active', c.id);
                    }}
                    onError={reportError}
                  />
                )}
              </>
            )}
          </main>
          <Chronicle campaign={campaign} busy={busy} visible={mobilePanel === 'chronicle'} />
          <div className="mobile-tabs">
            <button
              className={mobilePanel === 'world' ? 'active' : ''}
              onClick={() => setMobilePanel('world')}
            >
              <Icon name="compass" size={16} />
              Мир
            </button>
            <button
              className={mobilePanel === 'chronicle' ? 'active' : ''}
              onClick={() => setMobilePanel('chronicle')}
            >
              <Icon name="feather" size={16} />
              Летопись<span>{campaign.events.length}</span>
            </button>
            <button onClick={() => openView('inventory')}>
              <Icon name="bag" size={16} />
              Вещи
            </button>
            <button onClick={() => openView('character')}>
              <Icon name="user" size={16} />
              Путник
            </button>
          </div>
        </div>
      ) : null}
      {error && (
        <div className="error-toast" role="alert">
          <Icon name="help" size={20} />
          <p>{error}</p>
          <button aria-label="Закрыть уведомление" onClick={() => setError('')}>
            <Icon name="close" size={17} />
          </button>
        </div>
      )}
      {transition && (
        <div className="opening-transition">
          <Sigil size={54} />
          <span>ВЕЙР</span>
          <p>В ночь, когда под землёй прозвонил колокол.</p>
        </div>
      )}
    </>
  );
}
