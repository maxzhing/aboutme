import { Route, Routes, Link } from 'react-router-dom';
import { APHome } from './APHome';
import { APPlanPage } from './APPlanPage';
import { APCoursePage } from './APCoursePage';
import { APUnitPage } from './APUnitPage';
import { APStudyPage } from './APStudyPage';
import { APQuestionBank } from './APQuestionBank';
import { APWeakAreas } from './APWeakAreas';

export default function APRoutes() {
  return (
    <Routes>
      <Route index element={<APHome />} />
      <Route path="plan" element={<APPlanPage />} />
      <Route path="bank" element={<APQuestionBank />} />
      <Route path="weak-areas" element={<APWeakAreas />} />
      <Route path="study/:courseId" element={<APStudyPage />} />
      <Route path="course/:courseId" element={<APCoursePage />} />
      <Route path="course/:courseId/unit/:unitId" element={<APUnitPage />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/ap" className="btn mt-4">
              Back to the AP Center
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
