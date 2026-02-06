import type { TrainConfig } from "@/types/train";

/**
 * Format train line for display: time/number and direction on one line.
 * e.g. "08:20 (1719) – Lempäälä → Tampere" or "Morning train 8:20 – Lempäälä → Tampere"
 */
export function getTrainTitle(train: TrainConfig): string {
  return train.name.includes("(")
    ? `${train.name} – ${train.direction}`
    : `${train.name} ${train.scheduledTime} – ${train.direction}`;
}
