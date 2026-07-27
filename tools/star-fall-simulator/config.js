/**
 * Mode config for dev workspace vs portfolio sandbox.
 * Entry pages set window.STAR_FALL_SIM_MODE before bootstrap loads app.js.
 */

export const SIM_MODE =
  window.STAR_FALL_SIM_MODE === "demo"
    ? "demo"
    : window.STAR_FALL_SIM_MODE === "dev"
      ? "dev"
      : "dev";

const MODE_SETTINGS = {
  dev: {
    storageKey: "star-fall-sim-forcooking-v1",
    themeKey: "star-fall-sim-forcooking-theme",
    legacyStorageKey: "star-fall-simulator-v1",
    legacyThemeKey: "star-fall-simulator-theme",
    useSessionStorage: false,
    pageTitle: "Star fall sim (for cooking)",
    pageHeading: "Star fall sim (for cooking)",
    pageIntro:
      "Private tuning workspace for Catch the stars. Settings persist in this browser. When a proposal feels right, paste the tuned values into js/game.js.",
    footnoteMobile: (creepAfter, creepPerStar) =>
      `Mobile proposal matches js/game.js (shaped speed, creep after ${creepAfter}, spawn capped).`,
    footnoteDesktop: (creepAfter, creepPerStar, fieldWidth) =>
      `Desktop matches js/game.js: log speed, eased spawn, waves, ramped jitter, ${fieldWidth}px field, creep +${creepPerStar} px/s after ${creepAfter}.`,
    robots: "noindex, nofollow",
  },
  demo: {
    storageKey: "catch-the-stars-simulator-v1",
    themeKey: "catch-the-stars-simulator-theme",
    legacyStorageKey: null,
    legacyThemeKey: null,
    useSessionStorage: true,
    pageTitle: "Catch the stars simulator",
    pageHeading: "Catch the stars simulator",
    pageIntro:
      "Explore how I set speed, density, and randomness for the mobile and desktop versions of the game in this sandbox. (They're different!) Changes made here will reset when you close the tab.",
    footnoteMobile: (creepAfter) =>
      `Mobile curve: speed shapes up to ${creepAfter} stars, then creeps faster; spawn interval tightens over time.`,
    footnoteDesktop: (creepAfter, creepPerStar, fieldWidth) =>
      `Desktop curve: log-shaped speed, eased spawn density, optional waves, and ramped jitter on a ${fieldWidth}px field. After ${creepAfter} stars, speed creeps +${creepPerStar} px/s per star.`,
    robots: null,
  },
};

export const MODE = MODE_SETTINGS[SIM_MODE];

export function getStorage() {
  return MODE.useSessionStorage ? sessionStorage : localStorage;
}

export function themeKeyForMode(mode = SIM_MODE) {
  return MODE_SETTINGS[mode].themeKey;
}
