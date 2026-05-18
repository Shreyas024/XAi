import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import ScanHistory from './pages/ScanHistory';
import ScanDetail from './pages/ScanDetail';
import FindingDetail from './pages/FindingDetail';
import Health from './pages/Health';
import CLI from './pages/CLI';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scans" element={<ScanHistory />} />
          <Route path="/scans/:id" element={<ScanDetail />} />
          <Route path="/scans/:id/findings/:findingId" element={<FindingDetail />} />
          <Route path="/health" element={<Health />} />
          <Route path="/cli" element={<CLI />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
