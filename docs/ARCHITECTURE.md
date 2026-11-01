# Architecture

## Runtime

A local TypeScript modular monolith: Vite + React 19 client, Express 5 API, Node's built-in SQLite. Strict TypeScript, Zod at the external boundary. No external database or AI dependency is necessary for play. A production build is served by Express; development uses Vite's API proxy.

## Modules

| Module                  | Responsibility                                                                            |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `src/lib/types.ts`      | Shared domain and public-view types                                                       |
| `src/lib/content.ts`    | Player-visible Russian world content, items, archetypes, location graph                   |
| `src/lib/i18n.ts`       | Central Russian UI vocabulary and display helpers                                         |
| `src/components/`       | Menu, creator, exploration art, map, chronicle, tactical board, full secondary views      |
| `server/schemas.ts`     | Strict validated character, command and intent input schemas                              |
| `server/rules.ts`       | Character creation, crypto dice, checks, saving throws, XP, world time, agendas, memories |
| `server/combat.ts`      | Tactical layout, pathfinding, line of sight, initiative, turns, enemies, rewards, defeat  |
| `server/engine.ts`      | Allowlisted authoritative command handlers                                                |
| `server/interpreter.ts` | Offline intention parsing and compact model context selection                             |
| `server/ai.ts`          | Provider interface, demo provider, strict OpenAI Responses adapter                        |
| `server/store.ts`       | SQLite ownership, atomic updates, snapshots, optimistic versions, request deduplication   |
| `server/app.ts`         | API, session cookies, origin validation, rate limits, provider orchestration              |

## Action lifecycle

1. Read and validate input. Resolve session ownership before returning state or sending context to a provider.
2. Read the current campaign. While one action for this campaign is resolving, reject another with 409. Snapshot loads also respect this lock.
3. Interpret text with the configured adapter, or use a structured UI command. AI interpretation failures fall back to demo interpretation with a visible notice.
4. Begin an immediate SQLite transaction. Check the request ID first to handle retries without duplicate purchases or dice. Reject a stale version.
5. Run exactly one allowlisted handler. Server code selects required resources, difficulty, dice, hit/miss, damage, item ownership and consequences. Model outputs have no SQL, code, shell or database access.
6. Advance game time and process crossed scheduled events once; update factions and property income. Condense old narrative into a bounded summary while retaining critical facts separately.
7. Atomically write the aggregate and processed request ID. Roll back everything if any check fails.
8. Optionally request NPC dialogue or nonmaterial improvisation prose from the model. Commit prose separately only after mechanics have committed. Prose failure never rolls back or repeats the action.
9. Return a player-visible projection. NPC private memories and future schedule records are omitted. The cave tile map is exposed only after visiting it.

## Memory boundaries

The engine owns full campaign state. The player view includes witnessed history, discovered facts, known quests and public relationship scores. The interpretation model receives the current scene, the player's state, recent witnessed events, a compact summary, recent facts and only NPCs in the current scene.

The NPC dialogue model receives a narrower payload: the particular NPC's description, local scene, that NPC's own memories/relationship, the current player utterance, and the authoritative dialogue result. It does not receive the campaign summary, remote facts or other NPC memories. A theft or fire is recorded only for NPCs present at the scene. Explicitly authored secret revelations happen through validated interactions; secrets are not shipped as a shared content field.

Summary compaction is deterministic and retains recent system outcomes. This is not a full semantic retrieval/vector-memory system.

## Determinism and randomness

Offline intent matching, world schedules, transactions and seeded tile generation are deterministic. Actual game dice use `crypto.randomInt` and are intentionally unpredictable. Tests inject deterministic random functions. A natural 20/1 guarantees combat hit/miss; ability checks and saving throws compare totals without automatic critical success/failure. Critical hits roll an extra damage die; this is an adapted SRD-inspired system.

The cave's stored tile layout is generated from the campaign ID; combat layouts in other locations derive from campaign ID plus location. Corridors guarantee connected spawn lanes. Movement uses a breadth-first path and counts traversable cells, not a client-supplied distance. Spell attacks validate range and wall visibility.

## Persistence and concurrency scope

SQLite uses WAL, foreign keys and a busy timeout. Sessions own campaigns. Each campaign is a versioned JSON aggregate so related changes are atomic. Named saves are immutable snapshots restored into the same campaign with a new monotonically increasing version. Processed command IDs make replayed POSTs idempotent.

The process-local busy lock covers AI requests; optimistic versions provide the second guard at commit time. This is designed for **one server process**. Distributed/multi-process concurrency requires database-backed leases and a different authorization model before multiplayer.

## Localization

All authored gameplay content is Russian. Common UI vocabulary is centralized in `i18n.ts`; world content is data in `content.ts`. Several component labels and authored server responses remain inline Russian. A second locale requires extracting those strings into complete locale catalogs; localization is structured for extension, not fully externalized.

## Provider contract

OpenAI is called only from `server/ai.ts` through the Responses API with strict JSON-schema output and `store: false`. Zod validates parsed data again. The adapter has a 25-second timeout per request and configurable model ID. The production key is not sent to the browser. Mock adapter tests verify the wire contract and malformed/error paths; live-model correctness remains unverified without credentials.
