import type { ReactNode } from "react";

const shapes = {
  mark: <><path d="M4 18V9h4v9M10 18V5h4v13M16 18v-6h4v6M3 19h18" /></>,
  home: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 10h18M10 10v11" /></>,
  roadmap: <><path d="M4 6h16M4 12h16M4 18h16" /><rect x="6" y="4" width="7" height="4" rx="1.2" fill="currentColor" stroke="none" /><rect x="11" y="10" width="7" height="4" rx="1.2" fill="currentColor" stroke="none" /><rect x="7" y="16" width="6" height="4" rx="1.2" fill="currentColor" stroke="none" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  check: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 2.5 2.5L16 9" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4m10-4v4M3 10h18m-13 5h3m3 0h2" /></>,
  sparkles: <><path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM19 3v4m-2-2h4" /></>,
  review: <><path d="M3 11a9 9 0 1 1 2.5 7M3 6v5h5m4-4v5l3 2" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 4 4" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  down: <path d="m6 9 6 6 6-6" />,
  left: <path d="m14 6-6 6 6 6" />,
  right: <path d="m10 6 6 6-6 6" />,
  arrow: <path d="M4 12h15m-6-6 6 6-6 6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  alert: <><path d="M12 8v5m0 3h.01" /><circle cx="12" cy="12" r="9" /></>,
  decision: <><path d="M12 4v16m-5 0h10M4 8h16M6 8l-3 6h6L6 8Zm12 0-3 6h6l-3-6Z" /></>,
  flag: <path d="M5 21V4c5-3 9 3 14 0v10c-5 3-9-3-14 0" />,
  diamond: <path d="m12 3 9 9-9 9-9-9 9-9Z" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m9.5 3-.7 2.5-2.4 1.4-2.6-.6-1.4 2.5L4.2 11v2l-1.8 2.2 1.4 2.5 2.6-.6 2.4 1.4.7 2.5h5l.7-2.5 2.4-1.4 2.6.6 1.4-2.5-1.8-2.2v-2l1.8-2.2-1.4-2.5-2.6.6-2.4-1.4-.7-2.5Z" /></>,
  logout: <><path d="M10 4H5v16h5m3-12 4 4-4 4m-4-4h11" /></>,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  document: <><path d="M6 3h8l4 4v14H6Zm8 0v5h4M9 12h6m-6 4h6" /></>
} satisfies Record<string, ReactNode>;

export type WorkspaceIconName = keyof typeof shapes;

export function WorkspaceIcon({ name, className = "h-[18px] w-[18px]" }: { name: WorkspaceIconName; className?: string }) {
  return <svg aria-hidden="true" className={`shrink-0 ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">{shapes[name]}</svg>;
}
