import { Route, Routes } from 'react-router-dom';
import { CollegeHome } from './CollegeHome';
import { CollegeMatchPage } from './CollegeMatchPage';
import { CollegeListPage } from './CollegeListPage';
import { ComparePage } from './ComparePage';
import { FitMapPage } from './FitMapPage';
import { CostPage } from './CostPage';
import { CollegeProfile } from './CollegeProfile';

export default function CollegeRoutes() {
  return (
    <Routes>
      <Route index element={<CollegeHome />} />
      <Route path="match" element={<CollegeMatchPage />} />
      <Route path="list" element={<CollegeListPage />} />
      <Route path="compare" element={<ComparePage />} />
      <Route path="map" element={<FitMapPage />} />
      <Route path="cost" element={<CostPage />} />
      <Route path=":collegeId" element={<CollegeProfile />} />
    </Routes>
  );
}
