import { Route, Routes, Link } from 'react-router-dom';
import { ActivityFinder } from './ActivityFinder';
import { MyActivities } from './MyActivities';
import { DepthAnalyser } from './DepthAnalyser';

export default function ActivityRoutes() {
  return (
    <Routes>
      <Route index element={<ActivityFinder />} />
      <Route path="mine" element={<MyActivities />} />
      <Route path="depth" element={<DepthAnalyser />} />
      <Route path="depth/:activityId" element={<DepthAnalyser />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/activities" className="btn mt-4">
              Back to activities
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
