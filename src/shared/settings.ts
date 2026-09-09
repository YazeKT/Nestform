import type { Settings } from "./types";
export const defaults: Settings = {
  units: "mm",
  scale: 72,
  spacing: 0,
  curveTolerance: 0.72,
  rotations: 4,
  threads: 4,
  populationSize: 10,
  mutationRate: 10,
  placementType: "box",
  mergeLines: true,
  timeRatio: 0.5,
  simplify: false,
  endpointTolerance: 0.36,
  dxfImportScale: 1,
  dxfExportScale: 72,
  conversionServer: "https://convert.deepnest.io",
  legacyExportPadding: false,
  runDurationSeconds: 300,
  theme: "dark",
  accent: "cyan",
  canvasGrid: true,
  gridStrength: 5,
  outlineStrength: 6,
  uiDensity: "balanced",
  thumbnailSize: "medium",
  motion: "system",
  autoGapMinMm: 3,
  autoGapMaxMm: 3,
  onboardingSeen: false,
};
export function validatedSettings(
  current: Settings,
  patch: Partial<Settings>,
): Settings {
  const result = { ...current };
  const ranges: Record<string, [number, number]> = {
    scale: [1, 10000],
    spacing: [0, 72000],
    curveTolerance: [0.0001, 72],
    rotations: [1, 360],
    threads: [1, 8],
    populationSize: [3, 100],
    mutationRate: [1, 100],
    timeRatio: [0, 1],
    endpointTolerance: [0.0001, 72],
    dxfImportScale: [0.00001, 10000],
    dxfExportScale: [0.00001, 10000],
    runDurationSeconds: [1, 86400],
    gridStrength: [1, 10],
    outlineStrength: [1, 10],
    autoGapMinMm: [0, 1000],
    autoGapMaxMm: [0, 1000],
  };
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in defaults)) throw Error("Unknown setting");
    if (key in ranges) {
      const [min, max] = ranges[key];
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < min ||
        value > max
      )
        throw Error(`Invalid ${key}`);
      if (
        [
          "scale",
          "rotations",
          "threads",
          "populationSize",
          "mutationRate",
          "runDurationSeconds",
        ].includes(key) &&
        !Number.isInteger(value)
      )
        throw Error(`${key} must be a whole number`);
    } else if (
      [
        "mergeLines",
        "simplify",
        "legacyExportPadding",
        "canvasGrid",
        "onboardingSeen",
      ].includes(key)
    ) {
      if (typeof value !== "boolean") throw Error("Expected on/off setting");
    } else if (key === "units" && !["inch", "mm"].includes(String(value)))
      throw Error("Invalid units");
    else if (
      key === "placementType" &&
      !["box", "gravity", "convexhull"].includes(String(value))
    )
      throw Error("Invalid placement type");
    else if (
      key === "theme" &&
      !["dark", "oled", "light"].includes(String(value))
    )
      throw Error("Invalid theme");
    else if (
      key === "accent" &&
      !["cyan", "blue", "violet", "orange", "lime", "rose"].includes(
        String(value),
      )
    )
      throw Error("Invalid accent");
    else if (
      key === "uiDensity" &&
      !["comfortable", "balanced", "compact"].includes(String(value))
    )
      throw Error("Invalid interface density");
    else if (
      key === "thumbnailSize" &&
      !["small", "medium", "large"].includes(String(value))
    )
      throw Error("Invalid thumbnail size");
    else if (key === "motion" && !["system", "reduced"].includes(String(value)))
      throw Error("Invalid motion setting");
    else if (key === "conversionServer") {
      const url = new URL(String(value));
      if (
        !["https:", "http:"].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw Error("Use an HTTP(S) conversion URL");
    }
    Object.assign(result, { [key]: value });
  }
  if (result.autoGapMaxMm < result.autoGapMinMm)
    throw Error(
      "Maximum Auto Nest gap must be greater than or equal to the minimum gap",
    );
  return result;
}
