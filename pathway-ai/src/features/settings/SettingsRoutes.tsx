import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { ProfileSettings } from './ProfileSettings';
import { AppearanceSettings } from './AppearanceSettings';
import { MemorySettings } from './MemorySettings';
import { NotificationSettings } from './NotificationSettings';
import { SharingSettings } from './SharingSettings';
import { DataSettings } from './DataSettings';
import { PageHeader } from '@/components/ui/shared';

const TABS = [
  { to: 'profile', label: 'Profile' },
  { to: 'appearance', label: 'Appearance & access' },
  { to: 'memory', label: 'What the AI remembers' },
  { to: 'notifications', label: 'Notifications' },
  { to: 'sharing', label: 'Sharing' },
  { to: 'data', label: 'Your data' },
];

export default function SettingsRoutes() {
  return (
    <div className="page">
      <PageHeader eyebrow="Assistant" title="Settings" description="Your profile drives everything the app recommends. Changing anything here changes the whole system." />

      <nav className="settings-nav" aria-label="Settings sections">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `settings-tab${isActive ? ' is-active' : ''}`}>
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <Routes>
          <Route index element={<Navigate to="profile" replace />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="appearance" element={<AppearanceSettings />} />
          <Route path="memory" element={<MemorySettings />} />
          <Route path="notifications" element={<NotificationSettings />} />
          <Route path="sharing" element={<SharingSettings />} />
          <Route path="data" element={<DataSettings />} />
          <Route path="*" element={<Navigate to="profile" replace />} />
        </Routes>
      </div>
    </div>
  );
}
