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
    footnote:
      "Tweak the controls below to reshape the proposed curves. Charts compare your proposal to Current (in game). Reset restores this device’s defaults.",
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
    footnote:
      "Tweak the controls below to reshape speed, density, and randomness. Charts compare your proposal to what’s live in the game. Reset restores this device’s defaults.",
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
