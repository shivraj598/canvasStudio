import { Route, Routes } from 'react-router';
import { LandingPage } from './pages/LandingPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
    </Routes>
  );
}
