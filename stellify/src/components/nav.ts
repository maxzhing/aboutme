import { Atom, Eye, FlaskConical, Hexagon, Layers, ListTodo, Music, Piano, BadgeCheck, Braces, ChartScatter, Landmark, Store, SquareFunction, Lightbulb, BarChart3, BookOpen, Clapperboard, Bot, Brain, Calculator, CalendarDays, ClipboardList, Flame, Gauge, GraduationCap, Home, Languages, LibraryBig, LineChart, ListChecks, Medal, NotebookPen, PawPrint, PenLine, ShoppingBag, Sigma, Sparkles, Swords, Target, Timer, Trophy, Zap, FileBarChart, Wand2, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon }
/**
 * The menu, ordered by what a student needs most. The first three groups are the daily loop (today's plan, learning,
 * practice). Extras sit in folded groups, so a new student sees about twenty links instead of forty-five; nothing
 * was removed, and a folded group opens by itself when you are on one of its pages.
 */
export const NAV: { group: string; folded?: boolean; items: NavItem[] }[] = [
  { group: 'Home', items: [{ href: '/', label: 'Today', icon: Home }, { href: '/calendar', label: 'My plan', icon: CalendarDays }, { href: '/path', label: 'Path', icon: Hexagon }, { href: '/test-day', label: 'Test day', icon: ListTodo }] },
  { group: 'Learn', items: [
    { href: '/learn', label: 'Lessons', icon: GraduationCap },
    { href: '/videos', label: 'Video Lessons', icon: Clapperboard },
    { href: '/worked', label: 'Worked Examples', icon: Layers },
    { href: '/grammar', label: 'Grammar Rules', icon: PenLine },
    { href: '/desmos', label: 'Desmos', icon: LineChart },
    { href: '/hacks', label: 'SAT Hacks', icon: Lightbulb },
  ] },
  { group: 'Practice', items: [
    { href: '/practice/smart', label: 'Smart Practice', icon: Brain },
    { href: '/mistakes', label: 'Mistake Bucket', icon: Target },
    { href: '/practice/timed', label: 'Timed Modules', icon: Timer },
    { href: '/mocks', label: 'Practice Tests', icon: ClipboardList },
    { href: '/practice', label: 'Question Bank', icon: LibraryBig },
    { href: '/remix', label: 'Remix Studio', icon: Wand2 },
    { href: '/official', label: 'Official Questions', icon: BadgeCheck },
  ] },
  { group: 'Progress', items: [
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/report', label: 'Weekly Report', icon: FileBarChart },
  ] },
  { group: 'Challenges', folded: true, items: [
    { href: '/daily', label: 'Daily Challenge', icon: Flame },
    { href: '/practice/hard', label: 'Hardest Questions', icon: Zap },
    { href: '/speed', label: 'Speed Training', icon: Gauge },
    { href: '/arena', label: 'Battle Arena', icon: Swords },
  ] },
  { group: 'Tools', folded: true, items: [
    { href: '/tutor', label: 'Tutor', icon: Bot },
    { href: '/vocabulary', label: 'Vocabulary', icon: Languages },
    { href: '/reference', label: 'Formula Sheet', icon: Calculator },
    { href: '/notes', label: 'Personal Notes', icon: NotebookPen },
    { href: '/resources', label: 'Official SAT Resources', icon: ListChecks },
  ] },
  { group: 'Companion', folded: true, items: [
    { href: '/pet', label: 'Nova', icon: PawPrint },
    { href: '/rewards', label: 'Rewards', icon: ShoppingBag },
    { href: '/achievements', label: 'Achievements', icon: Trophy },
  ] },
  { group: 'AP Courses', folded: true, items: [
    { href: '/calc', label: 'AP Calculus BC', icon: SquareFunction },
    { href: '/csa', label: 'AP Computer Science A', icon: Braces },
    { href: '/micro', label: 'AP Microeconomics', icon: Store },
    { href: '/macro', label: 'AP Macroeconomics', icon: Landmark },
    { href: '/stats', label: 'AP Statistics', icon: ChartScatter },
    { href: '/chem', label: 'AP Chemistry', icon: Atom },
    { href: '/music', label: 'AP Music Theory', icon: Music },
    { href: '/music/studio', label: 'Music Studio', icon: Piano },
  ] },
];
export const ICONS = { Sparkles, Medal };
