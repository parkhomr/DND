import type { LocationId } from '../lib/types';
export function SceneArt({ location }: { location: LocationId }) {
  if (location === 'tavern') return <div className="scene-art tavern-art" />;
  if (location === 'forest') return <div className="scene-art forest-art" />;
  const underground = ['crypt', 'cave'].includes(location);
  const temple = location === 'temple';
  return (
    <svg
      className={`scene-art vector-scene scene-${location}`}
      viewBox="0 0 1000 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor={underground ? '#070e13' : '#122b30'} />
          <stop offset="1" stopColor="#344748" />
        </linearGradient>
        <radialGradient id="glow">
          <stop stopColor="#ffc775" stopOpacity=".8" />
          <stop offset="1" stopColor="#d27e29" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ground" x2="0" y2="1">
          <stop stopColor="#263332" />
          <stop offset="1" stopColor="#080f11" />
        </linearGradient>
        <filter id="mist">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <filter id="texture">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".65"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feBlend in="SourceGraphic" mode="soft-light" />
        </filter>
      </defs>
      <rect width="1000" height="700" fill="url(#sky)" />
      {!underground && (
        <>
          <circle cx="700" cy="130" r="48" fill="#c8dbce" opacity=".7" />
          <circle cx="718" cy="116" r="47" fill="#1c3438" />
          {Array.from({ length: 25 }, (_, i) => (
            <circle
              key={i}
              cx={(i * 137 + 31) % 1000}
              cy={(i * 59) % 240}
              r={i % 3 === 0 ? 1.2 : 0.7}
              fill="#cee0cf"
              opacity=".5"
            />
          ))}
          <path
            d="M0 380 120 230 180 280 270 160 380 300 440 220 560 340 650 240 760 320 840 170 1000 340V600H0Z"
            fill="#14252a"
          />
        </>
      )}
      <rect y="440" width="1000" height="260" fill="url(#ground)" />
      {underground ? (
        <>
          {[80, 240, 400, 560, 720, 880].map((x, i) => (
            <g key={x}>
              <path
                d={`M${x - 70} 540V180Q${x} 10 ${x + 70} 180V540L${x + 40} 540V190Q${x} 80 ${x - 40} 190V540Z`}
                fill={i % 2 ? '#17252a' : '#1b2b2d'}
                stroke="#43534b"
                strokeOpacity=".4"
              />
              <path d={`M${x - 70} 180h140M${x - 60} 360h120`} stroke="#0a1115" strokeWidth="7" />
            </g>
          ))}
          {location === 'crypt' ? (
            <g>
              <path
                d="M450 260Q500 210 550 260l18 140H432Z"
                fill="#656e57"
                stroke="#bfa465"
                strokeWidth="3"
              />
              <path d="m510 255-14 62 23 18-20 60" fill="none" stroke="#bcdac5" strokeWidth="3" />
              <ellipse cx="500" cy="403" rx="74" ry="13" fill="#26362e" stroke="#8c986c" />
              <path d="M500 260V60" stroke="#8b8666" strokeWidth="5" />
              <ellipse cx="500" cy="420" rx="200" ry="160" fill="url(#glow)" opacity=".22" />
            </g>
          ) : (
            Array.from({ length: 10 }, (_, i) => (
              <path
                key={i}
                d={`M${i * 95 + 20} 510l-15-70 25-40 25 100Z`}
                fill="#8a6b3d"
                opacity=".7"
                stroke="#ddb86c"
              />
            ))
          )}
          <path d="M400 700 470 440H530L650 700" fill="#334039" opacity=".35" />
        </>
      ) : temple ? (
        <>
          <path
            d="M180 600V160L320 40 500 170 680 40 820 160V600"
            fill="#17292b"
            stroke="#58665b"
            strokeWidth="2"
          />
          {[240, 380, 620, 760].map((x) => (
            <g key={x}>
              <path
                d={`M${x} 560V200Q${x + 35} 110 ${x + 70} 200V560`}
                fill="#0d1c22"
                stroke="#53635c"
                strokeWidth="6"
              />
              <path d={`M${x + 35} 160v380m-35-260h70`} stroke="#5d685e" />
            </g>
          ))}
          <path d="M440 590V320Q500 200 560 320V590Z" fill="#0a171c" />
          <path d="M420 590h160l50 110H370Z" fill="#40504a" />
          <rect x="445" y="485" width="110" height="70" fill="#49554a" />
          {Array.from({ length: 32 }, (_, i) => (
            <g key={i}>
              <rect
                x={100 + ((i * 71) % 800)}
                y={470 + ((i * 31) % 140)}
                width="4"
                height="23"
                fill="#b9aa7f"
              />
              <ellipse
                cx={102 + ((i * 71) % 800)}
                cy={466 + ((i * 31) % 140)}
                rx="3"
                ry="7"
                fill="#f5ce7b"
              />
              <circle
                cx={102 + ((i * 71) % 800)}
                cy={466 + ((i * 31) % 140)}
                r="22"
                fill="url(#glow)"
              />
            </g>
          ))}
        </>
      ) : (
        <>
          {Array.from({ length: 12 }, (_, i) => {
            const x = i * 91 - 25;
            const h = 140 + ((i * 67) % 200);
            const fortress = location === 'fortress';
            return (
              <g key={i}>
                <path
                  d={`M${x} 490V${490 - h}L${x + 38} ${440 - h} ${x + 79} ${490 - h}V490Z`}
                  fill={i % 2 ? '#1e3031' : '#253839'}
                  stroke="#536057"
                  strokeWidth="1"
                />
                {fortress ? (
                  <path d={`M${x} ${490 - h}v-30h15v15h15v-15h15v15h15v-15h19v30`} fill="#273a3a" />
                ) : (
                  <path
                    d={`M${x - 9} ${490 - h} ${x + 38} ${428 - h} ${x + 87} ${490 - h}`}
                    fill="#152628"
                    stroke="#5d6659"
                    strokeWidth="2"
                  />
                )}
                {[0, 1, 2].map((j) => (
                  <g key={j}>
                    <rect
                      x={x + 17 + j * 20}
                      y={510 - h}
                      width="9"
                      height="20"
                      fill={j === i % 3 ? '#b18b4c' : '#0e1d21'}
                    />
                    {j === i % 3 && (
                      <circle
                        cx={x + 21 + j * 20}
                        cy={520 - h}
                        r="50"
                        fill="url(#glow)"
                        opacity=".5"
                      />
                    )}
                  </g>
                ))}
                <path d={`M${x + 30} 490v-50q10-20 20 0v50Z`} fill="#0c1a1d" />
              </g>
            );
          })}
          <path d="M0 700 430 490H560L1000 700Z" fill="#354440" />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M${350 - i * 36} ${510 + i * 21}h${300 + i * 70}`}
              stroke="#718071"
              strokeOpacity=".15"
            />
          ))}
          {location === 'market' &&
            [150, 540, 760].map((x, i) => (
              <g key={x}>
                <rect x={x} y="430" width="150" height="100" fill="#302d23" />
                <path d={`M${x - 15} 420l25-55h130l25 55Z`} fill={i % 2 ? '#5e5940' : '#67432d'} />
                <path d={`M${x} 420v130m150-130v130`} stroke="#786c4f" strokeWidth="6" />
                <circle cx={x + 80} cy="450" r="70" fill="url(#glow)" />
              </g>
            ))}
          {location === 'village' && (
            <>
              <ellipse
                cx="500"
                cy="520"
                rx="55"
                ry="19"
                fill="#152323"
                stroke="#6c7562"
                strokeWidth="8"
              />
              <path
                d="M460 520V400h80v120M450 410l50-45 50 45"
                fill="none"
                stroke="#5e6555"
                strokeWidth="7"
              />
            </>
          )}
          {location === 'square' && (
            <>
              <path d="M410 500v-95h170v95" fill="#443f30" />
              <path
                d="M435 410V290h120v80M540 290v75"
                fill="none"
                stroke="#4c4a39"
                strokeWidth="12"
              />
              <path d="M520 500h80l20 30H500Z" fill="#393b31" />
            </>
          )}
        </>
      )}
      <g filter="url(#mist)" opacity=".22">
        <ellipse cx="250" cy="490" rx="450" ry="35" fill="#9cb9af" />
        <ellipse cx="800" cy="570" rx="350" ry="27" fill="#8bada3" />
      </g>
      <rect width="1000" height="700" opacity=".045" filter="url(#texture)" />
    </svg>
  );
}
