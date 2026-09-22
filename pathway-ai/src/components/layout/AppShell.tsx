import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { useEngine } from '@/store/useEngine';
import { Icon } from '@/components/ui/Icon';
import { Button, ToastStack } from '@/components/ui/primitives';
import { CommandPalette } from './CommandPalette';
import { NotificationMenu } from './NotificationMenu';
import { NAV, NAV_GROUPS, MOBILE_NAV } from './nav';
import { deadlineIntelligence } from '@/domain/engine/planning';
import { initials } from '@/lib/format';

export function AppShell() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, toasts, dismissToast, paletteOpen, setPaletteOpen, state } = useAppStore();
  const ctx = useEngine();

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Cmd/Ctrl+K opens the command palette anywhere in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
      if (e.key === '/' && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? '')) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setPaletteOpen]);

  const urgentDeadlines = deadlineIntelligence(ctx).filter((d) => d.daysAway <= 14).length;
  const unread = state.notifications.filter((n) => !n.read).length;

  return (
    <div className="shell">
      <a href="#main-content" className="sr-only sr-only-focusable">
        Skip to main content
      </a>

      <aside className={`sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Main navigation">
        <Link to="/app" className="sidebar-brand">
          <span className="logo" aria-hidden="true">
            P
          </span>
          <span className="wordmark">
            Pathway <span className="wordmark-ai">AI</span>
          </span>
        </Link>

        <nav className="sidebar-nav">
          {NAV_GROUPS.map((group) => (
            <div className="sidebar-group" key={group}>
              <p className="sidebar-group-label">{group}</p>
              {NAV.filter((n) => n.group === group).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item${isActive ? ' is-active' : ''}`}
                >
                  <span className="nav-icon">
                    <Icon name={item.icon} size={17} />
                  </span>
                  {item.label}
                  {item.to === '/app/planner' && urgentDeadlines > 0 ? (
                    <span className="nav-count is-alert">{urgentDeadlines}</span>
                  ) : null}
                  {item.to === '/app/colleges' && state.collegeList.length > 0 ? (
                    <span className="nav-count">{state.collegeList.length}</span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <Link to="/app/settings/account" className="nav-item">
            <span className="avatar" aria-hidden="true">
              {initials(user?.name ?? 'Student')}
            </span>
            <span className="col grow" style={{ minWidth: 0 }}>
              <span className="t-sm w-500 truncate">{user?.name ?? 'Student'}</span>
              <span className="t-2xs faint truncate">Grade {ctx.grade}</span>
            </span>
          </Link>
        </div>
      </aside>

      {sidebarOpen ? (
        <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      ) : null}

      <div className="main">
        <header className="topbar no-print">
          <Button
            variant="ghost"
            size="sm"
            icon="menu"
            className="md-hide"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Open navigation"
            aria-expanded={sidebarOpen}
          />
          <button type="button" className="btn btn-sm grow" style={{ justifyContent: 'flex-start', maxWidth: 420 }} onClick={() => setPaletteOpen(true)}>
            <Icon name="search" size={15} />
            <span className="subtle">Search or ask anything</span>
            <span className="ml-auto row g-1 sm-hide">
              <kbd className="kbd">⌘</kbd>
              <kbd className="kbd">K</kbd>
            </span>
          </button>
          <div className="row g-1 ml-auto">
            <NotificationMenu unread={unread} />
            <Button variant="ghost" size="sm" icon="sparkles" to="/app/counselor" aria-label="Open AI counselor" />
          </div>
        </header>

        <main id="main-content" className="grow" tabIndex={-1}>
          <Outlet />
        </main>
      </div>

      <nav className="mobile-nav no-print" aria-label="Primary">
        <div className="mobile-nav-inner">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' is-active' : ''}`}
            >
              <span className="mobile-nav-icon">
                <Icon name={item.icon} size={18} />
              </span>
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      {paletteOpen ? <CommandPalette onClose={() => setPaletteOpen(false)} /> : null}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
