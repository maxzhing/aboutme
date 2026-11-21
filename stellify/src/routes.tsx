import { lazy, type ComponentType } from 'react';
import Link from 'next/link';
import { DashboardPage } from './pages/Dashboard';
import { DiagnosticPage, OnboardingPage, PlanReadyPage } from './pages/Onboarding';
const CurriculumPage = lazy(() => import('./pages/Learn').then((m) => ({ default: m.CurriculumPage })));
const GrammarPage = lazy(() => import('./pages/Learn').then((m) => ({ default: m.GrammarPage })));
const LessonPage = lazy(() => import('./pages/Learn').then((m) => ({ default: m.LessonPage })));
const DesmosPage = lazy(() => import('./pages/Desmos').then((m) => ({ default: () => <m.DesmosHubPage tab="lessons" /> })));
const OfficialPage = lazy(() => import('./pages/Official').then((m) => ({ default: m.OfficialPage })));
const CourseHomePage = lazy(() => import('./pages/Calc').then((m) => ({ default: m.CourseHomePage })));
const CourseLessonPage = lazy(() => import('./pages/Calc').then((m) => ({ default: m.CourseLessonPage })));
const CourseReviewPage = lazy(() => import('./pages/Calc').then((m) => ({ default: m.CourseReviewPage })));
const CalcTestPageL = lazy(() => import('./pages/CalcTest').then((m) => ({ default: m.CalcTestPage })));
const CalcFrqPageL = lazy(() => import('./pages/CalcFrq').then((m) => ({ default: m.CalcFrqPage })));
const CalcFormulasPageL = lazy(() => import('./pages/CalcFrq').then((m) => ({ default: m.CalcFormulasPage })));
const ChapterPage = lazy(() => import('./pages/Course').then((m) => ({ default: m.ChapterPage })));
const HacksPage = lazy(() => import('./pages/Hacks').then((m) => ({ default: m.HacksPage })));
const BankPage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.BankPage })));
const HardPage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.HardPage })));
const SessionPage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.SessionPage })));
const SmartPage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.SmartPage })));
const TimedPage = lazy(() => import('./pages/Practice').then((m) => ({ default: m.TimedPage })));
const ArenaPage = lazy(() => import('./pages/Challenges').then((m) => ({ default: m.ArenaPage })));
const DailyPage = lazy(() => import('./pages/Challenges').then((m) => ({ default: m.DailyPage })));
const SpeedPage = lazy(() => import('./pages/Challenges').then((m) => ({ default: m.SpeedPage })));
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.AnalyticsPage })));
const ReportPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.ReportPage })));
const MistakesPage = lazy(() => import('./pages/Mistakes').then((m) => ({ default: m.MistakesPage })));
const MockResultsPage = lazy(() => import('./pages/Mocks').then((m) => ({ default: m.MockResultsPage })));
const MockRunPage = lazy(() => import('./pages/Mocks').then((m) => ({ default: m.MockRunPage })));
const MocksPage = lazy(() => import('./pages/Mocks').then((m) => ({ default: m.MocksPage })));
const CalendarPage = lazy(() => import('./pages/Calendar').then((m) => ({ default: m.CalendarPage })));
const AchievementsPage = lazy(() => import('./pages/Companion').then((m) => ({ default: m.AchievementsPage })));
const PetPage = lazy(() => import('./pages/Companion').then((m) => ({ default: m.PetPage })));
const RewardsPage = lazy(() => import('./pages/Companion').then((m) => ({ default: m.RewardsPage })));
const NotesPage = lazy(() => import('./pages/Tools').then((m) => ({ default: m.NotesPage })));
const ReferencePage = lazy(() => import('./pages/Tools').then((m) => ({ default: m.ReferencePage })));
const ResourcesPage = lazy(() => import('./pages/Tools').then((m) => ({ default: m.ResourcesPage })));
const TutorPage = lazy(() => import('./pages/Tools').then((m) => ({ default: m.TutorPage })));
const VocabularyPage = lazy(() => import('./pages/Tools').then((m) => ({ default: m.VocabularyPage })));
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })));
const QcPage = lazy(() => import('./pages/Qc').then((m) => ({ default: m.QcPage })));
const RemixPage = lazy(() => import('./pages/Remix').then((m) => ({ default: m.RemixPage })));
const StudioPage = lazy(() => import('./pages/Studio').then((m) => ({ default: m.StudioPage })));
import { TypesetContext } from './components/RichText';
import { PathPage, PathSetPage } from './pages/Path';
const MaintainerPage = lazy(() => import('./pages/Maintainer').then((m) => ({ default: m.MaintainerPage })));
const TestDayPage = lazy(() => import('./pages/TestDay').then((m) => ({ default: m.TestDayPage })));
const WorkedIndexPage = lazy(() => import('./pages/Worked').then((m) => ({ default: m.WorkedIndexPage })));
const WorkedSkillPage = lazy(() => import('./pages/Worked').then((m) => ({ default: m.WorkedSkillPage })));
const PredictPage = lazy(() => import('./pages/Predict').then((m) => ({ default: m.PredictPage })));
const DesmosLabPage = lazy(() => import('./pages/Desmos').then((m) => ({ default: () => <m.DesmosHubPage tab="lab" /> })));
const AboutPage = lazy(() => import('./pages/Trust').then((m) => ({ default: m.AboutPage })));
const ChangelogPage = lazy(() => import('./pages/Trust').then((m) => ({ default: m.ChangelogPage })));
const HowWeWritePage = lazy(() => import('./pages/Trust').then((m) => ({ default: m.HowWeWritePage })));
const MethodologyPage = lazy(() => import('./pages/Trust').then((m) => ({ default: m.MethodologyPage })));
const PrivacyPage = lazy(() => import('./pages/Trust').then((m) => ({ default: m.PrivacyPage })));

