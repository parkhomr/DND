import { useState } from 'react';
import { CLASSES, ITEMS } from '../lib/content';
import { ru, modifier, signed } from '../lib/i18n';
import type { Attribute, CharacterInput, ClassId } from '../lib/types';
import { Icon, Sigil } from './Icons';
import { Portrait } from './Portrait';
export function CharacterCreator({
  onCreate,
  onBack,
  busy,
}: {
  onCreate: (c: CharacterInput) => void;
  onBack: () => void;
  busy: boolean;
}) {
  const [step, setStep] = useState(0);
  const [classId, setClass] = useState<ClassId>('rogue');
  const [name, setName] = useState('Элиан');
  const [ancestry, setAncestry] = useState('Человек');
  const [background, setBackground] = useState('Изгнанник');
  const [portrait, setPortrait] = useState(2);
  const [focus, setFocus] = useState<Attribute>('cha');
  const cls = CLASSES[classId];
  const stats = { ...cls.stats };
  stats[focus] = Math.min(18, stats[focus] + 1);
  const ancestryAttr: Attribute =
    ancestry === 'Камнерождённый'
      ? 'con'
      : ancestry === 'Сумеречный эльф'
        ? 'dex'
        : ancestry === 'Полурослик'
          ? 'cha'
          : 'wis';
  stats[ancestryAttr]++;
  return (
    <main className="creator">
      <header className="standalone-header">
        <button className="text-button" onClick={onBack}>
          <Icon name="left" /> К главному меню
        </button>
        <div className="brand">
          <Sigil size={28} /> ЖИВЫЕ МИРЫ
        </div>
        <span className="eyebrow">НОВАЯ ИСТОРИЯ</span>
      </header>
      <div className="creator-layout">
        <section className="creator-form">
          <div className="eyebrow gold">ПРЕЖДЕ ЧЕМ ПЕРЕСТУПИТЬ ПОРОГ</div>
          <h1>
            Кто вы, <em>путник?</em>
          </h1>
          <p className="muted">У каждого в Вейре есть прошлое. Пришло время выбрать своё.</p>
          <nav className="creator-steps" aria-label="Создание персонажа">
            {['Происхождение', 'Призвание', 'Ваша история'].map((s, i) => (
              <button key={s} className={step === i ? 'active' : ''} onClick={() => setStep(i)}>
                <span>
                  {i < step ? <Icon name="check" size={13} /> : String(i + 1).padStart(2, '0')}
                </span>
                {s}
              </button>
            ))}
          </nav>
          {step === 0 ? (
            <div className="creator-stage">
              <h2>Кровь и наследие</h2>
              <p className="muted">Ваш народ оставляет след. Ваши поступки значат больше.</p>
              <div className="ancestry-grid">
                {ru.ancestries.map((a, i) => (
                  <button
                    className={`choice-card ${a === ancestry ? 'selected' : ''}`}
                    onClick={() => setAncestry(a)}
                    key={a}
                  >
                    <Icon name={['sun', 'moon', 'mountain', 'leaf'][i]} size={28} />
                    <h3>{a}</h3>
                    <p>
                      {
                        [
                          'Среди руин вы умеете находить надежду. +1 к мудрости.',
                          'Сумерки хранят ваши шаги. +1 к ловкости.',
                          'Горы научили вас выносливости. +1 к телосложению.',
                          'Вы знаете цену доброму слову. +1 к харизме.',
                        ][i]
                      }
                    </p>
                    {a === ancestry && <Icon name="check" className="choice-check" />}
                  </button>
                ))}
              </div>
            </div>
          ) : step === 1 ? (
            <div className="creator-stage">
              <h2>Путь, который вы выбрали</h2>
              <p className="muted">Четыре разных способа пережить одну долгую ночь.</p>
              <div className="class-grid">
                {Object.entries(CLASSES).map(([id, c], i) => (
                  <button
                    key={id}
                    className={`class-card ${id === classId ? 'selected' : ''}`}
                    onClick={() => {
                      setClass(id as ClassId);
                      setPortrait([0, 1, 2, 5][i]);
                    }}
                  >
                    <Icon name={['sword', 'feather', 'wand', 'leaf'][i]} size={27} />
                    <div>
                      <h3>{c.name}</h3>
                      <small>{c.tag}</small>
                    </div>
                    {id === classId && <Icon name="check" size={16} />}
                  </button>
                ))}
              </div>
              <div className="class-description">
                <h3>{cls.tag}</h3>
                <p>{cls.description}</p>
                <div>
                  <Icon name="star" size={18} />
                  {cls.ability}
                </div>
              </div>
            </div>
          ) : (
            <div className="creator-stage">
              <h2>Как вас запомнят?</h2>
              <label className="field-label" htmlFor="hero-name">
                ИМЯ ПЕРСОНАЖА
              </label>
              <input
                id="hero-name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                placeholder="Ваше имя"
              />
              <label className="field-label" htmlFor="background">
                ПРОШЛОЕ
              </label>
              <select
                id="background"
                className="field"
                value={background}
                onChange={(e) => setBackground(e.target.value)}
              >
                {ru.backgrounds.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
              <p className="background-lore">
                {background === 'Изгнанник'
                  ? 'Вы потеряли дом, но сохранили причину идти дальше. Письмо привело вас в Вейр.'
                  : background === 'Наёмник'
                    ? 'Война кончилась, а вы всё ещё ищете, кому нужна ваша сталь.'
                    : background === 'Учёный'
                      ? 'Книги утверждают, что под Вейром ничего нет. Сегодня вы услышали обратное.'
                      : background === 'Дворянин'
                        ? 'Ваше имя когда-то открывало двери. В Вейре об этом лучше помолчать.'
                        : 'Дорога не задаёт вопросов. Этот город — задаёт.'}
              </p>
              <label className="field-label">
                ВАШ ТАЛАНТ <span>+1 к характеристике</span>
              </label>
              <div className="focus-grid">
                {Object.entries(ru.attributes).map(([id, label]) => (
                  <button
                    key={id}
                    className={focus === id ? 'selected' : ''}
                    onClick={() => setFocus(id as Attribute)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label className="field-label">ЛИЦО ВАШЕЙ ИСТОРИИ</label>
              <div className="portrait-picker">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <button
                    key={i}
                    aria-label={`Портрет ${i + 1}`}
                    aria-pressed={portrait === i}
                    className={portrait === i ? 'selected' : ''}
                    onClick={() => setPortrait(i)}
                  >
                    <Portrait index={i} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <footer className="creator-bottom">
            <span>
              <Icon name="save" size={14} /> Ваш путь не определяет ваши решения
            </span>
            <button
              className="button primary"
              disabled={busy || (step === 2 && name.trim().length < 2)}
              onClick={() =>
                step < 2
                  ? setStep(step + 1)
                  : onCreate({ name: name.trim(), ancestry, classId, background, portrait, focus })
              }
            >
              {busy ? <Icon name="loading" className="spin" /> : null}
              {step === 2 ? 'Войти в Вейр' : 'Продолжить'}
              <Icon name="arrow" />
            </button>
          </footer>
        </section>
        <aside className="creator-preview">
          <div className="preview-portrait">
            <Portrait index={portrait} />
            <div className="portrait-vignette" />
            <span className="level-seal">I</span>
          </div>
          <div className="preview-info">
            <div className="eyebrow">ВАША ЛЕГЕНДА ЕЩЁ НЕ НАПИСАНА</div>
            <h2>{name || 'Безымянный'}</h2>
            <p>
              {ancestry} · {cls.name} · {background}
            </p>
            <div className="preview-vitals">
              <span>
                <Icon name="heart" /> {cls.hp} <small>здоровье</small>
              </span>
              <span>
                <Icon name="wand" /> {cls.mana} <small>мана</small>
              </span>
            </div>
            <div className="attribute-grid">
              {Object.entries(stats).map(([k, v]) => (
                <div key={k}>
                  <small>{ru.attributes[k as Attribute]}</small>
                  <b>{v}</b>
                  <span>{signed(modifier(v))}</span>
                </div>
              ))}
            </div>
            <div className="starting-equipment">
              <span className="eyebrow">НАЧАЛЬНОЕ СНАРЯЖЕНИЕ</span>
              <p>
                <Icon name="sword" size={16} />
                {ITEMS[cls.weapon].name}
              </p>
              <p>
                <Icon name="shield" size={16} />
                {ITEMS[cls.armor].name}
              </p>
              <p>
                <Icon name="potion" size={16} />2 зелья · 45 монет · таинственное письмо
              </p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
