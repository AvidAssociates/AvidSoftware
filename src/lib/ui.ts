import { Stage } from "./types";

export const DEFAULT_TEAM = ["Brad", "Joe", "Reid", "Matt", "Justice"];
export const ADMIN = "Brad";

export const PIPELINE: { key: Stage; label: string }[] = [
  { key: "sent", label: "Sent" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "placed", label: "Placed" },
];
export const STAGE_COLOR: Record<Stage, string> = {
  sent: "#A39E95",
  interview: "#E5A53B",
  offer: "#8C92F0",
  placed: "#4FBF82",
};
export const BRAND_RED = "#ED1D24";
export const INTERVIEW_TYPES = ["Phone", "Video", "Face-to-Face"];
export const FONT = `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;

export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Fixed hue order, one slot per person (never cycled/regenerated) — validated
// for CVD-safe adjacent contrast against this app's light/dark card surfaces.
// A roster beyond 8 people falls back to a neutral gray for the extra slots.
export const PRODUCTION_COLORS = {
  dark: ["#3987e5", "#199e70", "#c98500", "#008300", "#9085e9", "#e66767", "#d55181", "#d95926"],
  light: ["#2a78d6", "#1baf7a", "#eda100", "#008300", "#4a3aa7", "#e34948", "#e87ba4", "#eb6834"],
};
export function seriesColor(index: number, isDark: boolean) {
  const ramp = isDark ? PRODUCTION_COLORS.dark : PRODUCTION_COLORS.light;
  return ramp[index] ?? (isDark ? "#6E6A62" : "#94A3B8");
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
export function fmtDate(iso: string) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y.slice(2)}`;
}
export function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}
export function moneyCompact(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
// "Nice number" axis step so ticks land on round values (0/1,000/2,000…)
// instead of whatever max/ticks happens to divide into.
export function niceAxisMax(maxValue: number, ticks = 4) {
  if (maxValue <= 0) return { max: ticks * 10, step: 10 };
  const roughStep = maxValue / ticks;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const norm = roughStep / magnitude;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * magnitude;
  return { max: step * ticks, step };
}

export type Theme = ReturnType<typeof getTheme>;

export function getTheme(isDark: boolean) {
  return isDark
    ? {
        bg: "#191918",
        surface: "#212120",
        surfaceAlt: "#262625",
        border: "#34332F",
        ink: "#ECEAE5",
        muted: "#9C978D",
        mutedSoft: "#6E6A62",
        accent: "#8C92F0",
        accentSoft: "rgba(140,146,240,0.14)",
        accentText: "#AFB3F5",
        danger: "#E8765F",
        overlay: "rgba(0,0,0,0.7)",
        trackBg: "#3A3934",
      }
    : {
        bg: "#F8FAFC",
        surface: "#FFFFFF",
        surfaceAlt: "#FAFBFC",
        border: "#E2E8F0",
        ink: "#0F172A",
        muted: "#64748B",
        mutedSoft: "#94A3B8",
        accent: "#4F46E5",
        accentSoft: "#EEF2FF",
        accentText: "#4F46E5",
        danger: "#E11D44",
        overlay: "rgba(15,23,42,0.45)",
        trackBg: "#E2E8F0",
      };
}

export function makeStyles(t: Theme) {
  return {
    _t: t,
    page: { minHeight: "100vh", background: t.bg, fontFamily: FONT, color: t.ink, paddingBottom: 60 },
    header: {
      display: "grid",
      gridTemplateColumns: "1fr auto 1fr",
      alignItems: "center",
      padding: "14px 24px",
      borderBottom: `1px solid ${t.border}`,
      background: t.surface,
    },
    headerLeft: { display: "flex", alignItems: "center", gap: 9, justifySelf: "start" as const },
    headerRight: { display: "flex", alignItems: "center", gap: 6, justifySelf: "end" as const },
    monthSwitcher: { display: "flex", alignItems: "center", gap: 4, justifySelf: "center" as const },
    monthLabel: { fontSize: 13.5, fontWeight: 700, color: t.ink, minWidth: 112, textAlign: "center" as const },

    hero: { padding: "36px 24px 28px", borderBottom: `1px solid ${t.border}` },
    heroEyebrow: { fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: t.mutedSoft, marginBottom: 8 },
    heroTitle: { fontSize: 34, fontWeight: 800, letterSpacing: -1, color: t.ink, margin: "0 0 24px" },
    // Heading on the left, stats truly centered on the row (not just
    // centered in the leftover space) via a mirrored 1fr/auto/1fr grid.
    heroInlineRow: { display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" as const, columnGap: 24 },
    heroInlineTitle: { fontSize: 34, fontWeight: 800, letterSpacing: -1, color: t.ink, margin: 0 },
    heroStatsRow: { display: "flex", gap: 0, flexWrap: "wrap" as const },
    heroStat: { paddingRight: 36, marginRight: 36, borderRight: `1px solid ${t.border}` },
    heroStatValue: {
      fontSize: 42,
      fontWeight: 800,
      letterSpacing: -1.5,
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums" as const,
    },
    heroStatLabel: { fontSize: 12, color: t.muted, marginTop: 8, fontWeight: 500 },

    toolbar: { display: "flex", gap: 8, padding: "20px 24px 16px", flexWrap: "wrap" as const, alignItems: "center" },
    segWrap: {
      display: "flex",
      background: t.surfaceAlt,
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      padding: 3,
      gap: 3,
    },
    segBtn: {
      padding: "6px 14px",
      border: "none",
      borderRadius: 7,
      background: "transparent",
      color: t.muted,
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
      fontFamily: FONT,
    },
    segBtnActive: {
      padding: "6px 14px",
      border: "none",
      borderRadius: 7,
      background: t.surface,
      color: t.ink,
      fontSize: 13,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: FONT,
      boxShadow: `0 1px 2px rgba(0,0,0,0.2)`,
    },
    searchWrap: {
      flex: "1 1 220px",
      display: "flex",
      alignItems: "center",
      gap: 7,
      padding: "8px 12px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      background: t.surface,
    },
    search: {
      border: "none",
      outline: "none",
      fontSize: 13.5,
      fontFamily: FONT,
      flex: 1,
      background: "transparent",
      color: t.ink,
    },
    selectPillWrap: { position: "relative" as const, display: "flex", alignItems: "center" },
    selectPill: {
      appearance: "none" as const,
      padding: "8px 28px 8px 12px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      fontSize: 13,
      fontFamily: FONT,
      background: t.surface,
      color: t.ink,
      cursor: "pointer",
    },
    selectPillChevron: { position: "absolute" as const, right: 10, pointerEvents: "none" as const },
    primaryBtn: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "8px 14px",
      border: "none",
      borderRadius: 9,
      background: BRAND_RED,
      color: "#fff",
      fontSize: 13.5,
      fontWeight: 600,
      cursor: "pointer",
    },
    ghostBtn: {
      padding: "9px 16px",
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      background: t.surface,
      fontSize: 13.5,
      fontWeight: 600,
      color: t.ink,
      cursor: "pointer",
    },
    iconGhost: {
      border: "none",
      background: "none",
      color: t.muted,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      padding: 6,
      borderRadius: 6,
    },

    tableWrap: {
      margin: "0 24px",
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      background: t.surface,
      overflow: "hidden",
    },
    cardHeaderRow: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "11px 22px",
      fontSize: 11,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      color: t.mutedSoft,
      borderBottom: `1px solid ${t.border}`,
      fontWeight: 700,
      background: t.surfaceAlt,
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "26px 22px",
      borderBottom: `1px solid ${t.border}`,
    },
    billingRow: {
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "18px 22px",
      borderBottom: `1px solid ${t.border}`,
    },
    // Send-Outs row: two identical halves flanking a center Status track.
    // Each half is its own 3-equal-column grid (Date/Candidate/Company on
    // the left, Role/Team/Actions on the right), so the columns within each
    // half are always equally spaced by construction, both halves mirror
    // each other, and Status sits on the row's true center under the month
    // picker. The center track's 220px minimum guarantees Role can never
    // crowd the Status text no matter how short the status label is.
    soGrid: { display: "grid", gridTemplateColumns: "1fr minmax(220px, auto) 1fr", alignItems: "center" as const },
    soGroup: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", alignItems: "center" as const, gap: 20, minWidth: 0 },
    soCol: { minWidth: 0 },
    // Right-half cells anchor content to their right edge -- the true
    // mirror of the left half's left-anchored cells. That puts Team the
    // same distance from Actions as Candidate is from Date, and makes
    // Role's gap to Status mirror Company's, so the row reads balanced
    // outward from the centered Status.
    soColRight: { minWidth: 0, textAlign: "right" as const },
    soStatusCol: { minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" as const },
    soActionsCol: { minWidth: 0, display: "flex", justifyContent: "flex-end" as const },
    colActions: { width: 56, flexShrink: 0, display: "flex", justifyContent: "flex-end" },
    colRecruiter: { width: 140, flexShrink: 0 },
    colClient: { flex: 1, minWidth: 160 },
    colAmount: { width: 120, flexShrink: 0, textAlign: "right" as const },
    colDate: { width: 90, flexShrink: 0 },
    cardPrimary: { fontSize: 14.5, fontWeight: 600, color: t.ink },
    cardSub: { fontSize: 12.5, color: t.muted, marginTop: 3, fontWeight: 500 },
    amountText: { fontSize: 15, fontWeight: 700, color: t.ink, fontVariantNumeric: "tabular-nums" as const },

    empty: { padding: "48px 20px", textAlign: "center" as const, color: t.mutedSoft, fontSize: 14 },

    modalOverlay: {
      position: "fixed" as const,
      inset: 0,
      background: t.overlay,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      zIndex: 50,
    },
    modal: {
      width: "100%",
      maxWidth: 520,
      maxHeight: "88vh",
      overflowY: "auto" as const,
      background: t.surface,
      borderRadius: 14,
      fontFamily: FONT,
      border: `1px solid ${t.border}`,
    },
    modalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 22px",
      borderBottom: `1px solid ${t.border}`,
    },
    modalTitle: { fontSize: 15.5, fontWeight: 700, color: t.ink },
    formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, padding: 22 },
    fieldLabel: {
      fontSize: 11.5,
      fontWeight: 700,
      color: t.muted,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
    },
    input: {
      padding: "9px 11px",
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      fontSize: 13.5,
      fontFamily: FONT,
      outline: "none",
      color: t.ink,
      background: t.surfaceAlt,
    },
    chipRow: { display: "flex", flexWrap: "wrap" as const, gap: 7 },
    chip: {
      padding: "6px 13px",
      borderRadius: 20,
      border: "1.5px solid",
      fontSize: 12.5,
      fontWeight: 600,
      cursor: "pointer",
      background: "transparent",
    },
    modalFooter: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      padding: "16px 22px",
      borderTop: `1px solid ${t.border}`,
    },
    // user manager
    rosterRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 0",
      borderBottom: `1px solid ${t.border}`,
    },
    rosterName: { flex: 1, fontSize: 14, fontWeight: 600, color: t.ink },

    // report tab
    reportPad: { padding: "26px 24px" },
    reportSection: { marginBottom: 40 },
    reportSectionHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
    reportTitleGroup: { display: "flex", alignItems: "center", gap: 6 },
    chartTitle: { fontSize: 14.5, fontWeight: 700, color: t.ink, margin: 0 },
    chartSubtitle: { fontSize: 12.5, color: t.muted, marginTop: 3, marginBottom: 18, fontWeight: 500 },
    legendRow: { display: "flex", flexWrap: "wrap" as const, justifyContent: "center" as const, gap: "8px 18px", marginTop: 14 },
    legendItem: { display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: t.muted, fontWeight: 600 },
    legendSwatch: { width: 14, height: 3, borderRadius: 2, flexShrink: 0 },
    chartTooltip: {
      position: "absolute" as const,
      pointerEvents: "none" as const,
      background: t.surfaceAlt,
      border: `1px solid ${t.border}`,
      borderRadius: 9,
      padding: "9px 12px",
      fontSize: 12.5,
      boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
      zIndex: 5,
      minWidth: 140,
    },
    tooltipMonth: { fontSize: 11.5, fontWeight: 700, color: t.mutedSoft, textTransform: "uppercase" as const, letterSpacing: 0.4, marginBottom: 6 },
    tooltipRow: { display: "flex", alignItems: "center", gap: 7, padding: "2px 0" },
    tooltipName: { flex: 1, color: t.muted, fontWeight: 500 },
    tooltipValue: { color: t.ink, fontWeight: 700, fontVariantNumeric: "tabular-nums" as const },
    reportTableWrap: { border: `1px solid ${t.border}`, borderRadius: 10, overflow: "hidden" },
    reportTableRow: { display: "grid", alignItems: "center", padding: "9px 14px", fontSize: 12.5 },
    reportTableHeadRow: {
      display: "grid",
      alignItems: "center",
      padding: "9px 14px",
      fontSize: 11,
      textTransform: "uppercase" as const,
      letterSpacing: 0.4,
      fontWeight: 700,
      color: t.mutedSoft,
      background: t.surfaceAlt,
      borderBottom: `1px solid ${t.border}`,
    },
    reportTableCell: { fontVariantNumeric: "tabular-nums" as const, color: t.ink, fontWeight: 500 },
    reportTableTotalRow: { fontWeight: 800, borderTop: `1px solid ${t.border}`, background: t.surfaceAlt },

    // leaderboard tab
    leaderboardRow: { display: "flex", alignItems: "center", gap: 14, padding: "10px 0" },
    leaderboardRank: {
      width: 26,
      height: 26,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 800,
      flexShrink: 0,
      background: t.surfaceAlt,
      color: t.muted,
    },
    leaderboardName: { width: 96, flexShrink: 0, fontSize: 13.5, fontWeight: 700, color: t.ink },
    leaderboardBarTrack: { flex: 1, height: 20, borderRadius: 20, background: t.surfaceAlt, overflow: "hidden" },
    leaderboardBarFill: { height: "100%", borderRadius: 20, transition: "width 0.4s cubic-bezier(0.16,1,0.3,1)" },
    leaderboardCount: { width: 70, textAlign: "right" as const, flexShrink: 0, fontSize: 13.5, fontWeight: 700, color: t.ink, fontVariantNumeric: "tabular-nums" as const },
  };
}
