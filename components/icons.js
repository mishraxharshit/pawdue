// Minimal line-icon set used across the dashboard shell. Deliberately not an
// icon-library import - a handful of 24x24 stroke SVGs is enough for this
// app and keeps the bundle dependency-free.
const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const IconHome = (p) => (
  <svg {...base} {...p}><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V19a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9" /></svg>
);

export const IconPaw = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="16.2" r="4.2" /><circle cx="5.3" cy="9.8" r="2.1" /><circle cx="12" cy="6.4" r="2.3" /><circle cx="18.7" cy="9.8" r="2.1" /></svg>
);

export const IconCalendar = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M8 3v4M16 3v4M3.5 10h17" /></svg>
);

export const IconCard = (p) => (
  <svg {...base} {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="2" /><path d="M2.5 10h19" /></svg>
);

export const IconInbox = (p) => (
  <svg {...base} {...p}><path d="M3 12h4.5l1.5 3h6l1.5-3H21" /><rect x="3" y="6" width="18" height="14" rx="2" /></svg>
);

export const IconHelp = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3a2.5 2.5 0 0 1 4.7 1.2c0 1.6-2.2 1.9-2.2 3.5" /><circle cx="12" cy="17" r=".2" fill="currentColor" /></svg>
);

export const IconLogout = (p) => (
  <svg {...base} {...p}><path d="M9 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);

export const IconPlus = (p) => (
  <svg {...base} {...p}><path d="M12 5v14M5 12h14" /></svg>
);

export const IconBell = (p) => (
  <svg {...base} {...p}><path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
);

export const IconSearch = (p) => (
  <svg {...base} {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
);

export const IconPencil = (p) => (
  <svg {...base} {...p}><path d="M4 20.5 4.6 17 16 5.6a2 2 0 0 1 2.8 0l1.6 1.6a2 2 0 0 1 0 2.8L9 21.4 4 20.5Z" /></svg>
);

export const IconArchive = (p) => (
  <svg {...base} {...p}><rect x="3" y="4" width="18" height="4.5" rx="1" /><path d="M4.5 8.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V8.5" /><path d="M10 13h4" /></svg>
);

export const IconMessage = (p) => (
  <svg {...base} {...p}><path d="M4 5.5h16v11H8.5L4 20V5.5Z" /></svg>
);

export const IconChevronDown = (p) => (
  <svg {...base} {...p}><path d="m6 9 6 6 6-6" /></svg>
);

export const IconX = (p) => (
  <svg {...base} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>
);

export const IconRestore = (p) => (
  <svg {...base} {...p}><path d="M3.5 9.5A8.5 8.5 0 1 1 5 15" /><path d="M3.5 4v5.5H9" /></svg>
);

export const IconTrash = (p) => (
  <svg {...base} {...p}><path d="M4 7h16" /><path d="M9 7V4.8A1.8 1.8 0 0 1 10.8 3h2.4A1.8 1.8 0 0 1 15 4.8V7" /><path d="M6.5 7 7.3 20a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7" /></svg>
);

export const IconCheck = (p) => (
  <svg {...base} {...p}><path d="m5 12.5 5 5L20 7" /></svg>
);

export const IconClock = (p) => (
  <svg {...base} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3.2 1.9" /></svg>
);

export const IconLink = (p) => (
  <svg {...base} {...p}><path d="M9.5 14.5 14.5 9.5" /><path d="M11 6.5 12.5 5a3.5 3.5 0 0 1 5 5L16 11.5" /><path d="M13 17.5 11.5 19a3.5 3.5 0 0 1-5-5L8 12.5" /></svg>
);

export const IconEnvelope = (p) => (
  <svg {...base} {...p}><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7 7.5 6 7.5-6" /></svg>
);

export const IconChart = (p) => (
  <svg {...base} {...p}><path d="M4 20V10M11 20V4M18 20v-7" /><path d="M3 20h18" /></svg>
);
