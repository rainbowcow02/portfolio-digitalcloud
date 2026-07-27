/**
 * Star fall simulator — shared core for dev workspace and portfolio sandbox.
 *
 * Tweak PROFILE_DEFAULTS / TUNE / LOG_SHAPE / SPEED_CREEP_AFTER below, or use
 * the on-page controls. Dev mode persists in localStorage; demo uses sessionStorage.
 * Source of truth for the live game remains ../../js/game.js — copy values there
 * from the dev workspace when you're happy with a proposal.
 */

import { MODE, SIM_MODE, getStorage } from "./config.js";

// ─── Tweak these defaults ───────────────────────────────────────────────────

/** "Current (in game)" chart line — mirror js/game.js DESKTOP_TUNE / MOBILE_TUNE. */
const TUNE = {
  desktop: {
    fallAt0: 140,
    fallAtMax: 400,
    spawnAt0: 1.1,
    spawnAtMax: 0.32,
    rampScore: 140,
    speedJitter: 0.15,
  },
  mobile: {
    fallAt0: 140,
    fallAtMax: 540,
    spawnAt0: 1.1,
    spawnAtMax: 0.25,
    rampScore: 130,
    speedJitter: 0.22,
  },
};

/**
 * Proposed profiles shown in the sim + "Proposed" chart line.
 * Mobile: shipped tuner lock-in. Desktop: same journey, pared for mouse / wider field.
 */
const PROFILE_DEFAULTS = {
  mobile: {
    fieldWidth: 360,
    rampScore: 130,
    fallAtMax: 540,
    spawnAtMax: 0.25,
    speedCurve: "log",
    spawnCurve: "pow065",
    speedWaves: 1.5,
    speedWaveDepth: 0.12,
    spawnWaves: 1.5,
    spawnWaveDepth: 0.09,
    jitterMin: 0.12,
    jitterMax: 0.22,
    jitterWaves: 10,
    jitterWaveDepth: 0.5,
    creepPerStar: 0.55,
  },
  desktop: {
    fieldWidth: 520,
    rampScore: 140,
    fallAtMax: 400,
    spawnAtMax: 0.32,
    speedCurve: "log",
    spawnCurve: "pow065",
    speedWaves: 1.5,
    speedWaveDepth: 0.12,
    spawnWaves: 1.5,
    spawnWaveDepth: 0.06,
    jitterMin: 0.3,
    jitterMax: 0.15,
    jitterWaves: 0,
    jitterWaveDepth: 0.06,
    creepPerStar: 0.4,
  },
};

/** How front-loaded the log curve is (smaller = steeper early rise). */
const LOG_SHAPE = 0.25;

/** After this score, shaped speed freezes and slow linear creep takes over. */
const SPEED_CREEP_AFTER = 160;

const CURVE_LABEL = {
  log: "Log — quick, then continual",
  linear: "Linear — steady straight line",
  easeOut: "Ease-out — fast start, plateaus",
  smoothstep: "Smoothstep — S-curve",
  pow065: "Gentle ease-out — t^0.65",
  easeIn: "Ease-in — slow start, ramps late",
};

const STORAGE_KEY = MODE.storageKey;
const THEME_KEY = MODE.themeKey;
const storage = getStorage();
const FIELD_H = 360;
const STAR_PX = 22;
const PLAYER_W = 56;
const PLAYER_H = 68;
const PLAYER_SPEED = 420;
const CATCH_PAD_X = 10;
const FLOOR_PAD = 32;
const POINTER_EASE = 16;
const VX_LERP = 14;

function systemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function currentTheme() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return systemTheme();
}

function syncThemeToggle() {
  const theme = currentTheme();
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const next = theme === "dark" ? "light" : "dark";
  btn.setAttribute("aria-label", `Switch to ${next} mode`);
  btn.title = `Switch to ${next} mode`;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore quota / private mode — theme still applies for this session */
  }
  syncThemeToggle();
}

function migrateLegacyStorage() {
  if (!MODE.legacyStorageKey) return;
  try {
    if (storage.getItem(STORAGE_KEY)) return;
    const legacy = localStorage.getItem(MODE.legacyStorageKey);
    if (!legacy) return;
    storage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(MODE.legacyStorageKey);
  } catch {
    /* ignore quota / private mode */
  }
}

