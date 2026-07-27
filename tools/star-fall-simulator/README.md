# Star fall simulator

Shared tuning core for **Catch the stars**, with two entry URLs:

| Role | URL | Audience |
|------|-----|----------|
| **Personal workspace** | [/tools/star-fall-sim-forcooking/](../star-fall-sim-forcooking/) | You only — bookmark this; not linked from the portfolio |
| **Public sandbox** | [/tools/catch-the-stars-simulator/](../catch-the-stars-simulator/) | Portfolio visitors — linked from the game section |

The old path `/tools/star-fall-simulator/` redirects to the public sandbox.

## Open locally

From the repo root:

```bash
npm run dev
```

Then visit:

- Dev workspace: [http://127.0.0.1:8765/tools/star-fall-sim-forcooking/](http://127.0.0.1:8765/tools/star-fall-sim-forcooking/)
- Public sandbox: [http://127.0.0.1:8765/tools/catch-the-stars-simulator/](http://127.0.0.1:8765/tools/catch-the-stars-simulator/)

Chart.js loads from a CDN, so you need network once.

## How the two modes differ

| | Dev (`star-fall-sim-forcooking`) | Demo (`catch-the-stars-simulator`) |
|---|----------------------------------|-------------------------------------|
| Storage | `localStorage` — persists across sessions | `sessionStorage` — resets when the tab closes |
| Export | Copy profile JSON for pasting into `js/game.js` | Hidden |
| Clear settings | Available | Hidden |
| Affects live game | Only when you manually update `js/game.js` | Never |

The live game always reads hardcoded `DESKTOP_TUNE` / `MOBILE_TUNE` in [`js/game.js`](../../js/game.js). Neither simulator mode changes gameplay at runtime.

## Dev → game workflow

1. Tune in [/tools/star-fall-sim-forcooking/](http://127.0.0.1:8765/tools/star-fall-sim-forcooking/).
2. When a proposal feels right, click **Copy profile JSON**.
3. Paste the relevant fields into `DESKTOP_TUNE` / `MOBILE_TUNE` in `js/game.js`.
4. Keep `TUNE` at the top of [`app.js`](app.js) in sync so the “Current (in game)” chart line stays accurate.

## What to tweak in code

| Want to change… | Edit… |
|---|---|
| Default mobile / desktop proposals | `PROFILE_DEFAULTS` at the top of `app.js` |
| “Current (in game)” chart baselines | `TUNE` in `app.js` (keep in sync with `js/game.js`) |
| Log shape / creep start score | `LOG_SHAPE`, `SPEED_CREEP_AFTER` in `app.js` |
| Mode copy, storage keys, UI flags | `config.js` |
| Shared page markup | `layout.html` |

## Privacy

`/tools/star-fall-sim-forcooking/` is private by convention: unlisted, `noindex`, not linked from the portfolio. Anyone who guesses the URL can still open it — there is no authentication.

## File layout

```
tools/
  star-fall-simulator/     # shared core (app.js, config.js, layout.html, layout.js, styles.css)
  star-fall-sim-forcooking/  # dev entry (sets STAR_FALL_SIM_MODE = "dev")
  catch-the-stars-simulator/ # demo entry (sets STAR_FALL_SIM_MODE = "demo")
```
