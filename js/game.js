/**
 * Catch the stars — the footer easter egg (M8).
 *
 * Stars fall; mini-me catches them. Three misses ends the round. Difficulty ramps
 * with score (not elapsed time). Canvas draws the field; DOM owns HUD, scenery,
 * and copy. Idle / playing / over visuals are driven by data-game-state.
 *
 * Loop runs on gsap.ticker while a round is active (MOTION.md: one ticker, not a
 * competing rAF). Falls back to requestAnimationFrame if GSAP didn't load.
 * Fail-safe: missing canvas context or failed sprite load → leave the idle card as-is.
 */

import { ensureAudio, isSoundOn, playCatch, playMiss, playGameOver } from "./sound.js";

const BEST_KEY = "ctsBest";
const LIVES = 3;

/* Ramp keyed to score. At ~40 caught the curve holds. Six numbers = the whole feel. */
const FALL_AT_0 = 140; /* px/s */
const FALL_AT_40 = 420;
const SPAWN_AT_0 = 1.1; /* seconds */
const SPAWN_AT_40 = 0.35;
const RAMP_SCORE = 40;
const SPEED_JITTER = 0.15;

const PLAYER_W = 56;
const PLAYER_H = 68;
const PLAYER_SPEED = 420; /* target vx under keys, px/s */
const VX_LERP = 14; /* how fast vx catches the target */
const POINTER_EASE = 16;
const STAR_SIZE = 28;
const CATCH_PAD_X = 10; /* catch band wider than the sprite */
const FLOOR_PAD = 20; /* matches .game__ground height */

const IDLE_PROMPT = "Click or tap to play";
const OVER_HINT = "Click or tap to play again.";

const OVER_LINES = [
  "Nice try, dreamer.",
  "Nice try, star-chaser.",
  "The sky wins this round.",
  "So close — again?",
  "Three misses. That's the rule.",
];

