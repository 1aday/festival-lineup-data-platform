export type UIStateVariant =
  | "default"
  | "hover"
  | "active"
  | "focus"
  | "disabled"
  | "selected"
  | "destructive"
  | "warning"
  | "success";

export const interactionStateClasses: Record<UIStateVariant, string> = {
  default:
    "bg-card text-card-foreground border border-border/70",
  hover:
    "bg-primary/10 border-primary/45",
  active:
    "bg-primary/20 border-primary/70 text-primary",
  focus:
    "ring-2 ring-offset-2 ring-primary/60",
  disabled:
    "opacity-50 pointer-events-none cursor-not-allowed",
  selected:
    "bg-primary text-primary-foreground border-primary shadow-md",
  destructive:
    "bg-destructive/12 border-destructive/60 text-destructive",
  warning:
    "bg-yellow-500/12 border-yellow-300 text-yellow-900",
  success:
    "bg-emerald-500/12 border-emerald-300 text-emerald-900",
};
