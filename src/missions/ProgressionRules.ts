export const FIRST_VISIT_CORRIDOR_SECONDS = 30;
export const RETURN_CORRIDOR_SECONDS = 6.5;

export interface GateTravelPlan {
  allowed: boolean;
  direction: "forward" | "back" | "same";
  duration: number;
}

export function planGateTravel(
  currentWorldStage: number,
  targetWorldStage: number,
  highestUnlockedStage: number,
): GateTravelPlan {
  const direction =
    targetWorldStage > currentWorldStage
      ? "forward"
      : targetWorldStage < currentWorldStage
        ? "back"
        : "same";
  return {
    allowed: direction !== "same" && targetWorldStage >= 0 && targetWorldStage <= highestUnlockedStage,
    direction,
    duration: direction === "forward" ? FIRST_VISIT_CORRIDOR_SECONDS : RETURN_CORRIDOR_SECONDS,
  };
}

export function evolvedShipStageForGems(gems: number, maximumShipStage = 2): number {
  return Math.max(0, Math.min(maximumShipStage, Math.trunc(gems || 0)));
}
