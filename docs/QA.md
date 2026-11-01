# QA record

Environment: Node.js 26.10.0, npm 12.2.0, Linux, Playwright Chromium headless. No OpenAI API credentials were present. Test databases are separate from `data/realms.sqlite`.

## Verified so far

- Strict TypeScript check and optimized Vite production build passed.
- 33 core tests passed: character archetypes, schemas, all six dice, advantage/disadvantage, checks and saving throws, parser, NPC memory and one-time key, travel locks, generated cave persistence, trade and item ownership, consumption, sale restrictions, destruction/witness scope, scheduled event timing, nonrepeatable quest rewards, property income, deterministic tactical layouts, line of sight, movement/range/class validation, combat victory/loot/leveling, critical misses, defeat rescue, player-view redaction, transactional rollback, stale versions, request idempotency, session isolation, unwitnessed crimes, destroyed shops, permanent named-NPC deaths, full database close/reopen and snapshot restoration, prototype-shaped item IDs, and mocked provider contract/error/privacy/improvisation behavior.
- Six browser/API scenarios passed at desktop 1440×950 and mobile 390×844: creation, play, dialogue, natural-language check, dice, trading, save/reload, map/travel, bookmark restoration, settings, horizontal overflow, combat movement, enemy turns, spell costs, combat reload, campaign switching, explicit single-player lobby, configured-provider failure fallback, origin checks and API ownership/validation.
- Screenshots were inspected; NPC row clipping and toolbar accessibility labels were corrected.

## Final pass

Final verification completed on 2026-11-01:

| Check                   | Actual result                                                                                    |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| `npm test`              | **33 passed, 0 failed**                                                                          |
| `npm run build`         | **passed**, including strict TypeScript and Vite production build                                |
| `npm run test:e2e`      | **6 passed, 0 failed** in 17.8 seconds                                                           |
| Final screenshot review | Desktop gameplay, creator, inventory, map, combat; mobile menu, gameplay and chronicle inspected |
| Preview teardown        | Owned preview stopped; ports 5173, 3001 and 3101 confirmed closed                                |

Final regression included named-NPC death, dead/destroyed service closure, unwitnessed crime knowledge, campaign switching and simulated configured-provider failure fallback. Tests do not use a live OpenAI key. Runtime illustrated assets total approximately 1.2 MB of WebP; original PNG sources remain in the repository.

## Not verified

- Live OpenAI requests or narrative quality: no API key configured. Mock tests are not evidence of live account/model access.
- Multiplayer: not implemented and clearly identified in the lobby.
- Audio quality on physical speakers or autoplay behavior on all browsers.
- Every device/browser, full screen-reader audit or production/internet deployment security.
- Unlimited story generation, arbitrary new mechanics or world mutations: intentionally not supported.
