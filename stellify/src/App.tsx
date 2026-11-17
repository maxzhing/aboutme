import { useEffect } from 'react';
import { motion } from 'framer-motion';
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
    // each page settles in softly (framer-motion skips this when motion is reduced)
    if (m) return <motion.div key={path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}><r.component {...(m.groups ?? {})} /></motion.div>;
  }
  const NotFound = ROUTES[ROUTES.length - 1].component;
  return <NotFound />;
}

export function App() {
  return <AppShell><Outlet /></AppShell>;
}
