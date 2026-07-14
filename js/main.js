import { initNav } from "./nav.js";
import { initSoundToggle } from "./sound.js";
import { initMotion } from "./motion.js";

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initSoundToggle();
  initMotion();
});