function migrateLegacyTheme() {
  if (!MODE.legacyThemeKey) return;
  try {
    if (localStorage.getItem(THEME_KEY)) return;
    const legacy = localStorage.getItem(MODE.legacyThemeKey);
    if (!legacy) return;
    localStorage.setItem(THEME_KEY, legacy);
  } catch {
    /* ignore */
  }
}

function applyModeUI() {
  document.title = MODE.pageTitle;
  const heading = $("pageHeading");
  const intro = $("pageIntro");
  if (heading) heading.textContent = MODE.pageHeading;
  if (intro) intro.textContent = MODE.pageIntro;
}

// ─── Math (mirrors the canvas tuner / game ramp model) ──────────────────────

function ease(t, type) {
  const c = Math.min(1, Math.max(0, t));
  switch (type) {
    case "easeOut":
      return 1 - (1 - c) * (1 - c);
    case "smoothstep":
      return c * c * (3 - 2 * c);
    case "pow065":
      return Math.pow(c, 0.65);
    case "easeIn":
      return c * c;
    case "linear":
    case "log":
    default:
      return c;
  }
}

function rampT(stars, rampScore) {
  return Math.min(1, stars / rampScore);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function round(n, digits = 0) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function niceStep(xMax) {
  return Math.max(5, Math.round(xMax / 24 / 5) * 5);
}

function buildStars(xMax) {
  const step = niceStep(xMax);
  const out = [];
  for (let s = 0; s <= xMax; s += step) out.push(s);
  return out;
}

function curveProgress(starsAt, rampScore, curve) {
  if (curve === "log") {
    const s0 = Math.max(1, rampScore * LOG_SHAPE);
    const denom = Math.log(1 + rampScore / s0);
    return denom > 0 ? Math.log(1 + starsAt / s0) / denom : 0;
  }
  return ease(rampT(starsAt, rampScore), curve);
}

function waveTerm(starsAt, rampScore, waveCount, waveAmp) {
  if (waveCount > 0 && waveAmp > 0) {
    return waveAmp * Math.sin((2 * Math.PI * waveCount * starsAt) / Math.max(1, rampScore));
  }
  return 0;
}

function fallSpeedAt(starsAt, tune, rampScore, curve, waveCount, waveAmp, creepPerStar) {
  const shapedAt = Math.min(starsAt, SPEED_CREEP_AFTER);
  let p = curveProgress(shapedAt, rampScore, curve) + waveTerm(shapedAt, rampScore, waveCount, waveAmp);
  p = Math.max(0, p);
  let speed = lerp(tune.fallAt0, tune.fallAtMax, p);
  if (starsAt > SPEED_CREEP_AFTER) {
    speed += creepPerStar * (starsAt - SPEED_CREEP_AFTER);
  }
  return speed;
}

function spawnIntervalAt(starsAt, tune, rampScore, curve, waveCount, waveAmp) {
  let p = curveProgress(starsAt, rampScore, curve) + waveTerm(starsAt, rampScore, waveCount, waveAmp);
  p = Math.min(1, Math.max(0, p));
  return lerp(tune.spawnAt0, tune.spawnAtMax, p);
}

function jitterAt(starsAt, rampScore, jitterMin, jitterMax, waveCount, waveAmp) {
  let p = rampT(starsAt, rampScore) + waveTerm(starsAt, rampScore, waveCount, waveAmp);
  p = Math.min(1, Math.max(0, p));
  return jitterMin + (jitterMax - jitterMin) * p;
}

function seriesExtent(series, beginAtZero = true) {
  let min = Infinity;
  let max = -Infinity;
  for (const s of series) {
    for (const v of s.data) {
      const y = typeof v === "object" && v !== null ? v.y : v;
      if (!Number.isFinite(y)) continue;
      if (y < min) min = y;
      if (y > max) max = y;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { yMin: 0, yMax: 1 };
  if (beginAtZero) min = Math.min(0, min);
  if (min === max) max = min + 1;
  return { yMin: min, yMax: max };
}

function niceAxisExtent(series, beginAtZero = true) {
  let { yMin, yMax } = seriesExtent(series, beginAtZero);
  const span = yMax - yMin;
  yMax += span * 0.12;
  const rough = (yMax - yMin) / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-9))));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? rough;
  if (beginAtZero || yMin <= 0) yMin = 0;
  else yMin = Math.floor(yMin / step) * step;
  yMax = Math.ceil(yMax / step) * step;
  if (yMax <= yMin) yMax = yMin + step;
  return { yMin, yMax };
}

