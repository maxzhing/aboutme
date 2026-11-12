import { useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { useAnchor, usePathname } from 'next/navigation';
import { ROUTES } from './routes';

function Outlet() {
  const path = usePathname();
  const anchor = useAnchor();
  useEffect(() => {
    if (anchor) { const el = document.getElementById(anchor); if (el) { el.scrollIntoView({ block: 'start' }); return; } }
    window.scrollTo(0, 0);
  }, [path, anchor]);
  for (const r of ROUTES) {
    const m = path.match(r.pattern);
    if (m) return <r.component key={path} {...(m.groups ?? {})} />;
  }
  const NotFound = ROUTES[ROUTES.length - 1].component;
  return <NotFound />;
}

export function App() {
  return <AppShell><Outlet /></AppShell>;
}