function NotFound() {
  return <div className="card p-10 text-center"><h1 className="text-2xl font-bold">Page not found</h1><p className="mt-2 text-sm text-muted">That page does not exist.</p><Link href="/" className="btn-primary mt-4">Back to the dashboard</Link></div>;
}
const Math_ = () => <CurriculumPage section="math" />;
const PathMath = () => <PathPage section="math" />;
const PathRw = () => <PathPage section="rw" />;
/** AP Computer Science A prose is full of Java string literals: keep its quotes straight. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const course = (C: ComponentType<any>) => function CoursePage(p: { course: string }) { return <TypesetContext.Provider value={p.course !== 'csa'}><C {...p} /></TypesetContext.Provider>; };
const CourseHome = course(CourseHomePage), CourseReview = course(CourseReviewPage), CourseLesson = course(CourseLessonPage);
const CalcTest = course(CalcTestPageL), CalcFrq = course(CalcFrqPageL), CalcFormulas = course(CalcFormulasPageL);
const Rw = () => <CurriculumPage section="rw" />;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ROUTES: { pattern: RegExp; component: ComponentType<any> }[] = [
  { pattern: /^\/$/, component: DashboardPage },
  { pattern: /^\/onboarding$/, component: OnboardingPage },
  { pattern: /^\/onboarding\/plan$/, component: PlanReadyPage },
  { pattern: /^\/path$/, component: PathMath },
  { pattern: /^\/path\/rw$/, component: PathRw },
  { pattern: /^\/path\/set$/, component: PathSetPage },
  { pattern: /^\/diagnostic$/, component: DiagnosticPage },
  { pattern: /^\/learn$/, component: CurriculumPage },
  { pattern: /^\/learn\/math$/, component: Math_ },
  { pattern: /^\/learn\/rw$/, component: Rw },
  { pattern: /^\/learn\/(?<skill>[a-z0-9]+)$/, component: LessonPage },
  { pattern: /^\/learn\/(?<skill>[a-z0-9]+)\/(?<chapter>[a-z0-9]+-\d+)$/, component: ChapterPage },
  { pattern: /^\/grammar$/, component: GrammarPage },
  { pattern: /^\/hacks$/, component: HacksPage },
  { pattern: /^\/desmos$/, component: DesmosPage },
  { pattern: /^\/desmos\/lab$/, component: DesmosLabPage },
  { pattern: /^\/practice$/, component: BankPage },
  { pattern: /^\/practice\/session$/, component: SessionPage },
  { pattern: /^\/practice\/smart$/, component: SmartPage },
  { pattern: /^\/practice\/hard$/, component: HardPage },
  { pattern: /^\/remix$/, component: RemixPage },
  { pattern: /^\/official$/, component: OfficialPage },
  { pattern: /^\/music\/studio$/, component: StudioPage },
  // AP self-study courses: /calc, /csa, /micro, /macro, /stats, /music, their lessons and unit reviews
  { pattern: /^\/(?<course>calc|csa|micro|macro|stats|music)$/, component: CourseHome },
  { pattern: /^\/(?<course>calc|csa|micro|macro|stats|music)\/review\/(?<unit>\d+)$/, component: CourseReview },
  { pattern: /^\/calc\/test\/(?<test>[a-z0-9-]+)$/, component: CalcTest },
  { pattern: /^\/calc\/frq\/(?<frq>[a-z0-9-]+)$/, component: CalcFrq },
  { pattern: /^\/calc\/formulas$/, component: CalcFormulas },
  { pattern: /^\/(?<course>calc|csa|micro|macro|stats|music)\/(?<lesson>[a-z]+\d+-\d+)$/, component: CourseLesson },
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
  { pattern: /^\/qc$/, component: QcPage },
  { pattern: /^\/settings$/, component: SettingsPage },
  { pattern: /^\/maintainer$/, component: MaintainerPage },
  { pattern: /^\/test-day$/, component: TestDayPage },
  { pattern: /^\/worked$/, component: WorkedIndexPage },
  { pattern: /^\/predict$/, component: PredictPage },
  { pattern: /^\/worked\/(?<skill>[a-z0-9]+)$/, component: WorkedSkillPage },
  { pattern: /^\/about$/, component: AboutPage },
  { pattern: /^\/methodology$/, component: MethodologyPage },
  { pattern: /^\/how-we-write$/, component: HowWeWritePage },
  { pattern: /^\/privacy$/, component: PrivacyPage },
  { pattern: /^\/changelog$/, component: ChangelogPage },
  { pattern: /^.*$/, component: NotFound },
];
