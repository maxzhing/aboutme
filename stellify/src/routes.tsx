import type { ComponentType } from 'react';
import Link from 'next/link';
import { DashboardPage } from './pages/Dashboard';
import { DiagnosticPage, OnboardingPage } from './pages/Onboarding';
import { CurriculumPage, GrammarPage, LessonPage } from './pages/Learn';
import { DesmosPage } from './pages/Desmos';
import { ChapterPage } from './pages/Course';
import { HacksPage } from './pages/Hacks';
import { BankPage, HardPage, SessionPage, SmartPage, TimedPage } from './pages/Practice';
import { ArenaPage, DailyPage, SpeedPage } from './pages/Challenges';
import { AnalyticsPage, ReportPage } from './pages/Analytics';
import { MistakesPage } from './pages/Mistakes';
import { MockResultsPage, MockRunPage, MocksPage } from './pages/Mocks';
import { CalendarPage } from './pages/Calendar';
import { AchievementsPage, PetPage, RewardsPage } from './pages/Companion';
import { NotesPage, ReferencePage, ResourcesPage, TutorPage, VocabularyPage } from './pages/Tools';
import { SettingsPage } from './pages/Settings';

function NotFound() {
  return <div className="card p-10 text-center"><h1 className="text-2xl font-bold">Page not found</h1><p className="mt-2 text-sm text-muted">That page does not exist.</p><Link href="/" className="btn-primary mt-4">Back to the dashboard</Link></div>;
}
const Math_ = () => <CurriculumPage section="math" />;
const Rw = () => <CurriculumPage section="rw" />;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ROUTES: { pattern: RegExp; component: ComponentType<any> }[] = [
  { pattern: /^\/$/, component: DashboardPage },
  { pattern: /^\/onboarding$/, component: OnboardingPage },
  { pattern: /^\/diagnostic$/, component: DiagnosticPage },
  { pattern: /^\/learn$/, component: CurriculumPage },
  { pattern: /^\/learn\/math$/, component: Math_ },
  { pattern: /^\/learn\/rw$/, component: Rw },
  { pattern: /^\/learn\/(?<skill>[a-z0-9]+)$/, component: LessonPage },
  { pattern: /^\/learn\/(?<skill>[a-z0-9]+)\/(?<chapter>[a-z0-9]+-\d+)$/, component: ChapterPage },
  { pattern: /^\/grammar$/, component: GrammarPage },
  { pattern: /^\/hacks$/, component: HacksPage },
  { pattern: /^\/desmos$/, component: DesmosPage },
  { pattern: /^\/practice$/, component: BankPage },
  { pattern: /^\/practice\/session$/, component: SessionPage },
  { pattern: /^\/practice\/smart$/, component: SmartPage },
  { pattern: /^\/practice\/hard$/, component: HardPage },
  { pattern: /^\/practice\/timed$/, component: TimedPage },
  { pattern: /^\/daily$/, component: DailyPage },
  { pattern: /^\/speed$/, component: SpeedPage },
  { pattern: /^\/arena$/, component: ArenaPage },
  { pattern: /^\/analytics$/, component: AnalyticsPage },
  { pattern: /^\/report$/, component: ReportPage },
  { pattern: /^\/mistakes$/, component: MistakesPage },
  { pattern: /^\/mocks$/, component: MocksPage },
  { pattern: /^\/mocks\/run$/, component: MockRunPage },
  { pattern: /^\/mocks\/results$/, component: MockResultsPage },
  { pattern: /^\/calendar$/, component: CalendarPage },
  { pattern: /^\/pet$/, component: PetPage },
  { pattern: /^\/rewards$/, component: RewardsPage },
  { pattern: /^\/achievements$/, component: AchievementsPage },
  { pattern: /^\/tutor$/, component: TutorPage },
  { pattern: /^\/vocabulary$/, component: VocabularyPage },
  { pattern: /^\/reference$/, component: ReferencePage },
  { pattern: /^\/notes$/, component: NotesPage },
  { pattern: /^\/resources$/, component: ResourcesPage },
  { pattern: /^\/settings$/, component: SettingsPage },
  { pattern: /^.*$/, component: NotFound },
];
