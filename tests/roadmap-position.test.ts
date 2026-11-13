import { describe, expect, it } from "vitest";
import { buildRoadmapMonths, getRoadmapPosition } from "@/lib/services/roadmap-service";

describe("roadmap timeline", () => {
  const months = buildRoadmapMonths(new Date("2026-01-01"), 3);

  it("aligns month boundaries with the calendar columns", () => {
    const result = getRoadmapPosition({
      months,
      startDate: new Date("2026-02-01"),
      targetDate: new Date("2026-03-01")
    });
    expect(result?.left).toBeCloseTo(100 / 3);
    expect(result?.width).toBeCloseTo(100 / 3);
  });

  it("clips intervals at the displayed boundaries and shows single dates as points", () => {
    expect(getRoadmapPosition({ months, startDate: new Date("2025-12-12"), targetDate: new Date("2026-04-11") })).toEqual({ left: 0, width: 100 });
    expect(getRoadmapPosition({ months, targetDate: new Date("2026-01-01") })).toEqual({ left: 0, width: 0 });
  });

  it("omits missing, invalid and out-of-range intervals", () => {
    expect(getRoadmapPosition({ months })).toBeNull();
    expect(getRoadmapPosition({ months, startDate: new Date("2026-03-01"), targetDate: new Date("2026-02-01") })).toBeNull();
    expect(getRoadmapPosition({ months, targetDate: new Date("2026-04-01") })).toBeNull();
  });
});