// ─── State ──────────────────────────────────────────────────────────────────

function loadState() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState(state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

migrateLegacyStorage();
migrateLegacyTheme();
const saved = loadState();

const state = {
  device: saved?.device === "mobile" || saved?.device === "desktop" ? saved.device : "desktop",
  xMax: Number.isFinite(saved?.xMax) ? saved.xMax : 280,
  mobileProfile: { ...PROFILE_DEFAULTS.mobile, ...(saved?.mobileProfile || {}) },
  desktopProfile: { ...PROFILE_DEFAULTS.desktop, ...(saved?.desktopProfile || {}) },
};

function persist() {
  saveState({
    device: state.device,
    xMax: state.xMax,
    mobileProfile: state.mobileProfile,
    desktopProfile: state.desktopProfile,
  });
}

function profile() {
  return state.device === "mobile" ? state.mobileProfile : state.desktopProfile;
}

function setProfile(patch) {
  const key = state.device === "mobile" ? "mobileProfile" : "desktopProfile";
  state[key] = { ...state[key], ...patch };
  persist();
}

function proposedTune() {
  const current = TUNE[state.device];
  const p = profile();
  return {
    ...current,
    fallAtMax: p.fallAtMax,
    spawnAtMax: p.spawnAtMax,
    rampScore: p.rampScore,
  };
}

/** Shipped game profile for this device (PROFILE_DEFAULTS + TUNE endpoints). */
function gameDefaultsProfile() {
  return PROFILE_DEFAULTS[state.device];
}

function gameDefaultsTune() {
  const current = TUNE[state.device];
  const p = gameDefaultsProfile();
  return {
    ...current,
    fallAtMax: p.fallAtMax,
    spawnAtMax: p.spawnAtMax,
    rampScore: p.rampScore,
  };
}

/** True when the active device profile differs from shipped game defaults. */
function profileIsDirty() {
  const p = profile();
  const defaults = gameDefaultsProfile();
  return Object.keys(defaults).some((key) => p[key] !== defaults[key]);
}

// ─── DOM helpers ────────────────────────────────────────────────────────────

const $ = (id) => document.getElementById(id);

function on(id, type, handler) {
  const el = $(id);
  if (!el) {
    console.warn(`Missing #${id} — skipped ${type} listener`);
    return;
  }
  el.addEventListener(type, handler);
}

function fillCurveSelects() {
  for (const id of ["speedCurve", "spawnCurve"]) {
    const el = $(id);
    el.innerHTML = "";
    for (const [value, label] of Object.entries(CURVE_LABEL)) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      el.appendChild(opt);
    }
  }
}

/** Keep custom dropdown faces in sync (canvas Dropdown pattern). */
function syncDropdownFaces() {
  for (const select of document.querySelectorAll(".dropdown > .select")) {
    const face = select.parentElement?.querySelector(".dropdown-value");
    if (!face) continue;
    const opt = select.selectedOptions[0];
    face.textContent = opt?.textContent ?? "";
  }
}

function bindNumberInput(input) {
  const min = Number(input.dataset.min);
  const max = Number(input.dataset.max);
  const decimals = Number(input.dataset.decimals || 0);
  const clamp = (n) => Math.min(max, Math.max(min, n));
  const fmt = (n) => Number(n.toFixed(decimals));

  const commit = (n) => {
    if (!Number.isFinite(n)) {
      syncNumberFromState(input);
      return;
    }
    const next = fmt(clamp(n));
    applyNumberValue(input, next);
    input.value = String(next);
  };

  input.addEventListener("blur", () => {
    const n = Number(input.value);
    if (input.value.trim() === "" || !Number.isFinite(n)) {
      syncNumberFromState(input);
      return;
    }
    commit(n);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
  });
}

function applyNumberValue(input, next) {
  if (input.dataset.key === "xMax") {
    state.xMax = next;
    persist();
  } else if (input.dataset.profile) {
    setProfile({ [input.dataset.profile]: next });
  }
  renderAll();
}

function syncNumberFromState(input) {
  if (input.dataset.key === "xMax") {
    input.value = String(state.xMax);
  } else if (input.dataset.profile) {
    input.value = String(profile()[input.dataset.profile]);
  }
}

