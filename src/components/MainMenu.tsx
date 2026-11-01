import { Icon, Sigil } from './Icons';
import type { ProviderStatus } from '../lib/types';
export function MainMenu({
  onNew,
  onContinue,
  onSettings,
  hasSave,
  provider,
  loading,
}: {
  onNew: () => void;
  onContinue: () => void;
  onSettings: () => void;
  hasSave: boolean;
  provider: ProviderStatus;
  loading: boolean;
}) {
  return (
    <main className="main-menu">
      <div className="menu-art" />
      <div className="menu-shade" />
      <div className="menu-corner top-left" />
      <div className="menu-corner bottom-right" />
      <header className="menu-top">
        <span className="small-brand">
          <Sigil size={32} /> СТУДИЯ НЕРАССКАЗАННЫХ ИСТОРИЙ
        </span>
        <span className="edition">ХРОНИКИ ВЕЙРА · ГЛАВА I</span>
      </header>
      <section className="menu-content">
        <div className="eyebrow">
          <span /> МИР, КОТОРЫЙ ПОМНИТ <span />
        </div>
        <h1>
          ЖИВЫЕ
          <br />
          <em>МИРЫ</em>
        </h1>
        <div className="title-ornament">
          <i />
          <Sigil size={24} />
          <i />
        </div>
        <h2>Всякая история начинается с выбора.</h2>
        <p>
          За дверью таверны — город, полный тайн.
          <br />
          Под городом — колокол, которого не существует.
          <br />
          Кем станете вы, когда он прозвонит снова?
        </p>
        <div className="menu-buttons">
          <button
            className="button primary large"
            onClick={hasSave ? onContinue : onNew}
            disabled={loading}
          >
            <Icon name={hasSave ? 'book' : 'compass'} size={20} />
            {hasSave ? 'Продолжить историю' : 'Начать свою историю'}
            <Icon name="arrow" />
          </button>
          {hasSave && (
            <button className="button quiet" onClick={onNew}>
              Новое путешествие
            </button>
          )}
          <button className="button quiet" onClick={onSettings}>
            <Icon name="settings" size={16} /> Настройки
          </button>
        </div>
      </section>
      <footer className="menu-footer">
        <div>
          <span className="live-dot" />
          {provider.mode === 'demo'
            ? 'Авторская симуляция · без подключения ИИ'
            : 'Мастер на основе ИИ'}
          <small>
            {provider.mode === 'demo'
              ? 'Ограниченный режим. Полная свобода формулировок — с подключённой моделью.'
              : 'Решения за вами. Последствия — за миром.'}
          </small>
        </div>
        <span>ОДИН ПУТНИК. ТЫСЯЧА ВОЗМОЖНОСТЕЙ.</span>
      </footer>
      <div className="menu-caption">
        <Icon name="moon" size={14} /> Вейр, в ночь первого звона
      </div>
      <div className="embers">
        {Array.from({ length: 15 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${15 + i * 5}%`,
              animationDelay: `${i * 0.7}s`,
              animationDuration: `${7 + (i % 4)}s`,
            }}
          />
        ))}
      </div>
    </main>
  );
}
