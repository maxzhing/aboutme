import { lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';

import { ThemeEffect } from '@/components/layout/ThemeEffect';
import { RouteBoundary } from '@/components/layout/RouteBoundary';
import { LoadingBlock } from '@/components/ui/primitives';

/* Landing and auth load eagerly — they are the first paint for new visitors.
   Everything behind them is split, so a visitor reading the landing page never
   downloads the app shell, the onboarding wizard or the catalog. */
import { Landing } from '@/features/landing/Landing';
import { AuthPage } from '@/features/auth/AuthPage';

const AppShell = lazy(() => import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })));
const Onboarding = lazy(() => import('@/features/onboarding/Onboarding').then((m) => ({ default: m.Onboarding })));


/* Everything inside the app is split, so the landing page stays light. */
const Dashboard = lazy(() => import('@/features/dashboard/Dashboard'));
const PathRoutes = lazy(() => import('@/features/dashboard/PathRoutes'));
const CollegeRoutes = lazy(() => import('@/features/colleges/CollegeRoutes'));
const MajorRoutes = lazy(() => import('@/features/majors/MajorRoutes'));
const CareerRoutes = lazy(() => import('@/features/careers/CareerRoutes'));
const APRoutes = lazy(() => import('@/features/ap/APRoutes'));
const SATRoutes = lazy(() => import('@/features/sat/SATRoutes'));
const ActivityRoutes = lazy(() => import('@/features/activities/ActivityRoutes'));
const ResearchPage = lazy(() => import('@/features/research/ResearchPage'));
const ScholarshipsPage = lazy(() => import('@/features/scholarships/ScholarshipsPage'));
const ProjectsPage = lazy(() => import('@/features/projects/ProjectsPage'));
const PlannerRoutes = lazy(() => import('@/features/planner/PlannerRoutes'));
const ApplicationRoutes = lazy(() => import('@/features/applications/ApplicationRoutes'));
const CounselorPage = lazy(() => import('@/features/counselor/CounselorPage'));
const SettingsRoutes = lazy(() => import('@/features/settings/SettingsRoutes'));
const AdminPage = lazy(() => import('@/features/admin/AdminPage'));
const ParentView = lazy(() => import('@/features/parent/ParentView'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

/** Gate for authenticated areas. Sends new accounts through onboarding first. */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const onboardedAt = useAppStore((s) => s.state.profile.onboardedAt);
  const location = useLocation();

  if (status === 'booting') return <LoadingBlock label="Loading your profile" />;
  if (status === 'anonymous') return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!onboardedAt && !location.pathname.startsWith('/onboarding')) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export default function App() {
  const boot = useAppStore((s) => s.boot);
  const status = useAppStore((s) => s.status);

  useEffect(() => {
    void boot();
  }, [boot]);

  return (
    <>
      <ThemeEffect />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={status === 'ready' ? <Navigate to="/app" replace /> : <Landing />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
        <Route path="/reset-password" element={<AuthPage mode="reset" />} />
        <Route
          path="/onboarding"
          element={
            status === 'booting' ? (
              <LoadingBlock />
            ) : status === 'anonymous' ? (
              <Navigate to="/signup" replace />
            ) : (
              <RouteBoundary>
                <Onboarding />
              </RouteBoundary>
            )
          }
        />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <RouteBoundary>
                <AppShell />
              </RouteBoundary>
            </RequireAuth>
          }
        >
          <Route index element={<RouteBoundary><Dashboard /></RouteBoundary>} />
          <Route path="path/*" element={<RouteBoundary><PathRoutes /></RouteBoundary>} />
          <Route path="colleges/*" element={<RouteBoundary><CollegeRoutes /></RouteBoundary>} />
          <Route path="majors/*" element={<RouteBoundary><MajorRoutes /></RouteBoundary>} />
          <Route path="careers/*" element={<RouteBoundary><CareerRoutes /></RouteBoundary>} />
          <Route path="ap/*" element={<RouteBoundary><APRoutes /></RouteBoundary>} />
          <Route path="sat/*" element={<RouteBoundary><SATRoutes /></RouteBoundary>} />
          <Route path="activities/*" element={<RouteBoundary><ActivityRoutes /></RouteBoundary>} />
          <Route path="research" element={<RouteBoundary><ResearchPage /></RouteBoundary>} />
          <Route path="scholarships" element={<RouteBoundary><ScholarshipsPage /></RouteBoundary>} />
          <Route path="projects" element={<RouteBoundary><ProjectsPage /></RouteBoundary>} />
          <Route path="planner/*" element={<RouteBoundary><PlannerRoutes /></RouteBoundary>} />
          <Route path="applications/*" element={<RouteBoundary><ApplicationRoutes /></RouteBoundary>} />
          <Route path="counselor" element={<RouteBoundary><CounselorPage /></RouteBoundary>} />
          <Route path="settings/*" element={<RouteBoundary><SettingsRoutes /></RouteBoundary>} />
          <Route path="admin" element={<RouteBoundary><AdminPage /></RouteBoundary>} />
          <Route path="parent" element={<RouteBoundary><ParentView /></RouteBoundary>} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="*" element={<NotFound standalone />} />
      </Routes>
    </>
  );
}

function NotFound({ standalone }: { standalone?: boolean }) {
  return (
    <div className="page">
      <div className="card card-pad-lg ta-center" style={{ maxWidth: 480, margin: '3rem auto' }}>
        <p className="eyebrow">404</p>
        <h1 className="t-2xl display mt-2">That page does not exist</h1>
        <p className="t-sm subtle mt-2">
          The link may be out of date, or the page may have moved.
        </p>
        <a className="btn btn-primary mt-5" href={standalone ? '/' : '/app'}>
          {standalone ? 'Back to the homepage' : 'Back to your dashboard'}
        </a>
      </div>
    </div>
  );
}
