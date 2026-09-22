import type { IconName } from '@/components/ui/Icon';

export interface NavEntry {
  to: string;
  label: string;
  icon: IconName;
  /** Shown in the mobile bottom bar. */
  mobile?: boolean;
  end?: boolean;
  group: string;
}

/** Section 70 sidebar, grouped so the list stays scannable. */
export const NAV: NavEntry[] = [
  { to: '/app', label: 'Home', icon: 'home', mobile: true, end: true, group: 'Today' },
  { to: '/app/path', label: 'My Path', icon: 'compass', group: 'Today' },
  { to: '/app/planner', label: 'Planner', icon: 'calendar', mobile: true, group: 'Today' },

  { to: '/app/colleges', label: 'Colleges', icon: 'graduation', mobile: true, group: 'Colleges' },
  { to: '/app/applications', label: 'Applications', icon: 'note', group: 'Colleges' },
  { to: '/app/scholarships', label: 'Scholarships', icon: 'coins', group: 'Colleges' },

  { to: '/app/majors', label: 'Majors', icon: 'book', group: 'Academics' },
  { to: '/app/careers', label: 'Careers', icon: 'building', group: 'Academics' },
  { to: '/app/ap', label: 'AP Center', icon: 'flask', mobile: true, group: 'Academics' },
  { to: '/app/sat', label: 'SAT Lab', icon: 'target', group: 'Academics' },

  { to: '/app/activities', label: 'Activities', icon: 'users', group: 'Beyond class' },
  { to: '/app/research', label: 'Research', icon: 'microscope', group: 'Beyond class' },
  { to: '/app/projects', label: 'Projects', icon: 'rocket', group: 'Beyond class' },

  { to: '/app/counselor', label: 'AI Counselor', icon: 'sparkles', mobile: true, group: 'Assistant' },
  { to: '/app/settings', label: 'Settings', icon: 'settings', group: 'Assistant' },
];

export const NAV_GROUPS = Array.from(new Set(NAV.map((n) => n.group)));
export const MOBILE_NAV = NAV.filter((n) => n.mobile);
