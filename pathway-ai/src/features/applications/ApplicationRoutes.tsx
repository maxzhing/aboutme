import { Route, Routes, Link } from 'react-router-dom';
import { ApplicationDashboard } from './ApplicationDashboard';
import { ApplicationDetail } from './ApplicationDetail';
import { EssayWorkshop } from './EssayWorkshop';
import { ActivityListPage } from './ActivityListPage';
import { RecommendationsPage } from './RecommendationsPage';

export default function ApplicationRoutes() {
  return (
    <Routes>
      <Route index element={<ApplicationDashboard />} />
      <Route path="essays" element={<EssayWorkshop />} />
      <Route path="essays/:essayId" element={<EssayWorkshop />} />
      <Route path="activity-list" element={<ActivityListPage />} />
      <Route path="recommendations" element={<RecommendationsPage />} />
      <Route path=":collegeId" element={<ApplicationDetail />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/applications" className="btn mt-4">
              Back to applications
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
