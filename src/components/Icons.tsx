import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Backpack,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Crown,
  Dices,
  DoorOpen,
  Feather,
  Flame,
  Heart,
  HelpCircle,
  Home,
  KeyRound,
  Leaf,
  LoaderCircle,
  Map,
  Menu,
  MessageCircle,
  Minus,
  Moon,
  Music,
  Plus,
  ScrollText,
  Search,
  Send,
  Settings,
  Shield,
  Skull,
  Sparkles,
  Star,
  Sun,
  Swords,
  Tent,
  Trash2,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  WandSparkles,
  Wine,
  X,
  Save,
  Download,
  RotateCcw,
  Eye,
  Footprints,
  Mountain,
  Lock,
  Package,
  Apple,
  Gem,
} from 'lucide-react';
export const icons = {
  arrow: ArrowRight,
  left: ArrowLeft,
  up: ArrowUpRight,
  down: ArrowDown,
  bag: Backpack,
  book: BookOpen,
  check: Check,
  chevron: ChevronRight,
  chevrondown: ChevronDown,
  clock: Clock,
  coins: Coins,
  compass: Compass,
  crown: Crown,
  dice: Dices,
  door: DoorOpen,
  feather: Feather,
  fire: Flame,
  heart: Heart,
  help: HelpCircle,
  home: Home,
  key: KeyRound,
  leaf: Leaf,
  loading: LoaderCircle,
  map: Map,
  menu: Menu,
  talk: MessageCircle,
  minus: Minus,
  moon: Moon,
  music: Music,
  plus: Plus,
  scroll: ScrollText,
  search: Search,
  send: Send,
  settings: Settings,
  shield: Shield,
  skull: Skull,
  wand: WandSparkles,
  star: Star,
  sun: Sun,
  sword: Swords,
  camp: Tent,
  trash: Trash2,
  user: UserRound,
  users: Users,
  volume: Volume2,
  mute: VolumeX,
  potion: Wine,
  close: X,
  save: Save,
  download: Download,
  undo: RotateCcw,
  eye: Eye,
  foot: Footprints,
  mountain: Mountain,
  lock: Lock,
  package: Package,
  food: Apple,
  gem: Gem,
};
export type IconName = keyof typeof icons;
export function Icon({
  name,
  size = 18,
  className = '',
  ...props
}: {
  name: IconName | string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Component = icons[name as IconName] ?? Sparkles;
  return <Component size={size} strokeWidth={1.5} className={className} {...props} />;
}
export function Sigil({ size = 42 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <path d="M32 3 57 18v28L32 61 7 46V18Z" stroke="currentColor" strokeWidth="1" />
      <path
        d="M32 10 50 21v22L32 54 14 43V21Z"
        stroke="currentColor"
        strokeWidth=".5"
        opacity=".5"
      />
      <path
        d="M19 41 27 25l5 9 5-9 8 16M25 41l7-26 7 26M20 44h24M32 6v7m0 38v7"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="32" cy="40" r="3" fill="currentColor" />
    </svg>
  );
}
