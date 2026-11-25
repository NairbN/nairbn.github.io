// Icon glyphs (24x24 stroke paths) and finishes for the services grid. Colors and paths come from the approved
// design (R3-Icons, finish S1: colored squircle). Keyed by guest name; unknown guests fall back to a neutral tile.
export interface SvcIcon { c1: string; c2: string; d: string }

export const SERVICE_ICONS: Record<string, SvcIcon> = {
  gus: { c1: '#22d3ee', c2: '#0e7490', d: 'M3 12h7 M10 12l5-5h5 M10 12l5 5h5 M18 5l2 2-2 2 M18 15l2 2-2 2' },
  skyler: { c1: '#818cf8', c2: '#3730a3', d: 'M4.5 12a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M11.5 12H21 M17.5 12v3 M20.5 12v2' },
  gale: { c1: '#fb923c', c2: '#c2410c', d: 'M4 5a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M4 19a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M16 8a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M6 7v10 M18 10c0 4-4 5-10 7' },
  gretchen: { c1: '#a3e635', c2: '#3f6212', d: 'M7 3v4 M7 15v6 M5 7h4v8H5z M17 4v3 M17 13v5 M15 7h4v6h-4z M12 9v2 M12 17v3 M10 11h4v6h-4z' },
  hank: { c1: '#fbbf24', c2: '#92400e', d: 'M4 17a8 8 0 0 1 16 0 M12 17l4.5-5 M12 9v1.5 M6.5 11.5l1 1 M17.5 11.5l-1 1 M10.5 17a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0' },
  gomez: { c1: '#94a3b8', c2: '#334155', d: 'M4 6h11 M4 10h14 M4 14h7 M4 18h5 M14 16.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M19.2 18.7L21 20.5' },
  todd: { c1: '#f87171', c2: '#991b1b', d: 'M7 7h10v10H7z M10 10h4v4h-4z M10 4v3 M14 4v3 M10 17v3 M14 17v3 M4 10h3 M4 14h3 M17 10h3 M17 14h3' },
  tuco: { c1: '#2dd4bf', c2: '#115e59', d: 'M4 5h16v11H10l-4 3.5V16H4z M8.5 10.5h.01 M12 10.5h.01 M15.5 10.5h.01' },
  francesca: { c1: '#f472b6', c2: '#9d174d', d: 'M3.5 6.5h17v11h-17z M3.5 7.5l8.5 6 8.5-6' },
  flynn: { c1: '#4ade80', c2: '#166534', d: 'M3.5 5h17v14h-17z M7 10l3 2.5L7 15 M12.5 15h4.5' },
  ed: { c1: '#a78bfa', c2: '#5b21b6', d: 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0 M3 12h18 M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21 M12 3C9.5 5.5 8.2 8.5 8.2 12s1.3 6.5 3.8 9' },
  saul: { c1: '#fb7185', c2: '#9f1239', d: 'M4 5h16l-6 7.5V18l-4 2v-7.5z' },
  homeassistant: { c1: '#60a5fa', c2: '#1e40af', d: 'M4 11.5 12 4.5l8 7 M6.5 10v9.5h11V10 M10 19.5V15h4v4.5' },
};
export const CLASSIFIED_ICON: SvcIcon = { c1: '#71717a', c2: '#18181b', d: 'M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3 M12 14.5v2' };
export const FALLBACK_ICON: SvcIcon = { c1: '#a1a1aa', c2: '#3f3f46', d: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z' };
export const CLASSIFIED_FILL = 'repeating-linear-gradient(135deg,#3f3f46 0 7px,#27272a 7px 14px)';

export const THEME_MOON = 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z';
export const THEME_SUN = 'M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8 M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4';

export const TAB_ICONS = {
  home: 'M4 11.5 12 4.5l8 7 M6.5 10v9.5h11V10',
  services: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
  vitals: 'M3 12h4l2-6 4 12 2-6h6',
  hardware: 'M7 7h10v10H7z M10 10h4v4h-4z M10 4v3 M14 4v3 M10 17v3 M14 17v3 M4 10h3 M4 14h3 M17 10h3 M17 14h3',
  more: 'M5 12h.01 M12 12h.01 M19 12h.01',
} as const;

/** Spec-card glyphs and tints (hardware page). */
export const SPEC_ICONS = {
  cpu: { tint: 'linear-gradient(160deg,#60a5fa,#1e40af)', d: 'M7 7h10v10H7z M10 10h4v4h-4z M10 4v3 M14 4v3 M10 17v3 M14 17v3 M4 10h3 M4 14h3 M17 10h3 M17 14h3' },
  gpu: { tint: 'linear-gradient(160deg,#f87171,#991b1b)', d: 'M3 8h18v9H3z M7 12.5a2 2 0 1 0 4 0a2 2 0 1 0-4 0 M14 11h4 M14 14h3 M5 17v2 M19 17v2' },
  mem: { tint: 'linear-gradient(160deg,#5eead4,#0f766e)', d: 'M3 8h18v8H3z M6 8v8 M10 8v8 M14 8v8 M18 8v8 M6 18v2 M18 18v2' },
  disk: { tint: 'linear-gradient(160deg,#a78bfa,#5b21b6)', d: 'M4 7h16v10H4z M7 11h4 M7 14h2 M16 12a1 1 0 1 0 2 0a1 1 0 1 0-2 0' },
  net: { tint: 'linear-gradient(160deg,#22d3ee,#0e7490)', d: 'M5 9h14v8H5z M8 17v3 M12 17v3 M16 17v3 M8 9V6h8v3' },
  os: { tint: 'linear-gradient(160deg,#4ade80,#166534)', d: 'M4 5h16v5H4z M4 14h16v5H4z M7 7.5h.01 M7 16.5h.01' },
} as const;
