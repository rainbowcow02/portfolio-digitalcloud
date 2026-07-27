/**
 * Loads shared layout markup, then starts the simulator module.
 */
import { MODE } from "./config.js";
import { LAYOUT_HTML } from "./layout.js";

function applyShellCopy() {
  document.title = MODE.pageTitle;
  const heading = document.getElementById("pageHeading");
  const intro = document.getElementById("pageIntro");
  if (heading) heading.textContent = MODE.pageHeading;
  if (intro) intro.textContent = MODE.pageIntro;
}

function waitForChart(maxMs = 5000) {
  if (typeof Chart !== "undefined") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const start = performance.now();
    (function poll() {
      if (typeof Chart !== "undefined") {
        resolve();
        return;
      }
      if (performance.now() - start >= maxMs) {
        reject(new Error("Chart.js did not load"));
        return;
      }
      requestAnimationFrame(poll);
    })();
  });
}

try {
  document.body.innerHTML = LAYOUT_HTML;
  applyShellCopy();
  await waitForChart();
  const { startApp } = await import("./app.js");
  startApp();
} catch (err) {
  document.body.innerHTML =
    `<p style="font:16px/1.5 system-ui,sans-serif;padding:2rem">Could not load simulator. ${err.message}</p>`;
  console.error(err);
}
