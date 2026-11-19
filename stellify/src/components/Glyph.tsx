import {
  Angry, ArrowDown, ArrowRight, Ban, Banknote, BadgeCheck, Box, BrickWall, Brain, CakeSlice, Calculator, CalendarDays, ChartColumn, Circle,
  CircleCheck, CircleHelp, CircleX, ClipboardList, Compass, Construction, Dices, Divide, DoorOpen, Dumbbell, Eraser, FlaskConical, Flag, Flame,
  FlipHorizontal2, FolderOpen, Ghost, Globe, GraduationCap, Hand, Handshake, Hourglass, IceCreamCone, Image, Infinity as InfinityIcon,
  Landmark, Link, Magnet, MapPin, Megaphone, Meh, Microscope, Minus, Mountain, NotebookPen, Package, PawPrint, PenLine, Pizza, Plus, Pointer,
  Puzzle, RefreshCw, Repeat, Rocket, RotateCcw, Route, Ruler, Scale, Scissors, ScrollText, Search, SearchCheck, Shuffle, Smile, Sparkles,
  Sprout, Square, SquareDashed, Star, Swords, Tag, Target, Telescope, ThumbsDown, ThumbsUp, Ticket, Timer, TrafficCone, TrendingDown,
  TrendingUp, Triangle, TriangleAlert, Trophy, Type, Undo2, Users, Waves, Weight, Wrench, X, Zap, type LucideIcon,
} from 'lucide-react';
import { cn } from './ui';

/**
 * Stellify uses one icon set (Lucide, 1.75 stroke) and no emoji as icons (DESIGN.md). Older content marks tiles
 * and labels with an emoji; this table draws the matching Lucide icon instead, so content files need no rewrite.
 * An emoji that is not in the table draws nothing rather than an emoji.
 */
export const GLYPHS: Record<string, LucideIcon> = {
  '⚖': Scale, '📈': TrendingUp, '📉': TrendingDown, '🔻': TrendingDown, '💵': Banknote, '⬇': ArrowDown, '⏱': Timer, '📍': MapPin,
  '🔁': Repeat, '🎯': Target, '🧮': Calculator, '📟': Calculator, '✖': X, '🪞': FlipHorizontal2, '🛤': Route, '🚫': Ban, '🚀': Rocket,
  '➗': Divide, '🧩': Puzzle, '🟦': Square, '🔲': SquareDashed, '🔀': Shuffle, '🔬': Microscope, '🏁': Flag, '🌍': Globe, '📝': NotebookPen,
  '🔍': Search, '🔎': SearchCheck, '🕵': Search, '🔄': RefreshCw, '💪': Dumbbell, '🐾': PawPrint, '🧹': Eraser, '⭐': Star, '★': Star,
  '🌟': Star, '💯': BadgeCheck, '📊': ChartColumn, '🐘': Weight, '⚠': TriangleAlert, '🎲': Dices, '🧪': FlaskConical, '🎟': Ticket,
  '📦': Package, '🧊': Box, '🍦': IceCreamCone, '⭕': Circle, '🔭': Telescope, '👻': Ghost, '🧲': Magnet, '👍': ThumbsUp, '👎': ThumbsDown,
  '🔤': Type, '🏆': Trophy, '🏟': Trophy, '✨': Sparkles, '✋': Hand, '🏗': Construction, '🌉': Landmark, '📣': Megaphone, '🗂': FolderOpen,
  '☝': Pointer, '👆': Pointer, '🔧': Wrench, '👨': Users, '👩': Users, '👧': Users, '👥': Users, '🏷': Tag, '😊': Smile, '😐': Meh,
  '😠': Angry, '❓': CircleHelp, '🚪': DoorOpen, '🎓': GraduationCap, '📜': ScrollText, '🧠': Brain, '📘': NotebookPen, '🔥': Flame,
  '⚡': Zap, '⚔': Swords, '✍': PenLine, '🖼': Image, '✅': CircleCheck, '❌': CircleX, '➕': Plus, '➖': Minus, '➡': ArrowRight,
  '📏': Ruler, '📐': Triangle, '🔗': Link, '🤝': Handshake, '✂': Scissors, '🧭': Compass, '📋': ClipboardList, '⛰': Mountain,
  '⏳': Hourglass, '📅': CalendarDays, '🔙': Undo2, '🍕': Pizza, '♾': InfinityIcon, '🚦': TrafficCone, '🌱': Sprout, '🎢': Waves,
  '🙃': RotateCcw, '🍰': CakeSlice, '🧱': BrickWall, '🪤': TriangleAlert,
};

/** The first emoji (or icon character) in a string, without variation selectors or skin tones. */
const key = (s: string) => [...s.replace(/[️‍]|\uD83C[\uDFFB-\uDFFF]/g, '')][0] ?? '';

/** Draws the Lucide icon that stands for an emoji. Decorative: always hidden from screen readers. */
export function Glyph({ e, size = 16, className }: { e: string; size?: number; className?: string }) {
  const Icon = GLYPHS[key(e)];
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={1.75} aria-hidden className={cn('inline-block shrink-0 align-[-0.15em]', className)} />;
}

const EMOJI = /(?:[☀-➿⭐⭕✅❌✨⏰-⏿]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])[️‍]*/g;
/** Removes emoji from a string (for labels whose icon is drawn separately). Music accidentals are kept. */
export const stripEmoji = (s: string) => s.replace(EMOJI, (m) => (/[♯♭♮]/.test(m) ? m : '')).replace(/\s{2,}/g, ' ').trim();
