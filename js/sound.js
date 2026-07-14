/**
 * Sound toggle + tiny WebAudio synth for the catch-the-stars game.
 *
 * The toggle defaults off (index.html). AudioContext is created lazily inside a
 * user gesture — never at page load — so autoplay policy is satisfied. Game SFX
 * read the on/off state through isSoundOn() rather than poking the toggle's DOM.
 * Header and in-game toggles stay in sync via querySelectorAll.
 */

let soundOn = false;
let audioCtx = null;

const SOUND_CHANGE = "ll:soundchange";

export function isSoundOn() {
  return soundOn;
}

/** Resume (or create) the shared AudioContext. Must run inside a user gesture. */
export function ensureAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(freq, duration, type = "square", gain = 0.08, when = 0) {
  const ctx = ensureAudio();
  if (!ctx || !soundOn) return;

  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Rising coin-ladder blip. streak is consecutive catches (0-based). */
export function playCatch(streak = 0) {
  const step = Math.min(streak, 12);
  tone(440 * Math.pow(1.06, step), 0.09, "square", 0.07);
}

export function playMiss() {
  tone(110, 0.18, "triangle", 0.1);
}

export function playGameOver() {
  tone(330, 0.12, "square", 0.06, 0);
  tone(247, 0.12, "square", 0.06, 0.1);
  tone(185, 0.22, "square", 0.07, 0.2);
}

function syncButtons(on) {
  soundOn = on;
  document.querySelectorAll("[data-sound-toggle]").forEach((button) => {
    const iconOff = button.querySelector("[data-sound-off]");
    const iconOn = button.querySelector("[data-sound-on]");
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Sound on" : "Sound off");
    if (iconOff) iconOff.hidden = on;
    if (iconOn) iconOn.hidden = !on;
  });
}

export function initSoundToggle() {
  const buttons = document.querySelectorAll("[data-sound-toggle]");
  if (!buttons.length) return;

  syncButtons(buttons[0].getAttribute("aria-pressed") === "true");

  buttons.forEach((button) => {
    button.addEventListener("click", (e) => {
      /* Don’t let a click on the in-game toggle bubble into the restart overlay. */
      e.stopPropagation();
      const next = !soundOn;
      if (next) ensureAudio();
      syncButtons(next);
      button.dispatchEvent(
        new CustomEvent(SOUND_CHANGE, { bubbles: true, detail: { on: soundOn } })
      );
    });
  });
}