function syncAllControls() {
  const p = profile();
  $("device").value = state.device;
  $("xMax").value = String(state.xMax);
  $("rampScore").value = String(p.rampScore);
  $("fieldWidth").value = String(p.fieldWidth);
  $("speedCurve").value = p.speedCurve;
  $("spawnCurve").value = p.spawnCurve;
  syncDropdownFaces();
  $("fallAtMax").value = String(p.fallAtMax);
  $("spawnAtMax").value = String(p.spawnAtMax);
  $("speedWaves").value = String(p.speedWaves);
  $("speedWaveDepth").value = String(p.speedWaveDepth);
  $("spawnWaves").value = String(p.spawnWaves);
  $("spawnWaveDepth").value = String(p.spawnWaveDepth);
  $("jitterMin").value = String(p.jitterMin);
  $("jitterMax").value = String(p.jitterMax);
  $("jitterWaves").value = String(p.jitterWaves);
  $("jitterWaveDepth").value = String(p.jitterWaveDepth);

  const logHint = p.speedCurve === "log" || p.spawnCurve === "log";
  $("rampScoreHint").textContent = logHint
    ? "Stars at max (log keeps climbing)"
    : "Stars when curves reach full ramp";

  $("speedWaveDepth").disabled = p.speedWaves <= 0;
  $("spawnWaveDepth").disabled = p.spawnWaves <= 0;
  $("jitterWaveDepth").disabled = p.jitterWaves <= 0;
  $("speedWaveDepthHint").textContent =
    p.speedWaves > 0 ? "Dips and surges (steps ±0.01)" : "Set waves above 0 to enable";
  $("spawnWaveDepthHint").textContent =
    p.spawnWaves > 0 ? "Dips and surges (steps ±0.01)" : "Set waves above 0 to enable";
  $("jitterWaveDepthHint").textContent =
    p.jitterWaves > 0 ? "Dips and surges (steps ±0.01)" : "Set waves above 0 to enable";

  $("speedCurveHint").textContent =
    `Fall speed; after ${SPEED_CREEP_AFTER} creeps +${p.creepPerStar} px/s per star`;
  $("fallChartSub").textContent =
    `Higher = stars drop faster · proposed max ${p.fallAtMax} px/s`;
  $("spawnChartSub").textContent =
    `Lower = denser · proposed min ${p.spawnAtMax} s`;

  const isDesktop = state.device === "desktop";
  $("fieldWidthWrap").hidden = !isDesktop;
  $("fieldWidthLabel").textContent = `${p.fieldWidth}px field (proposed play width)`;

  document.documentElement.style.setProperty("--field-width", `${p.fieldWidth}px`);
  clampPlayer();
  renderPlayerDom();

  $("footnote").textContent = MODE.footnote;
}

// ─── Charts ─────────────────────────────────────────────────────────────────

/* Chart tones match cursor/canvas chartPalette (LineChart toneToColor). */
function chartTone(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--chart-${name}`)
    .trim();
}

function hexWithAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const rgb = h.length === 8 ? h.slice(0, 6) : h.slice(0, 6);
  return `#${rgb}${alpha}`;
}

function chartStroke() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--stroke-tertiary")
    .trim();
}

function chartText() {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--text-tertiary")
    .trim();
}

/** Purple dashed vertical guide while hovering a chart (canvas data-hover-guide). */
const HOVER_GUIDE_PURPLE = "#6b4fc8";

function liveMarkerColors() {
  const root = getComputedStyle(document.documentElement);
  return {
    fill: root.getPropertyValue("--star-purple").trim() || "#b4a1f3",
    ring: root.getPropertyValue("--star-purple-ring").trim() || "#ffffff",
    edge: root.getPropertyValue("--star-purple-edge").trim() || "#737373",
  };
}

