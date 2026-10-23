export function fmtNum(n: number): string {
  if (n < 10_000) return Math.floor(n).toLocaleString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 100_000 ? 1 : 0)}k`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(n < 100_000_000 ? 1 : 0)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}

/** Short stack labels for item slots: 500, 1.2k, 3M */
export function fmtQty(n: number): string {
  if (n < 1000) return String(n);
  return fmtNum(n);
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function fmtSeconds(ms: number): string {
  const s = ms / 1000;
  return `${s % 1 === 0 ? s : s.toFixed(1)}s`;
}
