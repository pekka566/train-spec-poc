import { describe, it, expect } from "vitest";
import { getTrainTitle } from "./trainUtils";
import type { TrainConfig } from "@/types/train";

describe("getTrainTitle", () => {
  it("formats train with parentheses in name (time + number) as name – direction", () => {
    const train: TrainConfig = {
      number: 1719,
      name: "08:20 (1719)",
      from: "LPÄ",
      to: "TPE",
      scheduledTime: "08:20",
      direction: "Lempäälä → Tampere",
    };
    expect(getTrainTitle(train)).toBe(
      "08:20 (1719) – Lempäälä → Tampere"
    );
  });

  it("formats train without parentheses as name – direction", () => {
    const train: TrainConfig = {
      number: 1719,
      name: "Morning train 8:20",
      from: "LPÄ",
      to: "TPE",
      scheduledTime: "08:20",
      direction: "Lempäälä → Tampere",
    };
    expect(getTrainTitle(train)).toBe(
      "Morning train 8:20 – Lempäälä → Tampere"
    );
  });
});