/** Live sim marker — drawn in canvas space so it always matches chart scales. */
const liveMarkerPlugin = {
  id: "liveMarker",
  afterDatasetsDraw(chart) {
    const live = chart.$liveMarker;
    if (!live || !Number.isFinite(live.score) || !Number.isFinite(live.y)) return;
    const { ctx, chartArea, scales } = chart;
    if (!chartArea) return;

    const xPx = scales.x.getPixelForValue(Math.min(state.xMax, Math.max(0, live.score)));
    const yPx = scales.y.getPixelForValue(live.y);
    const { fill, ring, edge } = liveMarkerColors();

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = fill;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.moveTo(xPx, chartArea.top);
    ctx.lineTo(xPx, chartArea.bottom);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(xPx, yPx, 7, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = ring;
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.restore();
  },
};

const hoverGuidePlugin = {
  id: "hoverGuide",
  afterDatasetsDraw(chart) {
    const active = chart.getActiveElements();
    if (!active.length) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    const x = active[0].element.x;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = HOVER_GUIDE_PURPLE;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

function makeLineChart(canvas, { valueSuffix = "", fill = false } = {}) {
  if (!canvas || typeof Chart === "undefined") return null;
  const font = {
    family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    size: 11,
  };
  return new Chart(canvas, {
    type: "line",
    data: { labels: [], datasets: [] },
    plugins: [hoverGuidePlugin, liveMarkerPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const v = ctx.parsed.y;
              const base = `${ctx.dataset.label}: ${v}`;
              return valueSuffix ? `${base}${valueSuffix}` : base;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          min: 0,
          max: state.xMax,
          title: { display: true, text: "Stars", color: chartText(), font },
          ticks: { maxTicksLimit: 8, color: chartText(), font: { ...font, size: 11 } },
          grid: { color: chartStroke() },
          border: { color: chartStroke() },
        },
        y: {
          beginAtZero: true,
          ticks: { color: chartText(), font: { ...font, size: 11 } },
          grid: { color: chartStroke() },
          border: { color: chartStroke() },
        },
      },
      elements: {
        point: { radius: 0, hoverRadius: 3, pointStyle: "circle" },
        line: { borderWidth: 2, tension: 0.15, fill },
      },
    },
  });
}

const charts = {
  fall: null,
  spawn: null,
  rand: null,
};

function ensureCharts() {
  if (charts.fall) return charts;
  charts.fall = makeLineChart($("fallChart"));
  charts.spawn = makeLineChart($("spawnChart"), { valueSuffix: " s" });
  charts.rand = makeLineChart($("randChart"), { fill: true });
  return charts;
}

function renderLegend(legendId, series) {
  const el = $(legendId);
  if (!el) return;
  el.innerHTML = series
    .map((s) => {
      const color = chartTone(s.tone || "info");
      return `<span class="chart-legend-item"><span class="chart-legend-dot" style="color:${color}"></span>${s.name}</span>`;
    })
    .join("");
}

function updateChart(chart, key, series, beginAtZero = true) {
  if (!chart) return;
  const { yMin, yMax } = niceAxisExtent(series, beginAtZero);
  chart.data.datasets = series.map((s) => {
    const color = chartTone(s.tone || "info");
    return {
      label: s.name,
      data: s.data,
      borderColor: color,
      backgroundColor: key === "rand" ? hexWithAlpha(color, "33") : "transparent",
      fill: key === "rand",
      pointStyle: "circle",
    };
  });
  chart.options.scales.x.min = 0;
  chart.options.scales.x.max = state.xMax;
  chart.options.scales.y.min = yMin;
  chart.options.scales.y.max = yMax;
  chart.options.scales.x.ticks.color = chartText();
  chart.options.scales.y.ticks.color = chartText();
  chart.options.scales.x.title.color = chartText();
  chart.options.scales.x.grid.color = chartStroke();
  chart.options.scales.y.grid.color = chartStroke();
  chart.update("none");
  renderLegend(`${key}Legend`, series);
}

function updateLiveChartMarkers(score) {
  ensureCharts();
  const p = profile();
  const tune = proposedTune();
  const liveFall = fallSpeedAt(
    score, tune, p.rampScore, p.speedCurve, p.speedWaves, p.speedWaveDepth, p.creepPerStar,
  );
  const liveSpawn = spawnIntervalAt(
    score, tune, p.rampScore, p.spawnCurve, p.spawnWaves, p.spawnWaveDepth,
  );
  charts.fall.$liveMarker = { score, y: liveFall };
  charts.spawn.$liveMarker = { score, y: liveSpawn };
  charts.rand.$liveMarker = { score, y: liveFall };
  for (const chart of Object.values(charts)) {
    if (chart) chart.draw();
  }
}

function renderCharts(simScore) {
  ensureCharts();
  const p = profile();
  const defaults = gameDefaultsProfile();
  const gameTune = gameDefaultsTune();
  const tune = proposedTune();
  const stars = buildStars(state.xMax);
  // Public sandbox: baseline only after edits. Dev always compares to shipped game.
  const showCurrent = SIM_MODE !== "demo" || profileIsDirty();
  const proposedLabel = SIM_MODE === "demo" && !showCurrent ? "In game" : "Proposed";

  const fallCurrent = (s) =>
    fallSpeedAt(
      s,
      gameTune,
      defaults.rampScore,
      defaults.speedCurve,
      defaults.speedWaves,
      defaults.speedWaveDepth,
      defaults.creepPerStar,
    );
  const fallProposed = (s) =>
    fallSpeedAt(s, tune, p.rampScore, p.speedCurve, p.speedWaves, p.speedWaveDepth, p.creepPerStar);
  const spawnCurrent = (s) =>
    spawnIntervalAt(
      s,
      gameTune,
      defaults.rampScore,
      defaults.spawnCurve,
      defaults.spawnWaves,
      defaults.spawnWaveDepth,
    );
  const spawnProposed = (s) =>
    spawnIntervalAt(s, tune, p.rampScore, p.spawnCurve, p.spawnWaves, p.spawnWaveDepth);
  const jitterProposed = (s) =>
    jitterAt(s, p.rampScore, p.jitterMin, p.jitterMax, p.jitterWaves, p.jitterWaveDepth);

  const point = (xs, fn) => xs.map((s) => ({ x: s, y: fn(s) }));

  const fallSeries = [];
  const spawnSeries = [];
  if (showCurrent) {
    fallSeries.push({
      name: "Current (in game)",
      data: point(stars, (s) => round(fallCurrent(s))),
      tone: "neutral",
    });
    spawnSeries.push({
      name: "Current (in game)",
      data: point(stars, (s) => round(spawnCurrent(s), 2)),
      tone: "neutral",
    });
  }
  fallSeries.push({
    name: proposedLabel,
    data: point(stars, (s) => round(fallProposed(s))),
    tone: "info",
  });
  spawnSeries.push({
    name: proposedLabel,
    data: point(stars, (s) => round(spawnProposed(s), 2)),
    tone: "info",
  });

  updateChart(charts.fall, "fall", fallSeries);
  updateChart(charts.spawn, "spawn", spawnSeries);
  updateChart(charts.rand, "rand", [
    {
      name: "Max (+jitter)",
      data: point(stars, (s) => round(fallProposed(s) * (1 + jitterProposed(s)))),
      tone: "warning",
    },
    { name: "Mean", data: point(stars, (s) => round(fallProposed(s))), tone: "info" },
    {
      name: "Min (−jitter)",
      data: point(stars, (s) => round(fallProposed(s) * (1 - jitterProposed(s)))),
      tone: "success",
    },
  ]);

  updateLiveChartMarkers(simScore);
}

// ─── Star glyph + sim loop ──────────────────────────────────────────────────

const STAR_PATH = (() => {
  const r = 12;
  const k = r * 0.14;
  const c = r;
  return [
    `M ${c},${c - r}`,
    `Q ${c + k},${c - k} ${c + r},${c}`,
    `Q ${c + k},${c + k} ${c},${c + r}`,
    `Q ${c - k},${c + k} ${c - r},${c}`,
    `Q ${c - k},${c - k} ${c},${c - r}`,
    "Z",
  ].join(" ");
})();

function starSvg(size, rot) {
  const gradId = `sg-${Math.random().toString(36).slice(2, 8)}`;
  return `<svg class="star" width="${size}" height="${size}" viewBox="0 0 24 24" style="transform: rotate(${rot}deg)">
    <defs>
      <linearGradient id="${gradId}" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fbeaff"/>
        <stop offset="1" stop-color="#c6d7ff"/>
      </linearGradient>
    </defs>
    <path d="${STAR_PATH}" fill="url(#${gradId})" stroke="#e8c5f2" stroke-width="1.5"/>
  </svg>`;
}

const sim = {
  running: true,
  stars: [],
  score: 0,
  id: 0,
  spawnAcc: 0,
  lastReported: -1,
  scoreDisp: 0,
};

const player = {
  x: 0,
  vx: 0,
  targetVx: 0,
  target: null,
};

const playerKeys = new Set();

let simScoreForCharts = 0;

function fieldWidthPx() {
  return profile().fieldWidth;
}

function playerTop() {
  return FIELD_H - FLOOR_PAD - PLAYER_H;
}

function starCenterX(star) {
  return (star.x / 100) * fieldWidthPx();
}

function clampPlayer() {
  const w = fieldWidthPx();
  player.x = Math.max(0, Math.min(Math.max(0, w - PLAYER_W), player.x));
}

function centerPlayer() {
  player.x = fieldWidthPx() / 2 - PLAYER_W / 2;
  player.vx = 0;
  player.targetVx = 0;
  player.target = null;
  renderPlayerDom();
}

function isStarCaught(star) {
  const r = star.size / 2;
  const sx = starCenterX(star);
  const top = playerTop();
  return (
    star.y + r >= top &&
    star.y - r <= top + PLAYER_H * 0.45 &&
    sx + r > player.x - CATCH_PAD_X &&
    sx - r < player.x + PLAYER_W + CATCH_PAD_X
  );
}

function updatePlayer(dt) {
  let dir = 0;
  if (playerKeys.has("left")) dir -= 1;
  if (playerKeys.has("right")) dir += 1;

  if (dir) {
    player.target = null;
    player.targetVx = dir * PLAYER_SPEED;
  } else if (player.target !== null) {
    player.targetVx = 0;
    player.x += (player.target - PLAYER_W / 2 - player.x) * Math.min(1, POINTER_EASE * dt);
  } else {
    player.targetVx = 0;
  }

  player.vx += (player.targetVx - player.vx) * Math.min(1, VX_LERP * dt);
  if (dir || Math.abs(player.vx) > 1) player.x += player.vx * dt;
  clampPlayer();
  renderPlayerDom();
}

function renderPlayerDom() {
  const el = $("player");
  if (el) el.style.left = `${player.x}px`;
}

function pointerXInField(e) {
  const rect = $("playField").getBoundingClientRect();
  return Math.max(0, Math.min(rect.width, e.clientX - rect.left));
}

function isTypingTarget() {
  const el = document.activeElement;
  return el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA");
}

function resetSim() {
  sim.stars = [];
  sim.score = 0;
  sim.spawnAcc = 0;
  sim.lastReported = -1;
  sim.scoreDisp = 0;
  simScoreForCharts = 0;
  $("starsLayer").innerHTML = "";
  centerPlayer();
  updateStats();
  renderCharts(0);
}

function updateStats() {
  const p = profile();
  const tune = proposedTune();
  const score = sim.scoreDisp;
  const speedNow = Math.round(
    fallSpeedAt(score, tune, p.rampScore, p.speedCurve, p.speedWaves, p.speedWaveDepth, p.creepPerStar),
  );
  const spawnNow = spawnIntervalAt(
    score, tune, p.rampScore, p.spawnCurve, p.spawnWaves, p.spawnWaveDepth,
  );
  const jitterNow = jitterAt(
    score, p.rampScore, p.jitterMin, p.jitterMax, p.jitterWaves, p.jitterWaveDepth,
  );
  $("statScore").textContent = String(score);
  $("statSpeed").textContent = `${speedNow} px/s`;
  $("statSpawn").textContent = `${round(spawnNow, 2)} s`;
  $("statPerSec").textContent = String(round(1 / spawnNow, 1));
  $("statJitter").textContent = `±${round(jitterNow * 100)}%`;
}

function reportScore(score) {
  const rounded = Math.round(score);
  sim.scoreDisp = rounded;
  const published = Math.round(score * 2) / 2;
  if (published !== sim.lastReported) {
    sim.lastReported = published;
    simScoreForCharts = published;
    renderCharts(published);
  }
  updateLiveChartMarkers(score);
  updateStats();
}

function renderStarsDom() {
  const layer = $("starsLayer");
  const existing = new Map(
    [...layer.querySelectorAll(".star-wrap")].map((el) => [Number(el.dataset.id), el]),
  );
  const seen = new Set();

  for (const s of sim.stars) {
    seen.add(s.id);
    let el = existing.get(s.id);
    if (!el) {
      el = document.createElement("div");
      el.className = "star-wrap";
      el.dataset.id = String(s.id);
      el.innerHTML = starSvg(s.size, 0);
      layer.appendChild(el);
    }
    el.style.left = `${s.x}%`;
    el.style.top = `${s.y}px`;
    const svg = el.querySelector("svg");
    if (svg) svg.style.transform = `rotate(${s.rot}deg)`;
  }

  for (const [id, el] of existing) {
    if (!seen.has(id)) el.remove();
  }
}

let lastFrame = performance.now();

function tick(now) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;

  updatePlayer(dt);

  if (sim.running) {
    const p = profile();
    const tune = proposedTune();
    const score = sim.score;
    const spawn = spawnIntervalAt(
      score, tune, p.rampScore, p.spawnCurve, p.spawnWaves, p.spawnWaveDepth,
    );
    const speed = fallSpeedAt(
      score, tune, p.rampScore, p.speedCurve, p.speedWaves, p.speedWaveDepth, p.creepPerStar,
    );
    const jitterNow = jitterAt(
      score, p.rampScore, p.jitterMin, p.jitterMax, p.jitterWaves, p.jitterWaveDepth,
    );

    if (score < state.xMax) {
      sim.score = Math.min(state.xMax, score + dt / spawn);
    }

    sim.spawnAcc += dt;
    while (sim.spawnAcc >= spawn) {
      sim.spawnAcc -= spawn;
      const j = 1 + (Math.random() * 2 - 1) * jitterNow;
      sim.stars.push({
        id: sim.id++,
        x: 6 + Math.random() * 88,
        y: -STAR_PX,
        vy: speed * j,
        size: STAR_PX,
        rot: Math.random() * 360,
        spin: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 90),
      });
    }

    sim.stars = sim.stars
      .map((s) => ({ ...s, y: s.y + s.vy * dt, rot: s.rot + s.spin * dt }))
      .filter((s) => !isStarCaught(s) && s.y < FIELD_H + STAR_PX);

    renderStarsDom();
    reportScore(sim.score);
  }

  requestAnimationFrame(tick);
}

