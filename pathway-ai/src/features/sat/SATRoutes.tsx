import { Route, Routes, Link } from 'react-router-dom';
import { SATHome } from './SATHome';
import { SATPracticePage } from './SATPracticePage';
import { SATBankPage } from './SATBankPage';
import { SATWeaknessPage } from './SATWeaknessPage';
import { SATScoresPage } from './SATScoresPage';
import { SATPlanPage } from './SATPlanPage';

export default function SATRoutes() {
  return (
    <Routes>
      <Route index element={<SATHome />} />
      <Route path="practice" element={<SATPracticePage />} />
      <Route path="bank" element={<SATBankPage />} />
      <Route path="weaknesses" element={<SATWeaknessPage />} />
      <Route path="scores" element={<SATScoresPage />} />
      <Route path="plan" element={<SATPlanPage />} />
      <Route
        path="*"
        element={
          <div className="page">
            <p className="t-lg">That page does not exist.</p>
            <Link to="/app/sat" className="btn mt-4">
              Back to the SAT Lab
            </Link>
          </div>
        }
      />
    </Routes>
  );
}
