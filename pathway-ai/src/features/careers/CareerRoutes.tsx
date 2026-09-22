import { Route, Routes, Link } from 'react-router-dom';
import { CareerExplorer } from './CareerExplorer';
import { CareerDetail } from './CareerDetail';

export default function CareerRoutes() {
  return (
    <Routes>
      <Route index element={<CareerExplorer />} />
      <Route path=":careerId" element={<CareerDetail />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/careers" className="btn mt-4">
              Back to careers
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
