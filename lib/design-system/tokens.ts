export const colorTokens = {
  // Core UI
  background: "var(--background)",
  foreground: "var(--foreground)",
  card: "var(--card)",
  cardForeground: "var(--card-foreground)",
  popover: "var(--popover)",
  popoverForeground: "var(--popover-foreground)",

  // Brand / hierarchy
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  secondary: "var(--secondary)",
  secondaryForeground: "var(--secondary-foreground)",
  accent: "var(--accent)",
  accentForeground: "var(--accent-foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  destructive: "var(--destructive)",
  destructiveForeground: "var(--destructive-foreground)",

  // Surfaces / structure
  border: "var(--border)",
  input: "var(--input)",
  ring: "var(--ring)",

  // Charts / accents
  chart: {
    1: "var(--chart-1)",
    2: "var(--chart-2)",
    3: "var(--chart-3)",
    4: "var(--chart-4)",
    5: "var(--chart-5)",
  },
} as const;

export const spacingScale = {
  page: "4.5rem",
  section: "2.5rem",
  component: "1.5rem",
  control: "0.75rem",
  micro: "0.5rem",
} as const;

export const borderRadius = {
  panel: "var(--radius)",
  card: "calc(var(--radius) + 6px)",
  chip: "999px",
  control: "0.75rem",
} as const;

export const depthScale = {
  surface: "0 0 0 1px color-mix(in oklab, var(--primary) 10%, transparent 90%), 0 18px 56px -26px color-mix(in oklab, var(--primary) 24%, transparent 76%)",
  card: "0 22px 48px -26px color-mix(in oklab, var(--primary) 25%, transparent 75%)",
  raised:
    "0 1px 2px -1px color-mix(in oklab, var(--foreground) 16%, transparent 84%), 0 12px 24px -16px color-mix(in oklab, var(--primary) 22%, transparent 78%)",
  focusRing: "0 0 0 3px color-mix(in oklab, var(--primary) 28%, transparent 72%)",
} as const;

export const glassScale = {
  glass: "color-mix(in oklab, var(--card) 86%, transparent 14%)",
  glassBorder: "color-mix(in oklab, var(--primary) 28%, var(--border) 72%)",
  glassBlur: "saturate(150%) blur(18px)",
  softLight:
    "linear-gradient(155deg, color-mix(in oklab, var(--primary) 18%, transparent 82%), color-mix(in oklab, var(--secondary) 16%, transparent 84%))",
} as const;

export const typography = {
  display: "clamp(2rem, 5vw, 4rem)",
  heading: {
    lg: "clamp(1.75rem, 3.5vw, 2.75rem)",
    md: "2rem",
    sm: "1.5rem",
  },
  body: {
    md: "0.95rem",
    base: "0.95rem",
    lg: "1rem",
    label: "0.75rem",
  },
  table: {
    head: "0.8125rem",
    cell: "0.9rem",
  },
} as const;

export const motionScale = {
  swift: 0.24,
  standard: 0.45,
  cinematic: 0.68,
  easing: [0.2, 0.85, 0.32, 1] as const,
  easingSpring: [0.22, 1.06, 0.36, 1] as const,
  easingSoft: [0.16, 1, 0.3, 1] as const,
} as const;

export type MotionScale = typeof motionScale;
export type ColorTokenKey = keyof typeof colorTokens;
