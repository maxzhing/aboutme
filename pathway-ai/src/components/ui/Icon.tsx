/* ==========================================================================
   Icon set — inline SVG, no dependency, consistent 1.6 stroke.
   `currentColor` throughout so icons inherit from context.
   ========================================================================== */

export type IconName =
  | 'home' | 'graduation' | 'compass' | 'book' | 'target' | 'flask' | 'pencil'
  | 'calendar' | 'microscope' | 'coins' | 'rocket' | 'sparkles' | 'settings'
  | 'search' | 'plus' | 'check' | 'x' | 'chevron-right' | 'chevron-down' | 'chevron-left'
  | 'arrow-right' | 'arrow-up' | 'arrow-down' | 'external' | 'info' | 'alert'
  | 'bookmark' | 'heart' | 'clock' | 'chart' | 'list' | 'grid' | 'filter'
  | 'menu' | 'bell' | 'user' | 'users' | 'logout' | 'download' | 'upload'
  | 'trash' | 'edit' | 'copy' | 'link' | 'lock' | 'eye' | 'eye-off' | 'star'
  | 'lightbulb' | 'flag' | 'map' | 'layers' | 'refresh' | 'send' | 'play'
  | 'pause' | 'skip' | 'shield' | 'trending-up' | 'zap' | 'moon' | 'sun'
  | 'more' | 'sliders' | 'help' | 'quote' | 'note' | 'flame' | 'crown'
  | 'trophy' | 'seal' | 'lens' | 'stack' | 'balance' | 'roots' | 'spark' | 'pen'
  | 'music' | 'palette' | 'globe' | 'building' | 'wallet' | 'timer' | 'brain';

