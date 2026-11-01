export type Attribute = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
export type ClassId = 'warrior' | 'rogue' | 'mage' | 'warden';
export type LocationId =
  'tavern' | 'square' | 'market' | 'temple' | 'forest' | 'village' | 'fortress' | 'crypt' | 'cave';
export type View =
  'play' | 'inventory' | 'character' | 'map' | 'journal' | 'settings' | 'saves' | 'lobby';
export interface Hero {
  name: string;
  ancestry: string;
  classId: ClassId;
  background: string;
  portrait: number;
  attributes: Record<Attribute, number>;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  gold: number;
  xp: number;
  level: number;
  inventory: Record<string, number>;
  equipment: { weapon: string; armor: string; charm: string };
  conditions: string[];
}
export interface Roll {
  sides: number;
  rolls: number[];
  kept: number;
  modifier: number;
  total: number;
  dc?: number;
  success?: boolean;
  label: string;
  mode: 'normal' | 'advantage' | 'disadvantage';
}
export interface GameEvent {
  id: string;
  kind: 'narration' | 'dialogue' | 'action' | 'system' | 'combat';
  text: string;
  speaker?: string;
  roll?: Roll;
  time: number;
}
export interface NpcState {
  relationship: number;
  memories: string[];
  alive: boolean;
}
export interface Faction {
  id: string;
  name: string;
  reputation: number;
  progress: number;
  goal: string;
}
export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'rumor' | 'active' | 'completed' | 'failed';
  objective: string;
}
export interface Tile {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'water' | 'rubble';
}
export interface Enemy {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  ac: number;
  x: number;
  y: number;
  damage: number;
  initiative: number;
}
export interface Combat {
  targetNpc?: string;
  round: number;
  player: { x: number; y: number };
  enemies: Enemy[];
  tiles: Tile[];
  moved: boolean;
  guarded: boolean;
  initiative: Roll;
}
export interface World {
  tick: number;
  day: number;
  location: LocationId;
  visited: LocationId[];
  discovered: string[];
  facts: string[];
  flags: Record<string, boolean>;
  npcs: Record<string, NpcState>;
  factions: Faction[];
  quests: Quest[];
  stock: Record<string, number>;
  destroyed: LocationId[];
  cave: Tile[] | null;
  scheduled: { at: number; id: string; done: boolean }[];
  wanted: number;
}
export interface Campaign {
  id: string;
  version: number;
  hero: Hero;
  world: World;
  events: GameEvent[];
  combat: Combat | null;
  summary: string;
  createdAt: string;
  updatedAt: string;
}
export interface PublicCampaign extends Omit<Campaign, 'world'> {
  world: Omit<World, 'npcs' | 'scheduled' | 'cave'> & {
    npcs: Record<string, { relationship: number; alive: boolean }>;
    cave?: Tile[];
  };
}
export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'quest' | 'trinket';
  icon: string;
  price: number;
  weight: number;
  description: string;
  damage?: number;
  ac?: number;
  heal?: number;
  mana?: number;
}
export interface Location {
  id: LocationId;
  name: string;
  subtitle: string;
  description: string;
  weather: string;
  danger: number;
  x: number;
  y: number;
  exits: LocationId[];
  npcs: string[];
  objects: { id: string; label: string; x: number; y: number; action: string; icon: string }[];
  suggestions: string[];
}
export interface Npc {
  id: string;
  name: string;
  role: string;
  location: LocationId;
  portrait: number;
  description: string;
  greeting: string;
}
export interface CharacterInput {
  name: string;
  ancestry: string;
  classId: ClassId;
  background: string;
  portrait: number;
  focus: Attribute;
}
export type IntentKind =
  | 'look'
  | 'talk'
  | 'travel'
  | 'buy'
  | 'sell'
  | 'use'
  | 'equip'
  | 'rest'
  | 'search'
  | 'steal'
  | 'persuade'
  | 'attack'
  | 'cast'
  | 'guard'
  | 'flee'
  | 'move'
  | 'wait'
  | 'burn'
  | 'property'
  | 'join'
  | 'quest'
  | 'improvise';
export interface Intent {
  kind: IntentKind;
  target: string;
  detail: string;
}
export type Command =
  | { type: 'text'; text: string }
  | { type: 'intent'; intent: Intent }
  | { type: 'roll'; sides: number; mode: 'normal' | 'advantage' | 'disadvantage' };
export interface ProviderStatus {
  mode: 'demo' | 'openai';
  model: string | null;
  description: string;
}
