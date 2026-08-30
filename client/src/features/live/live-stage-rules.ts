export const LIVE_STAGE_CAPACITIES = [1, 2, 3, 5, 8, 10, 12, 15, 20, 30, 50, 100] as const;

export type LiveStageCapacity = (typeof LIVE_STAGE_CAPACITIES)[number];
