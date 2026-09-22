import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { Icon, type IconName } from './Icon';

/* ==========================================================================
   UI primitives. Every interactive element here is keyboard accessible and
   carries the ARIA the pattern requires.
   ========================================================================== */

export type Tone = 'default' | 'accent' | 'ok' | 'warn' | 'danger' | 'info' | 'ai';

/* ------------------------------------------------------------------ Button */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'soft' | 'ghost' | 'danger' | 'ai' | 'inverse';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  block?: boolean;
  to?: string;
  href?: string;
}

export function Button({
  variant = 'default',
  size = 'md',
  icon,
  iconRight,
  loading,
  block,
  to,
  href,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    'btn',
    variant !== 'default' && `btn-${variant}`,
    size !== 'md' && `btn-${size}`,
    block && 'btn-block',
    !children && (icon || iconRight) && 'btn-icon',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <>
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === 'lg' ? 18 : 15} /> : null}
      {children}
      {iconRight ? <Icon name={iconRight} size={size === 'lg' ? 18 : 15} /> : null}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || undefined}>
        {inner}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noreferrer noopener">
        {inner}
      </a>
    );
  }
  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {inner}
    </button>
  );
}

/* -------------------------------------------------------------------- Card */

export function Card({
  children,
  className = '',
  pad = 'md',
  hover,
  flat,
  inset,
  raised,
  as: As = 'div',
  ...rest
}: {
  children: ReactNode;
  className?: string;
  pad?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  flat?: boolean;
  inset?: boolean;
  raised?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
} & React.HTMLAttributes<HTMLElement>) {
  const classes = [
    'card',
    pad === 'sm' ? 'card-pad-sm' : pad === 'lg' ? 'card-pad-lg' : pad === 'md' ? 'card-pad' : '',
    hover && 'card-hover',
    flat && 'card-flat',
    inset && 'card-inset',
    raised && 'card-raised',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <As className={classes} {...rest}>
      {children}
    </As>
  );
}

/* ------------------------------------------------------------------- Badge */

