import { initNav } from "./nav.js";
import { initSoundToggle } from "./sound.js";
import { initMotion } from "./motion.js";
import { initGame } from "./game.js";

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initSoundToggle();
  initMotion();
  initGame();
});
