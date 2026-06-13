export function themeColors(el: HTMLElement | null) {
  const fallback = {
    bg: "#0e0e10",
    fg: "#e8e6df",
    accent: "#e0a23a",
    soft: "#b9893a",
    muted: "#8a8780",
    rule: "#1f1f22",
  }
  if (!el) return fallback
  const cs = getComputedStyle(el)
  const v = (name: string, f: string) => cs.getPropertyValue(name).trim() || f
  return {
    bg: v("--jsh-bg-2", fallback.bg),
    fg: v("--jsh-fg", fallback.fg),
    accent: v("--jsh-amber", fallback.accent),
    soft: v("--jsh-amber-soft", fallback.soft),
    muted: v("--jsh-muted", fallback.muted),
    rule: v("--jsh-rule", fallback.rule),
  }
}
