import { Route, Routes, Link } from 'react-router-dom';
import { MajorExplorer } from './MajorExplorer';
import { MajorDetail } from './MajorDetail';
import { MajorCompare } from './MajorCompare';

export default function MajorRoutes() {
  return (
    <Routes>
      <Route index element={<MajorExplorer />} />
      <Route path="compare" element={<MajorCompare />} />
      <Route path=":majorId" element={<MajorDetail />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/majors" className="btn mt-4">
              Back to majors
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