const PATHS: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5M5.5 9.5V20a1 1 0 0 0 1 1H9.5v-5.5h5V21h3a1 1 0 0 0 1-1V9.5',
  graduation: 'M12 4 2.5 9 12 14l9.5-5L12 4Zm7 7v4.5c0 1.5-3.1 3-7 3s-7-1.5-7-3V11m16-1v5',
  compass: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5.5-5.5 2 2-5.5 5.5-2Z',
  book: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H19v16H5.5A1.5 1.5 0 0 0 4 20.5v-16ZM4 20.5A1.5 1.5 0 0 1 5.5 19H19v2H5.5A1.5 1.5 0 0 1 4 20.5Z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0-3a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  flask: 'M9 3h6M10 3v6.5L4.8 18A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.7-3L14 9.5V3M7.5 14h9',
  pencil: 'M4 20h4L20 8a2.83 2.83 0 0 0-4-4L4 16v4Zm11-13 3 3',
  calendar: 'M4 8h16M7 3v3m10-3v3M5 21h14a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1Z',
  microscope: 'M7 21h12M9 21V9.5A1.5 1.5 0 0 1 10.5 8h1A1.5 1.5 0 0 1 13 9.5V21M11 8V4.5A1.5 1.5 0 0 1 12.5 3h.5M15 12a5 5 0 0 1-2 9M5 21c0-4.5 2-7 4-8',
  coins: 'M9 13.5a5.5 4 0 1 0 0-8 5.5 4 0 0 0 0 8Zm0 0v3c0 2.2 2.5 4 5.5 4s5.5-1.8 5.5-4V10m-11 3.5c0 1.5 1.2 2.8 3 3.4M14.5 5.5c3 0 5.5 1.8 5.5 4s-2.5 4-5.5 4',
  rocket: 'M5 15c-1.5 1.5-2 6-2 6s4.5-.5 6-2m6.5-6.5a13 13 0 0 0 3.5-9 13 13 0 0 0-9 3.5L7 8.5 4 9.5l1.5 3 6 6 3 1.5 1-3 1.5-3.5ZM13.5 9.5a1.5 1.5 0 1 0 2.1 2.1 1.5 1.5 0 0 0-2.1-2.1Z',
  sparkles: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm6.5 8.5.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2ZM5.5 15l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6.6-1.6Z',
  settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5a8 8 0 0 0-.2-1.7l2-1.5-2-3.5-2.4 1a8 8 0 0 0-3-1.7L14 2h-4l-.4 2.6a8 8 0 0 0-3 1.7l-2.4-1-2 3.5 2 1.5a8 8 0 0 0 0 3.4l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 3 1.7L10 22h4l.4-2.6a8 8 0 0 0 3-1.7l2.4 1 2-3.5-2-1.5c.13-.55.2-1.12.2-1.7Z',
  search: 'M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Zm5.5-2 5 5',
  plus: 'M12 5v14M5 12h14',
  check: 'M4.5 12.5 9 17 19.5 6.5',
  x: 'M6 6l12 12M18 6 6 18',
  'chevron-right': 'm9 5 7 7-7 7',
  'chevron-down': 'm5 9 7 7 7-7',
  'chevron-left': 'm15 5-7 7 7 7',
  'arrow-right': 'M4 12h16m-6-6 6 6-6 6',
  'arrow-up': 'M12 20V4m-6 6 6-6 6 6',
  'arrow-down': 'M12 4v16m6-6-6 6-6-6',
  external: 'M14 4h6v6M20 4 10.5 13.5M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9.5V16m0-7.5v.01',
  alert: 'M12 8.5V13m0 3.5v.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  bookmark: 'M6 3.5h12a.5.5 0 0 1 .5.5v16.5L12 16.5 5.5 20.5V4a.5.5 0 0 1 .5-.5Z',
  heart: 'M12 20.5s-8-5-8-10.2A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 8 2.8c0 5.2-8 10.2-8 10.2Z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5.5l3.5 2',
  chart: 'M4 20h16M7 17V9m5 8V5m5 12v-5',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
  filter: 'M3 5h18l-7 8v6l-4 2v-8L3 5Z',
  menu: 'M4 7h16M4 12h16M4 17h16',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6.5-2 6.5h16S18 14 18 9ZM10 19a2 2 0 0 0 4 0',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.5 3.6-5.5 8-5.5s8 2 8 5.5',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 9c0-3 3.2-4.8 7-4.8s7 1.8 7 4.8M16 4.3a3.5 3.5 0 0 1 0 6.6m2 4.3c2.4.7 4 2.3 4 4.4',
  logout: 'M15 8V6a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2m3-7 3 3-3 3m3-3h-10',
  download: 'M12 4v11m-4.5-4L12 15.5 16.5 11M4 19h16',
  upload: 'M12 16V5m-4.5 4.5L12 5l4.5 4.5M4 19h16',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V7',
  edit: 'M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Zm10-12 3 3',
  copy: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1Zm-4 6H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
  link: 'M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5',
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  'eye-off': 'M4 4l16 16M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.5-1.4M6.5 6.7C3.9 8.4 2 12 2 12s3.5 7 10 7c1.9 0 3.5-.6 4.9-1.4M18 15.5c2.4-1.8 4-3.5 4-3.5s-3.5-7-10-7c-.8 0-1.5.1-2.2.3',
  star: 'm12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.2-5.4-2.9-5.4 2.9 1-6.2L3.2 10l6.1-.9L12 3.5Z',
  lightbulb: 'M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3Z',
  flag: 'M5 21V4m0 1h11l-2 4 2 4H5',
  map: 'm3 7 6-3 6 3 6-3v13l-6 3-6-3-6 3V7Zm6-3v13m6-10v13',
  layers: 'm12 3 9 5-9 5-9-5 9-5Zm9 9-9 5-9-5m18 4-9 5-9-5',
  refresh: 'M20 12a8 8 0 1 1-2.5-5.8M20 4v5h-5',
  send: 'm4 12 16-8-8 16-2-6-6-2Z',
  play: 'm7 4 12 8-12 8V4Z',
  pause: 'M8 4h3v16H8V4Zm5 0h3v16h-3V4Z',
  skip: 'm5 4 10 8-10 8V4Zm12 0v16',
  shield: 'M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6L12 3Z',
  'trending-up': 'M3 17 10 10l4 4 7-7m0 0h-5m5 0v5',
  zap: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  moon: 'M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-14v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10 1.4 1.4m0-12.8-1.4 1.4m-10 10-1.4 1.4',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  sliders: 'M4 8h10m4 0h2M4 16h4m4 0h8M14 5v6M8 13v6',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-2.2-11a2.2 2.2 0 1 1 3 2.1c-.5.2-.8.7-.8 1.2v.7m0 3v.01',
  quote: 'M8 11H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7c0 2-1.5 3.5-3.5 4M19 11h-3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v7c0 2-1.5 3.5-3.5 4',
  note: 'M6 3h9l5 5v13H6V3Zm9 0v5h5M9 13h6M9 17h4',
  flame: 'M12 21c3.9 0 6-2.5 6-5.5 0-4-3.5-5.5-3-9.5-2 1-3 2.5-3.5 4C10 8.5 9 7 9 5c-2 1.5-3 4-3 6.5 0 3.5 2.1 9.5 6 9.5Z',
  crown: 'M4 18h16M4 18 3 7l5 4 4-6 4 6 5-4-1 11',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4Zm0 1H5v2a3 3 0 0 0 3 3m8-5h3v2a3 3 0 0 1-3 3m-4 3v4m-3 2h6',
  seal: 'm12 3 2.2 1.6 2.7-.3 1 2.5 2.4 1.2-.7 2.6.7 2.6-2.4 1.2-1 2.5-2.7-.3L12 20l-2.2-1.6-2.7.3-1-2.5L3.7 15l.7-2.6-.7-2.6 2.4-1.2 1-2.5 2.7.3L12 3Zm-2.5 9 2 2 4-4',
  lens: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5M8.5 11h5m-2.5-2.5v5',
  stack: 'M4 7h16M4 12h16M4 17h16',
  balance: 'M12 4v16M6 8h12M6 8 3 15h6L6 8Zm12 0-3 7h6l-3-7ZM8 20h8',
  roots: 'M12 3v10m0 0c0 3-2 4-4 5m4-5c0 3 2 4 4 5M12 13c-2 1-3 3-3 6m3-6c2 1 3 3 3 6',
  spark: 'm12 4 1.5 5 5 1.5-5 1.5L12 17l-1.5-5-5-1.5 5-1.5L12 4Z',
  pen: 'M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Zm11-13 3 3M4 4h5',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm11-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  palette: 'M12 21a9 9 0 1 1 0-18c5 0 9 3.5 9 8 0 2.5-2 3.5-4 3.5h-1.5a1.75 1.75 0 0 0-1.2 3c.4.5.5 1 .2 1.7-.3.6-1 .8-2.5.8ZM7.5 11.5v.01M10 8v.01M14.5 8v.01',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.2 2.4 3.5 5.6 3.5 9s-1.3 6.6-3.5 9c-2.2-2.4-3.5-5.6-3.5-9S9.8 5.4 12 3Z',
  building: 'M5 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17M15 21V9h4a1 1 0 0 1 1 1v11M3 21h18M8 7h4M8 11h4M8 15h4',
  wallet: 'M4 7a1 1 0 0 1 1-1h13a1 1 0 0 1 1 1v2M4 7v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3M4 7V6a2 2 0 0 1 2-2h9m5 7h-4a2 2 0 0 0 0 4h4a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1Z',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12v4l2.5 2.5M9 2h6',
  brain: 'M9.5 3.5A2.5 2.5 0 0 0 7 6a2.5 2.5 0 0 0-1.5 4.5A2.5 2.5 0 0 0 7 15a2.5 2.5 0 0 0 2.5 2.5 2 2 0 0 0 2 2V4a2 2 0 0 0-2-.5Zm5 0A2.5 2.5 0 0 1 17 6a2.5 2.5 0 0 1 1.5 4.5A2.5 2.5 0 0 1 17 15a2.5 2.5 0 0 1-2.5 2.5 2 2 0 0 1-2 2V4a2 2 0 0 1 2-.5Z',
};

export interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
  title?: string;
}

export function Icon({ name, size = 18, className, strokeWidth = 1.6, title, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}
