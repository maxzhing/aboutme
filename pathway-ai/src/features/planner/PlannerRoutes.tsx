import { Route, Routes, Link } from 'react-router-dom';
import { PlannerHome } from './PlannerHome';
import { CalendarPage } from './CalendarPage';
import { DeadlinesPage } from './DeadlinesPage';
import { StudyPlanPage } from './StudyPlanPage';
import { SummerPage } from './SummerPage';

export default function PlannerRoutes() {
  return (
    <Routes>
      <Route index element={<PlannerHome />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="deadlines" element={<DeadlinesPage />} />
      <Route path="study-plan" element={<StudyPlanPage />} />
      <Route path="summer" element={<SummerPage />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/planner" className="btn mt-4">
              Back to the planner
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
