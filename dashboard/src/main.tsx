import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import './index.css';
import { AuthGate } from './auth';
import { Shell } from './components/Shell';
import { HomePage } from './pages/Home';
import { AlertsPage, CalendarPage } from './pages/Simple';
import { LeadDetailPage, LeadsPage } from './pages/Leads';
import { ImportPage } from './pages/Import';
import { SettingsPage } from './pages/Settings';
import { HostingPage } from './pages/Hosting';
import { DeletedPage } from './pages/Deleted';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="leads" element={<LeadsPage />} />
            <Route path="leads/import" element={<ImportPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="hosting" element={<HostingPage />} />
            <Route path="deleted" element={<DeletedPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthGate>
  </StrictMode>,
);
