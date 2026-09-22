import { Route, Routes, Link } from 'react-router-dom';
import { PathHome } from './PathHome';
import { StudentDNAPage } from './StudentDNAPage';
import { BlindSpotsPage } from './BlindSpotsPage';
import { FourYearPage } from './FourYearPage';
import { WhatIfPage } from './WhatIfPage';
import { InterestGraphPage } from './InterestGraphPage';
import { WeeklyReviewPage } from './WeeklyReviewPage';
import { AchievementsPage } from './AchievementsPage';

export default function PathRoutes() {
  return (
    <Routes>
      <Route index element={<PathHome />} />
      <Route path="dna" element={<StudentDNAPage />} />
      <Route path="blind-spots" element={<BlindSpotsPage />} />
      <Route path="four-year" element={<FourYearPage />} />
      <Route path="what-if" element={<WhatIfPage />} />
      <Route path="graph" element={<InterestGraphPage />} />
      <Route path="weekly" element={<WeeklyReviewPage />} />
      <Route path="achievements" element={<AchievementsPage />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/path" className="btn mt-4">
              Back to My Path
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