export function initGame() {
  const stage = document.querySelector("[data-game]");
  const canvas = stage?.querySelector("[data-game-canvas]");
  if (!stage || !canvas) return;

  const ctx = canvas.getContext("2d");
  const startBtn = stage.querySelector("[data-game-start]");
  const overlay = stage.querySelector("[data-game-overlay]");
  const message = stage.querySelector("[data-game-message]");
  const hint = stage.querySelector("[data-game-hint]");
  const playHint = stage.querySelector("[data-game-play-hint]");
  const scoreOut = stage.querySelector("[data-game-score]");
  const bestOut = stage.querySelector("[data-game-best]");
  const status = stage.querySelector("[data-game-status]");
  if (!ctx || !startBtn || !overlay || !message) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let whimsy = !reduceMotion.matches;
  reduceMotion.addEventListener("change", (e) => {
    whimsy = !e.matches;
  });

  const sprite = new Image();
  let spriteOk = false;
  sprite.addEventListener("load", () => {
    spriteOk = true;
    if (getState() !== "playing") draw();
  });
  sprite.addEventListener("error", () => {
    /* Fail-safe: leave the static card. Nothing about the game is required to render. */
    spriteOk = false;
  });
  sprite.src = "assets/mini-me.png";

  let w = 0;
  let h = 0;
  let hintTimer = 0;

  const state = {
    mode: "idle", // idle | playing | over | paused
    score: 0,
    misses: 0,
    streak: 0,
    best: readBest(),
    spawnIn: 0,
    stars: [],
    sparks: [],
    player: { x: 0, vx: 0, targetVx: 0, target: null, squash: 0 },
    keys: new Set(),
    resumeMode: null,
  };

  let loopAttached = false;
  let last = 0;
  let rafId = null;

  setState("idle");
  syncHud();

  /* ——— Loop shim: GSAP ticker preferred; plain rAF if CDN failed ——— */

  function startLoop() {
    if (loopAttached) return;
    loopAttached = true;
    last = 0;
    if (typeof gsap !== "undefined" && gsap.ticker) {
      gsap.ticker.add(onGsapTick);
    } else {
      const tick = (now) => {
        rafId = requestAnimationFrame(tick);
        const sec = now / 1000;
        const dt = last ? Math.min(sec - last, 1 / 30) : 0;
        last = sec;
        if (state.mode === "playing" && dt) update(dt);
        if (state.mode === "playing") draw();
      };
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (!loopAttached) return;
    loopAttached = false;
    if (typeof gsap !== "undefined" && gsap.ticker) {
      gsap.ticker.remove(onGsapTick);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    last = 0;
  }

  /* gsap.ticker: time in seconds, deltaTime in ms — clamp so a backgrounded tab
     doesn't dump a huge step through the floor on return. */
  function onGsapTick(_time, deltaTimeMs) {
    if (state.mode !== "playing") return;
    const dt = Math.min((deltaTimeMs || 0) / 1000, 1 / 30);
    if (dt) update(dt);
    draw();
  }

  /* ——— Sizing ——— */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    clampPlayer();
    if (state.mode !== "playing") draw();
  }

  new ResizeObserver(resize).observe(canvas);

  /* ——— Lifecycle ——— */

  function getState() {
    return state.mode === "paused" ? "playing" : state.mode;
  }

  function setState(mode) {
    const visual = mode === "paused" ? "playing" : mode;
    state.mode = mode;
    stage.dataset.gameState = visual;
  }

  function formatScore(n) {
    return String(Math.max(0, n)).padStart(3, "0");
  }

  function hidePlayHint() {
    if (playHint) playHint.hidden = true;
    hintTimer = 0;
  }

  function showPlayHint() {
    if (!playHint) return;
    playHint.hidden = false;
    hintTimer = 2.4;
  }

  function start() {
    if (sprite.complete && !sprite.naturalWidth) return; // load failed — stay idle
    if (!sprite.complete) {
      sprite.addEventListener("load", () => start(), { once: true });
      return;
    }
    spriteOk = true;

    ensureAudio();

    state.mode = "playing";
    state.score = 0;
    state.misses = 0;
    state.streak = 0;
    state.spawnIn = 0.6;
    state.stars = [];
    state.sparks = [];
    state.player.x = w / 2 - PLAYER_W / 2;
    state.player.vx = 0;
    state.player.targetVx = 0;
    state.player.target = null;
    state.player.squash = 0;
    state.keys.clear();
    state.resumeMode = null;

    setState("playing");
    if (message) message.textContent = IDLE_PROMPT;
    if (hint) hint.textContent = "";
    syncHud();
    showPlayHint();
    say("Game started. Move with the arrow keys, or drag. Escape to quit.");

    canvas.focus({ preventScroll: true });
    startLoop();
  }

  function end() {
    stopLoop();
    setState("over");
    hidePlayHint();

    const isBest = state.score > state.best;
    if (isBest) {
      state.best = state.score;
      writeBest(state.best);
    }

    if (isSoundOn()) playGameOver();

    message.textContent = isBest
      ? "New best!"
      : OVER_LINES[Math.floor(Math.random() * OVER_LINES.length)];
    if (hint) hint.textContent = OVER_HINT;
    syncHud();
    say(`Game over. Score ${state.score}. Best ${state.best}.`);
    startBtn.focus({ preventScroll: true });
    draw();
  }

  function quit() {
    if (state.mode !== "playing" && state.mode !== "paused") return;
    end();
  }

  function pause() {
    if (state.mode !== "playing") return;
    state.resumeMode = "playing";
    setState("paused");
    stopLoop();
  }

  function resume() {
    if (state.mode !== "paused") return;
    setState("playing");
    startLoop();
  }

  /* ——— Sim ——— */

  function rampT() {
    return Math.min(1, state.score / RAMP_SCORE);
  }

  function fallSpeed() {
    const t = rampT();
    return FALL_AT_0 + (FALL_AT_40 - FALL_AT_0) * t;
  }

  function spawnInterval() {
    const t = rampT();
    return SPAWN_AT_0 + (SPAWN_AT_40 - SPAWN_AT_0) * t;
  }

  function update(dt) {
    const p = state.player;

    if (hintTimer > 0) {
      hintTimer -= dt;
      if (hintTimer <= 0) hidePlayHint();
    }

    let dir = 0;
    if (state.keys.has("left")) dir -= 1;
    if (state.keys.has("right")) dir += 1;

    if (dir) {
      p.target = null;
      p.targetVx = dir * PLAYER_SPEED;
      hidePlayHint();
    } else if (p.target !== null) {
      p.targetVx = 0;
      p.x += (p.target - PLAYER_W / 2 - p.x) * Math.min(1, POINTER_EASE * dt);
      hidePlayHint();
    } else {
      p.targetVx = 0;
    }

    p.vx += (p.targetVx - p.vx) * Math.min(1, VX_LERP * dt);
    if (dir || Math.abs(p.vx) > 1) p.x += p.vx * dt;
    clampPlayer();

    if (whimsy) p.squash = Math.max(0, p.squash - dt * 4);
    else p.squash = 0;

    state.spawnIn -= dt;
    if (state.spawnIn <= 0) {
      spawnStar();
      state.spawnIn = spawnInterval();
    }

    const top = h - FLOOR_PAD - PLAYER_H;
    for (let i = state.stars.length - 1; i >= 0; i--) {
      const s = state.stars[i];
      s.y += s.vy * dt;
      if (whimsy) s.rot += s.spin * dt;

      const caught =
        s.y + s.r >= top &&
        s.y - s.r <= top + PLAYER_H * 0.45 &&
        s.x + s.r > p.x - CATCH_PAD_X &&
        s.x - s.r < p.x + PLAYER_W + CATCH_PAD_X;

      if (caught) {
        state.stars.splice(i, 1);
        state.score += 1;
        state.streak += 1;
        if (whimsy) {
          p.squash = 1;
          burst(s.x, s.y, 6);
        }
        if (isSoundOn()) playCatch(state.streak - 1);
        syncHud(true);
        continue;
      }

      if (s.y - s.r > h - FLOOR_PAD) {
        state.stars.splice(i, 1);
        state.misses += 1;
        state.streak = 0;
        if (isSoundOn()) playMiss();
        syncHud();
        if (state.misses >= LIVES) {
          end();
          return;
        }
      }
    }

    if (whimsy) {
      for (let i = state.sparks.length - 1; i >= 0; i--) {
        const k = state.sparks[i];
        k.life -= dt;
        if (k.life <= 0) {
          state.sparks.splice(i, 1);
          continue;
        }
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        k.vy += 260 * dt;
      }
    } else {
      state.sparks.length = 0;
    }
  }

  function spawnStar() {
    const r = STAR_SIZE / 2;
    const x = r + 8 + Math.random() * Math.max(1, w - (r + 8) * 2);
    const base = fallSpeed();
    const jitter = 1 + (Math.random() * 2 - 1) * SPEED_JITTER;
    state.stars.push({
      x,
      y: -r,
      r,
      vy: base * jitter,
      rot: whimsy ? Math.random() * Math.PI : 0,
      spin: whimsy ? 0.9 * (Math.random() < 0.5 ? -1 : 1) : 0,
    });
  }

  function burst(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 120;
      state.sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.4 + Math.random() * 0.25,
        max: 0.65,
      });
    }
  }

  function clampPlayer() {
    const p = state.player;
    p.x = Math.max(0, Math.min(Math.max(0, w - PLAYER_W), p.x));
  }

  /* ——— Paint ——— */

  function draw() {
    if (!w || !h) return;
    ctx.clearRect(0, 0, w, h);

    const active =
      state.mode === "playing" || state.mode === "paused" || state.mode === "over";
    if (!active) return;

    if (state.mode === "playing" || state.mode === "paused") {
      for (const s of state.stars) drawStar(s);

      for (const k of state.sparks) {
        ctx.globalAlpha = Math.max(0, k.life / k.max);
        ctx.fillStyle = "#e8c5f2";
        ctx.fillRect(Math.round(k.x) - 1.5, Math.round(k.y) - 1.5, 3, 3);
      }
      ctx.globalAlpha = 1;
    }

    drawPlayer();
  }

  function drawStar(s) {
    const grad = ctx.createLinearGradient(s.x - s.r, s.y - s.r, s.x + s.r, s.y + s.r);
    grad.addColorStop(0, "#fbeaff");
    grad.addColorStop(1, "#c6d7ff");

    ctx.save();
    ctx.translate(s.x, s.y);
    if (whimsy) ctx.rotate(s.rot);
    ctx.beginPath();
    const r = s.r;
    const k = r * 0.14;
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(k, -k, r, 0);
    ctx.quadraticCurveTo(k, k, 0, r);
    ctx.quadraticCurveTo(-k, k, -r, 0);
    ctx.quadraticCurveTo(-k, -k, 0, -r);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#e8c5f2";
    ctx.stroke();
    ctx.restore();
  }

  function drawPlayer() {
    if (!sprite.complete || !sprite.naturalWidth) return;
    const p = state.player;
    const sq = whimsy && state.mode !== "over" ? p.squash * 0.12 : 0;
    const dw = PLAYER_W * (1 + sq);
    const dh = PLAYER_H * (1 - sq);
    const x = Math.round(p.x - (dw - PLAYER_W) / 2);
    const y = Math.round(h - FLOOR_PAD - dh);
    ctx.drawImage(sprite, x, y, Math.round(dw), Math.round(dh));
  }

  /* ——— HUD ——— */

  function syncHud(bumpScore = false) {
    if (scoreOut) {
      scoreOut.textContent = formatScore(state.score);
      if (bumpScore && whimsy && typeof gsap !== "undefined") {
        gsap.fromTo(
          scoreOut,
          { scale: 1.35 },
          { scale: 1, duration: 0.2, ease: "power2.out", overwrite: true }
        );
      }
    }
    if (bestOut) bestOut.textContent = formatScore(state.best);
  }

  function say(text) {
    if (status) status.textContent = text;
  }

  /* ——— Input ——— */

  startBtn.addEventListener("click", start);

  canvas.addEventListener("keydown", onKeyDown);
  canvas.addEventListener("keyup", onKeyUp);
  window.addEventListener("keydown", onWindowKeyDown, true);

  function onKeyDown(e) {
    if (state.mode !== "playing") return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") state.keys.add("left");
    else if (k === "ArrowRight" || k === "d" || k === "D") state.keys.add("right");
    else if (k === "Escape") {
      e.preventDefault();
      return quit();
    } else if (k === " " || k === "Spacebar") {
      e.preventDefault();
      return;
    } else return;
    e.preventDefault();
  }

  function onKeyUp(e) {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") state.keys.delete("left");
    if (k === "ArrowRight" || k === "d" || k === "D") state.keys.delete("right");
  }

  /* While playing, stop space/arrows from scrolling the page even if focus left the canvas. */
  function onWindowKeyDown(e) {
    if (state.mode !== "playing") return;
    const k = e.key;
    if (
      k === " " ||
      k === "Spacebar" ||
      k === "ArrowLeft" ||
      k === "ArrowRight" ||
      k === "ArrowUp" ||
      k === "ArrowDown"
    ) {
      e.preventDefault();
    }
  }

  canvas.addEventListener("pointerdown", (e) => {
    if (state.mode !== "playing") return;
    canvas.setPointerCapture(e.pointerId);
    state.player.target = pointerX(e);
  });

  canvas.addEventListener("pointermove", (e) => {
    if (state.mode !== "playing") return;
    if (e.pointerType === "mouse" || e.buttons) state.player.target = pointerX(e);
  });

  canvas.addEventListener("pointerleave", () => {
    if (state.mode === "playing") state.player.target = null;
  });

  function pointerX(e) {
    return e.clientX - canvas.getBoundingClientRect().left;
  }

  /* Pause aggressively — detach the loop. Resume when attention returns. */
  window.addEventListener("blur", pause);
  window.addEventListener("focus", () => {
    if (document.visibilityState === "visible") resume();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else resume();
  });

  new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) pause();
      else if (state.mode === "paused") resume();
    },
    { threshold: 0.35 }
  ).observe(stage);

  syncHud();
  resize();
}

function readBest() {
  try {
    const next = Number(localStorage.getItem(BEST_KEY));
    if (next) return next;
    /* One-time migrate from the earlier key if present. */
    const legacy = Number(localStorage.getItem("ll-catch-best"));
    if (legacy) {
      localStorage.setItem(BEST_KEY, String(legacy));
      return legacy;
    }
    return 0;
  } catch {
    return 0;
  }
}

function writeBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* Safari private mode throws — ignore */
  }
}
