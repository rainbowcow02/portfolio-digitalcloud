/**
 * Sound toggle UI only — audio wiring deferred.
 */
export function initSoundToggle() {
  const button = document.querySelector("[data-sound-toggle]");
  const iconOff = document.querySelector("[data-sound-off]");
  const iconOn = document.querySelector("[data-sound-on]");
  if (!button || !iconOff || !iconOn) return;

  button.addEventListener("click", () => {
    const isOn = button.getAttribute("aria-pressed") === "true";
    const next = !isOn;
    button.setAttribute("aria-pressed", String(next));
    button.setAttribute("aria-label", next ? "Sound on" : "Sound off");
    iconOff.hidden = next;
    iconOn.hidden = !next;
  });
}
