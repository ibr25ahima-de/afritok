export const LIVE_STAGE_CAPACITY_PRESETS = [1, 2, 3, 5, 8, 10, 12, 15, 20, 30, 50, 100] as const;

export const LIVE_STAGE_MIN_CAPACITY = 1;
export const LIVE_STAGE_MAX_CAPACITY = 100;

export function normalizeStageCapacity(value: number): number {
  if (!Number.isFinite(value)) return LIVE_STAGE_MIN_CAPACITY;
  return Math.max(LIVE_STAGE_MIN_CAPACITY, Math.min(LIVE_STAGE_MAX_CAPACITY, Math.floor(value)));
}

export function canSetStageCapacity(value: number, currentStageCount: number): boolean {
  const capacity = normalizeStageCapacity(value);
  return capacity >= Math.max(0, currentStageCount);
}

export function isStageRole(role: string): boolean {
  return role === 'guest' || role === 'admin';
}