export function Badge({
  children,
  tone = 'default',
  size,
  dot,
  outline,
  className = '',
  title,
}: {
  children: ReactNode;
  tone?: Tone;
  size?: 'lg';
  dot?: boolean;
  outline?: boolean;
  className?: string;
  title?: string;
}) {
  const classes = [
    'badge',
    tone !== 'default' && `badge-${tone}`,
    size === 'lg' && 'badge-lg',
    dot && 'badge-dot',
    outline && 'badge-outline',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------- Chip */

export function Chip({
  children,
  selected,
  onClick,
  onRemove,
  size,
  title,
  disabled,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  size?: 'sm';
  title?: string;
  disabled?: boolean;
}) {
  const classes = ['chip', size === 'sm' && 'chip-sm', !onClick && !onRemove && 'chip-static'].filter(Boolean).join(' ');
  if (!onClick) {
    return (
      <span className={classes} title={title}>
        {children}
        {onRemove ? (
          <button className="chip-remove" onClick={onRemove} aria-label="Remove" type="button">
            <Icon name="x" size={11} />
          </button>
        ) : null}
      </span>
    );
  }
  return (
    <button type="button" className={classes} aria-pressed={selected} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------- Tabs */

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  active,
  onChange,
  pill,
  ariaLabel,
}: {
  items: TabItem[];
  active: string;
  onChange: (id: string) => void;
  pill?: boolean;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = items.findIndex((i) => i.id === active);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
      onChange(items[next].id);
      const buttons = ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      buttons?.[next]?.focus();
    }
    if (e.key === 'Home') {
      e.preventDefault();
      onChange(items[0].id);
    }
    if (e.key === 'End') {
      e.preventDefault();
      onChange(items[items.length - 1].id);
    }
  };
  return (
    <div className={`tabs${pill ? ' tabs-pill' : ''}`} role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown} ref={ref}>
      {items.map((item) => (
        <button
          key={item.id}
          role="tab"
          type="button"
          className="tab"
          aria-selected={item.id === active}
          tabIndex={item.id === active ? 0 : -1}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {item.count !== undefined ? <span className="faint t-2xs mono"> {item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  describedBy,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  describedBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    node?.querySelector<HTMLElement>('[data-autofocus], button, input, select, textarea, a[href]')?.focus();
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && node) {
        // Trap focus inside the dialog.
        const focusable = Array.from(
          node.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`modal${size !== 'md' ? ` modal-${size}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        ref={ref}
      >
        <div className="modal-head">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          <Button variant="ghost" size="sm" icon="x" onClick={onClose} aria-label="Close dialog" />
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- Accordion */

export function Accordion({
  title,
  children,
  defaultOpen,
  meta,
  icon,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: ReactNode;
  icon?: IconName;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const panelId = useId();
  return (
    <div className={`acc${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="acc-trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {icon ? <Icon name={icon} size={15} /> : null}
        <span className="grow">{title}</span>
        {meta}
        <Icon name="chevron-right" size={15} className="acc-chevron" />
      </button>
      {open ? (
        <div className="acc-panel" id={panelId}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------- Tooltip */

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <span
      className="tip"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      aria-describedby={show ? id : undefined}
    >
      {children}
      {show ? (
        <span className="tip-body" role="tooltip" id={id}>
          {label}
        </span>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------ Empty states */

export function EmptyState({
  icon = 'compass',
  title,
  description,
  action,
  small,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
  small?: boolean;
}) {
  return (
    <div className={`empty${small ? ' empty-sm' : ''}`}>
      <div className="empty-art">
        <Icon name={icon} size={22} />
      </div>
      <p className="empty-title">{title}</p>
      {description ? <p className="empty-desc">{description}</p> : null}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------- Loading/err */

export function Skeleton({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skel skel-text" style={{ width: `${100 - (i % 3) * 14}%` }} />
      ))}
    </div>
  );
}

export function LoadingBlock({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="col center items-center g-3 p-8" role="status" aria-live="polite">
      <span className="spinner spinner-lg c-accent" />
      <p className="t-sm subtle">{label}…</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'This is on us, not you. Try again, and if it keeps happening the data on this page may be unavailable.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="notice notice-danger" role="alert">
      <Icon name="alert" size={17} className="notice-icon" />
      <div>
        <p className="w-600">{title}</p>
        <p className="t-xs mt-1">{description}</p>
        {onRetry ? (
          <Button size="sm" variant="ghost" icon="refresh" onClick={onRetry} className="mt-2">
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Notice */

export function Notice({
  tone = 'default',
  icon,
  children,
  className = '',
}: {
  tone?: 'default' | 'warn' | 'ai' | 'info' | 'danger' | 'ok';
  icon?: IconName;
  children: ReactNode;
  className?: string;
}) {
  const defaultIcon: IconName =
    tone === 'warn' ? 'alert' : tone === 'danger' ? 'alert' : tone === 'ai' ? 'sparkles' : tone === 'ok' ? 'check' : 'info';
  return (
    <div className={`notice${tone !== 'default' ? ` notice-${tone}` : ''} ${className}`} role={tone === 'danger' ? 'alert' : undefined}>
      <Icon name={icon ?? defaultIcon} size={16} className="notice-icon" />
      <div className="grow">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ Toasts */

export function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: { id: string; message: string; tone?: string }[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.tone && t.tone !== 'default' ? ` is-${t.tone}` : ''}`}>
          <span className="grow">{t.message}</span>
          <button type="button" onClick={() => onDismiss(t.id)} aria-label="Dismiss" className="subtle">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- Disclosure */

interface DisclosureContext {
  register: (id: string) => void;
}
const DisclosureCtx = createContext<DisclosureContext | null>(null);
export const useDisclosure = () => useContext(DisclosureCtx);

/* ------------------------------------------------------------------ Fields */

export function Field({
  label,
  hint,
  error,
  required,
  children,
  id,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  id?: string;
}) {
  const generated = useId();
  const fieldId = id ?? generated;
  const hintId = `${fieldId}-hint`;
  const errorId = `${fieldId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined;
  return (
    <div className="field">
      <label className={`label${required ? ' label-req' : ''}`} htmlFor={fieldId}>
        {label}
      </label>
      {children({ id: fieldId, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint && !error ? (
        <p className="hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="err" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="switch-track" aria-hidden="true" />
      <span className="col">
        <span className="t-sm w-500">{label}</span>
        {description ? <span className="t-xs subtle">{description}</span> : null}
      </span>
    </label>
  );
}

/* --------------------------------------------------------------- Checklist */

export function CheckItem({
  checked,
  onToggle,
  label,
  meta,
}: {
  checked: boolean;
  onToggle: () => void;
  label: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className={`checklist-item${checked ? ' is-done' : ''}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        className={`checkbox${checked ? ' is-on' : ''}`}
        onClick={onToggle}
      >
        <Icon name="check" size={12} strokeWidth={2.6} />
      </button>
      <span className="grow t-sm checklist-label">{label}</span>
      {meta}
    </div>
  );
}

/* ---------------------------------------------------------- Copy-to-board */

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
    } catch {
      // Clipboard may be unavailable; fall back to a selection prompt.
      window.prompt('Copy this text', text);
    }
  }, [text]);
  return (
    <Button size="sm" variant="ghost" icon={done ? 'check' : 'copy'} onClick={copy}>
      {done ? 'Copied' : label}
    </Button>
  );
}

/* ------------------------------------------------------------ Search input */

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  label,
  autoFocus,
  size,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  autoFocus?: boolean;
  size?: 'sm' | 'lg';
}) {
  const id = useId();
  return (
    <div className="input-icon grow">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Icon name="search" size={15} />
      <input
        id={id}
        type="search"
        className={`input${size ? ` input-${size}` : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="off"
      />
    </div>
  );
}

/* --------------------------------------------------------- Value formatting */

export function StatTile({
  label,
  value,
  note,
  delta,
  tone,
  small,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  delta?: { value: string; up: boolean };
  tone?: Tone;
  small?: boolean;
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${small ? ' stat-value-sm' : ''}${tone && tone !== 'default' ? ` c-${tone}` : ''}`}>{value}</span>
      {delta ? (
        <span className={`stat-delta ${delta.up ? 'is-up' : 'is-down'}`}>
          <Icon name={delta.up ? 'arrow-up' : 'arrow-down'} size={12} />
          {delta.value}
        </span>
      ) : null}
      {note ? <span className="stat-note">{note}</span> : null}
    </div>
  );
}

export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`pathway:ui:${key}`);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      try {
        localStorage.setItem(`pathway:ui:${key}`, JSON.stringify(v));
      } catch {
        /* storage unavailable — keep the in-memory value */
      }
    },
    [key],
  );
  return [value, set];
}

export function useDebounced<T>(value: T, delay = 220): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const Primitives = { Button, Card, Badge, Chip, Tabs, Modal };
export { useMemo };
