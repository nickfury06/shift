// Lightweight haptic feedback for mobile (Vibration API).
// Falls back to a no-op on unsupported platforms (desktop, iOS Safari without gesture).
// All durations are in ms.

type HapticKind = "light" | "medium" | "success" | "warning" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 16,
  success: [12, 40, 18],
  warning: [20, 60, 20],
  error: [30, 80, 30, 80, 30],
};

export function haptic(kind: HapticKind = "light") {
  if (typeof window === "undefined") return;
  const nav = window.navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try {
    nav.vibrate(PATTERNS[kind]);
  } catch {
    // ignore
  }
}
