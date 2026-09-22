import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/primitives';
import { useAppStore } from '@/store/useAppStore';
import { timeAgo } from '@/lib/date';

export function NotificationMenu({ unread }: { unread: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { state, markNotificationRead, markAllNotificationsRead } = useAppStore();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        className="btn-icon"
      >
        <span className="relative row">
          <Icon name="bell" size={16} />
          {unread ? (
            <span
              className="absolute"
              style={{
                top: -3,
                right: -3,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--danger)',
                border: '1.5px solid var(--bg)',
              }}
              aria-hidden="true"
            />
          ) : null}
        </span>
      </Button>

      {open ? (
        <div
          className="card card-raised absolute"
          style={{ top: 'calc(100% + 8px)', right: 0, width: 340, maxHeight: 420, overflowY: 'auto', zIndex: 50 }}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="card-head">
            <span className="w-600 t-sm">Notifications</span>
            {state.notifications.some((n) => !n.read) ? (
              <button type="button" className="t-xs c-accent" onClick={markAllNotificationsRead}>
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="p-3 col g-1">
            {state.notifications.length ? (
              state.notifications.slice(0, 12).map((n) => (
                <Link
                  key={n.id}
                  to={n.route ?? '/app'}
                  className="nav-item"
                  onClick={() => {
                    markNotificationRead(n.id);
                    setOpen(false);
                  }}
                  style={{ alignItems: 'flex-start' }}
                >
                  <span className="nav-icon" style={{ marginTop: 2 }}>
                    <Icon
                      name={n.kind === 'deadline' ? 'clock' : n.kind === 'achievement' ? 'trophy' : n.kind === 'opportunity' ? 'sparkles' : 'info'}
                      size={15}
                    />
                  </span>
                  <span className="col grow" style={{ minWidth: 0 }}>
                    <span className={`t-sm ${n.read ? '' : 'w-600'}`}>{n.title}</span>
                    <span className="t-2xs subtle">{n.body}</span>
                    <span className="t-2xs faint">{timeAgo(n.createdAt)}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="t-sm subtle p-3 ta-center">
                Nothing yet. Deadline reminders and opportunity alerts will land here.
              </p>
            )}
          </div>
          <div className="card-foot">
            <Link to="/app/settings/notifications" className="t-xs" onClick={() => setOpen(false)}>
              Notification settings
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
