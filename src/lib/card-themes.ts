// Visual skins for the card face, ported from the "Lovelace card themes"
// Claude Design project (six mini design-systems: Industry, Nocturne,
// Broadsheet, Classical, Organic, Modernist). Each entry is a small token
// set — palette, radius, font — applied as an override of the same standard
// HA CSS custom properties every component already themes itself off of
// (see orbit-remote-card.ts's _themeStyles), so adding a new theme here is
// the only change needed to make it selectable; no component file changes.
export type CardThemeId =
  | "default"
  | "industry"
  | "nocturne"
  | "broadsheet"
  | "classical"
  | "organic"
  | "modernist";

export interface CardTheme {
  id: Exclude<CardThemeId, "default">;
  name: string;
  bg: string;
  surface: string;
  text: string;
  accent: string;
  divider: string;
  // Card-level radius (ha-card's own shell, trackpad, D-pad, volume
  // slider — the mockups' larger ".card"/".dialog" surfaces).
  radius: string;
  // Radius for individual icon-button tiles (the mockups' ".btn"/".tile"
  // controls) — distinct from `radius` wherever a theme's source CSS
  // gives buttons their own override (Industry's blueprint square-off,
  // Organic's pill), otherwise identical to `radius`.
  controlRadius: string;
  font: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "industry",
    name: "Industry",
    bg: "#f2f2f3",
    surface: "#e9e9ea",
    text: "#1d1f20",
    accent: "#5980a6",
    divider: "color-mix(in srgb, #1d1f20 16%, transparent)",
    // Blueprint override (`.card, .btn, .input, .tag, .seg, .dialog {
    // border-radius: 0; }`) zeroes every corner, not the plain
    // --radius-md (4px) token — the whole system reads as a hairline
    // wireframe.
    radius: "0px",
    controlRadius: "0px",
    font: '"Barlow", system-ui, sans-serif',
  },
  {
    id: "nocturne",
    name: "Nocturne",
    bg: "#161826",
    surface: "#232532",
    text: "#e9e9ed",
    accent: "#9184d9",
    divider: "color-mix(in srgb, #e9e9ed 16%, transparent)",
    radius: "8px",
    controlRadius: "8px",
    font: '"Inter", system-ui, sans-serif',
  },
  {
    id: "broadsheet",
    name: "Broadsheet",
    bg: "#f3f2f2",
    surface: "#eae9e9",
    text: "#201e1d",
    accent: "#0088b0",
    divider: "color-mix(in srgb, #201e1d 16%, transparent)",
    radius: "2px",
    controlRadius: "2px",
    font: '"Source Serif 4", system-ui, sans-serif',
  },
  {
    id: "classical",
    name: "Classical",
    bg: "#f3f2f2",
    surface: "#eae9e9",
    text: "#201f1d",
    accent: "#b68235",
    divider: "color-mix(in srgb, #201f1d 16%, transparent)",
    radius: "4px",
    controlRadius: "4px",
    font: '"Lora", system-ui, sans-serif',
  },
  {
    id: "organic",
    name: "Organic",
    bg: "#f5ead8",
    surface: "#ebddc5",
    text: "#201e1d",
    accent: "#c67139",
    divider: "color-mix(in srgb, #201e1d 16%, transparent)",
    // Rounded-frame override: cards/dialogs go to calc(--radius-lg *
    // 1.15) = calc(28px * 1.15) = 32.2px, and buttons/inputs go fully
    // pill-shaped (999px) — not the plain --radius-md (16px) token.
    radius: "32px",
    controlRadius: "999px",
    font: '"Figtree", system-ui, sans-serif',
  },
  {
    id: "modernist",
    name: "Modernist",
    bg: "#f3f2f2",
    surface: "#eae9e9",
    text: "#201e1d",
    accent: "#ec3013",
    divider: "color-mix(in srgb, #201e1d 40%, transparent)",
    radius: "0px",
    controlRadius: "0px",
    font: '"Archivo", system-ui, sans-serif',
  },
];

const CARD_THEME_IDS = new Set<CardThemeId>(["default", ...CARD_THEMES.map((t) => t.id)]);

export function isCardThemeId(value: unknown): value is CardThemeId {
  return typeof value === "string" && CARD_THEME_IDS.has(value as CardThemeId);
}

// undefined/"default" means "no override — use the dashboard's own HA theme".
export function getCardTheme(id: CardThemeId | undefined): CardTheme | undefined {
  return CARD_THEMES.find((t) => t.id === id);
}
