type HapticPattern = "selection" | "success" | "warning";

const patterns: Record<HapticPattern, number[]> = {
  selection: [10],
  success: [16, 24, 16],
  warning: [14, 28, 14],
};

export function triggerHaptic(pattern: HapticPattern) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
    return;
  }

  navigator.vibrate(patterns[pattern]);
}