// ─── Wire UI ────────────────────────────────────────────────────────────────

function renderAll() {
  syncAllControls();
  renderCharts(simScoreForCharts);
  updateStats();
}

function wireEvents() {
  syncThemeToggle();

  on("themeToggle", "click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
    renderCharts(simScoreForCharts);
  });

  on("device", "change", (e) => {
    state.device = e.target.value;
    persist();
    renderAll();
  });

  for (const input of document.querySelectorAll("input[data-number]")) {
    bindNumberInput(input);
  }

  for (const btn of document.querySelectorAll("[data-stepper]")) {
    btn.addEventListener("click", () => {
      const input = $(btn.dataset.for);
      if (!input || input.disabled) return;
      const dir = Number(btn.dataset.stepper);
      const step = Number(input.dataset.step);
      const decimals = Number(input.dataset.decimals || 0);
      const min = Number(input.dataset.min);
      const max = Number(input.dataset.max);
      const current =
        input.dataset.key === "xMax"
          ? state.xMax
          : profile()[input.dataset.profile];
      const next = Number((current + dir * step).toFixed(decimals));
      const clamped = Math.min(max, Math.max(min, next));
      applyNumberValue(input, clamped);
      input.value = String(clamped);
    });
  }

  for (const id of ["speedCurve", "spawnCurve"]) {
    on(id, "change", (e) => {
      setProfile({ [e.target.dataset.profile]: e.target.value });
      renderAll();
    });
  }

  on("btnPlay", "click", () => {
    sim.running = !sim.running;
    $("btnPlay").textContent = sim.running ? "pause" : "play";
  });

  on("btnReset", "click", resetSim);

  const playField = $("playField");
  if (!playField) {
    console.warn("Missing #playField — sim input disabled");
  } else {
  playField.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    playField.classList.add("is-dragging");
    playField.setPointerCapture(e.pointerId);
    player.target = pointerXInField(e);
  });

  playField.addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse" || e.buttons) player.target = pointerXInField(e);
  });

  playField.addEventListener("pointerup", () => {
    playField.classList.remove("is-dragging");
  });

  playField.addEventListener("pointercancel", () => {
    playField.classList.remove("is-dragging");
  });
  }

  window.addEventListener("keydown", (e) => {
    if (isTypingTarget()) return;
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") {
      playerKeys.add("left");
      e.preventDefault();
    } else if (k === "ArrowRight" || k === "d" || k === "D") {
      playerKeys.add("right");
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") playerKeys.delete("left");
    if (k === "ArrowRight" || k === "d" || k === "D") playerKeys.delete("right");
  });

  on("btnResetDefaults", "click", () => {
    const key = state.device === "mobile" ? "mobileProfile" : "desktopProfile";
    state[key] = { ...PROFILE_DEFAULTS[state.device] };
    persist();
    renderAll();
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => updateLiveChartMarkers(simScoreForCharts), 50);
  });
}

function initApp() {
  fillCurveSelects();
  applyModeUI();
  wireEvents();
  centerPlayer();
  renderAll();
  requestAnimationFrame(tick);
}

export function startApp() {
  initApp();
}
