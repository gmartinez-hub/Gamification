export interface Point2 {
  x: number;
  y: number;
}

export interface ScanCandidate {
  id: string;
  distance: number;
  range: number;
  primary: boolean;
  completed?: boolean;
}

export function reachableRelicPoint(
  source: Point2,
  anchor: Point2,
  maxDistance = 0.32,
  horizontalLimit = 1,
  verticalLimit = 0.70,
): Point2 {
  const dx = source.x - anchor.x;
  const dy = source.y - anchor.y;
  const distance = Math.hypot(dx, dy);
  const scale = distance > maxDistance ? maxDistance / Math.max(0.0001, distance) : 1;
  return {
    x: Math.max(-horizontalLimit, Math.min(horizontalLimit, anchor.x + dx * scale)),
    y: Math.max(-verticalLimit, Math.min(verticalLimit, anchor.y + dy * scale)),
  };
}

export function selectScanTarget(
  candidates: readonly ScanCandidate[],
  preferredPrimaryId: string | null,
): string | null {
  const available = candidates.filter((candidate) => !candidate.completed);
  if (!available.length) return null;

  const inRange = available
    .filter((candidate) => candidate.distance <= candidate.range)
    .sort((a, b) => a.distance - b.distance || Number(b.primary) - Number(a.primary));
  if (inRange.length) return inRange[0]!.id;

  const preferred = preferredPrimaryId
    ? available.find((candidate) => candidate.id === preferredPrimaryId)
    : null;
  if (preferred) return preferred.id;

  return [...available]
    .sort((a, b) => Number(b.primary) - Number(a.primary) || a.distance - b.distance)[0]!.id;
}
