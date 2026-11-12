import { Lightbulb, BarChart3, BookOpen, Bot, Brain, Calculator, CalendarDays, ClipboardList, Flame, Gauge, GraduationCap, Home, Languages, LibraryBig, LineChart, ListChecks, Medal, NotebookPen, PawPrint, PenLine, ShoppingBag, Sigma, Sparkles, Swords, Target, Timer, Trophy, Zap, FileBarChart, type LucideIcon } from 'lucide-react';

export interface NavItem { href: string; label: string; icon: LucideIcon }
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Home', items: [{ href: '/', label: 'Dashboard', icon: Home }] },
  { group: 'Learn', items: [
    { href: '/learn', label: 'Complete Curriculum', icon: GraduationCap },
    { href: '/learn/math', label: 'Math Academy', icon: Sigma },
    { href: '/learn/rw', label: 'Reading & Writing Academy', icon: BookOpen },
    { href: '/hacks', label: 'SAT Hacks', icon: Lightbulb },
    { href: '/grammar', label: 'Grammar Masterclass', icon: PenLine },
    { href: '/desmos', label: 'Desmos Masterclass', icon: LineChart },
  ] },
  { group: 'Practice', items: [
    { href: '/practice', label: 'Question Bank', icon: LibraryBig },
    { href: '/practice/smart', label: 'Smart Practice', icon: Brain },
    { href: '/practice/hard', label: 'Hard Questions', icon: Zap },
    { href: '/practice/timed', label: 'Timed Modules', icon: Timer },
    { href: '/daily', label: 'Daily Challenge', icon: Flame },
    { href: '/speed', label: 'Speed Training', icon: Gauge },
    { href: '/arena', label: 'Battle Arena', icon: Swords },
  ] },
  { group: 'Performance', items: [
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/mistakes', label: 'Mistake Bucket', icon: Target },
    { href: '/mocks', label: 'Mock Exams', icon: ClipboardList },
    { href: '/calendar', label: 'Study Calendar', icon: CalendarDays },
    { href: '/report', label: 'Weekly Report', icon: FileBarChart },
  ] },
  { group: 'Companion', items: [
    { href: '/pet', label: 'My Pet', icon: PawPrint },
    { href: '/rewards', label: 'Rewards', icon: ShoppingBag },
    { href: '/achievements', label: 'Achievements', icon: Trophy },
  ] },
  { group: 'Tools', items: [
    { href: '/tutor', label: 'AI Tutor', icon: Bot },
    { href: '/vocabulary', label: 'Vocabulary', icon: Languages },
    { href: '/reference', label: 'Formula Sheet', icon: Calculator },
    { href: '/notes', label: 'Personal Notes', icon: NotebookPen },
    { href: '/resources', label: 'Official SAT Resources', icon: ListChecks },
  ] },
];
export const ICONS = { Sparkles, Medal };
