# Motion & microinteraction plan

Status: **built and verified**, except the avatar poses. §6 (header retraction) was added after the original M9 scope and is also built and verified. The hero avatar is now a cutout popping out of a disc (§1), not a flat circular portrait.

**Outstanding: 3–4 avatar pose PNGs** — now as **transparent-background cutouts at the
144×350 crop** of `assets/avatar-full.png` (each with a 2× variant), not the old
circle-baked 215×215 square. The cycling machinery (`initAvatarPoses`) is still there and
still asset-agnostic, but it's dormant: `data-poses` came off `.hero__avatar` when the
cutout landed. Re-adding it isn't quite enough on its own — the hero img carries a
`srcset` now, which outranks the `src` the swap writes, so the swap has to set both.

## Context

The site is visually finished (M0–M7) but static apart from the nav drawer. This motion layer should make it feel crafted and alive to a recruiter skimming for 90 seconds — without ever slowing them down. Every decision is filtered through that: **motion serves scanning, never competes with it.**

Scope decisions made up front:

- **Avatar pose-cycling is in.** Lindsay is producing 3–4 additional pose PNGs. This is the signature whimsy moment.
- **No smooth-scroll library.** Hijacking scroll input is the fastest way to make a fast page feel slow. The "buttery" quality comes from scroll-*linked* reveals and parallax, not from fighting the trackpad.
- **No shaders / three.js / cursor trails / grain.** Nothing decorative that doesn't earn its bytes.
- **No cursor-position parallax on the flowers.** Combined with scroll parallax on the same axis it makes them feel unmoored, and on a page people scroll straight through, it's motion nobody sees.
- **Hero entrance reads top-down**, ending on the name as the payoff and the arrow inviting the scroll.

Non-negotiable: `prefers-reduced-motion` is honored, and **the page is never blank if JavaScript fails.**

---

## Architecture

One new JS module and one new dependency, both inside the stack the PRD already approves.

**Add ScrollTrigger** (`gsap@3.12.5/dist/ScrollTrigger.min.js` — same CDN and version pin as the GSAP core already in `index.html`). The PRD's "no unapproved dependencies" clause exists to block Lenis/AOS/Locomotive; it explicitly anticipates "later scroll" GSAP work. ScrollTrigger is a first-party plugin of an already-approved library, ~13KB gzip. The alternative — `IntersectionObserver` plus a hand-rolled `scroll`/`rAF` loop — cannot do scrubbed parallax without badly reimplementing ScrollTrigger on a second rAF loop competing with GSAP's ticker. Log this in the PRD decision table.

New files:

- **`js/motion.js`** — exports `initMotion()`, called from `js/main.js` alongside `initNav()` / `initSoundToggle()`.
- Motion tokens appended to `css/tokens.css` (the existing block has one easing curve and an unused `--duration-slow`; a real system needs a scale). No magic numbers in section CSS, per the PRD's definition of done.

**Reduced motion is handled in JS via `gsap.matchMedia()`, not CSS.** Critical and counterintuitive: the global `* { transition-duration: .01ms !important }` rule in `css/base.css` gives **zero** protection against GSAP, which writes inline styles on a rAF ticker and never touches CSS transitions. `gsap.matchMedia()` is a live listener that reverts every tween and kills every ScrollTrigger in its scope when the query flips — strictly better than `js/nav.js`'s read-once `matchMedia().matches`, and it doubles as the desktop/mobile gate for parallax.

### The failure gate — build this first

Reveal animations start elements at `opacity: 0`. If that lives in an unconditional CSS rule and the GSAP CDN hiccups, **the portfolio is a blank page.**

```html
<!-- index.html <head>, BEFORE the stylesheets — blocking, so it runs pre-first-paint (no flash) -->
<script>
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js-motion");
  }
</script>
```

```css
/* base.css */
html.js-motion [data-reveal],
html.js-motion [data-hero-reveal] { opacity: 0; }
```

Three failure modes, all covered. **JS off** → class never added → everything visible. **Reduced motion** → class never added → visible, zero motion. **GSAP blocked** → the class *was* added, so `initMotion()` must call `document.documentElement.classList.remove("js-motion")` *before* bailing. That last branch differs deliberately from `nav.js`'s bare `return` — a bare return is correct there (nothing is pre-hidden) and catastrophic here.

---

## 1. Hero entrance (~1.5s, heavily overlapped)

Time-based, not scroll-based — a scroll trigger at the top of the page may never fire if someone lands on `#work` via a hash link.

| At | Element | Motion |
|---|---|---|
| 0.15s | avatar disc | the *empty* lavender disc pops in: scale 0.4→1, `back.out(2.4)` 0.45s. A separate 0.24s linear fade — carried by the back ease, the fade would read as the dissolve we're trying to get away from |
| 0.60s | avatar figure | she jumps up out of the disc: yPercent 62→0, `back.out(1.7)` 0.42s. No fade at all — she starts below the disc's bottom edge, clipped out of sight, so there's nothing to dissolve |
| 0.30s | tagline | y 12px→0 + fade |
| 0.42s | bio paragraphs | 80ms stagger |
| 0.75s | **"Lindsay Lee"** | letters clip up from a per-word mask, 35ms stagger, `power3.out` 0.9s |
| 1.35s | meta pairs | y 6px→0 + a long 1s fade on `power1.out`, 140ms stagger — reference material, so it settles in rather than performing |
| 2.10s | arrow | begins a slow idle bob (2.4s loop, ~3px, `sine.inOut`), held until the meta row it sits in has finished arriving |

Mark the non-name elements `data-hero-reveal`; drive the whole thing from one GSAP timeline.

**The avatar is two elements popping in sequence, not one image arriving** — the Animaniacs gag. `.hero__avatar` is a porthole: a lavender disc with `overflow: hidden`, holding a transparent-background full-body cutout (`assets/avatar-full.png`, 144×350) that is taller than the disc and clipped by it at the thighs. The disc pops in empty, holds ~0.15s, and she jumps up through its bottom edge. **That hold is the joke** — collapse it and the two beats read as one blurry motion.

Each beat is one overshoot and nothing else. An earlier cut added a damped rotation wobble on her landing, and it was too much: the hero already has the tagline, three bio paragraphs, the name split, and the meta row all arriving inside the same two seconds, and she's the only element moving in two dimensions. A flourish on top made her compete with the name for the payoff. Snap in, settle, stop.

Three nested elements, three transform surfaces, none of them shared:

- `.hero__avatar-pop` (`data-hero-reveal="avatar"`) — GSAP scales the disc in here, not on `.hero__avatar` itself, because the inline transform GSAP leaves behind would permanently outrank the container's `:hover` scale/tilt (and its 320ms CSS transition would smear every frame GSAP wrote).
- `.hero__avatar` — the disc: circle, background, clip, `:hover`. Untouched by GSAP.
- `.hero__avatar-figure` (`data-hero-reveal="avatar-figure"`) — the cutout's surface. It's centered with a negative margin rather than `translateX(-50%)`, since GSAP owns its `transform` during the pop and would overwrite it. If a rotation ever comes back here, set a `transform-origin` first: the default pivot is her center, and her feet — the other obvious choice — hang well below the disc, so rotating about either swings her head *sideways across the porthole* rather than tilting it. The pivot has to sit near the rim, around her hips.

Note that this inverts the constraint the previous version of this section called a dead end: an img moving *inside* the container gets clipped by its circular `overflow: hidden`. That clip is now the whole effect.

### Splitting the h1

`index.html` renders the name as a single text node: `<h1 class="hero__name type-display-1">Lindsay Lee</h1>`. Split it in JS into `<span class="word">` (the mask), each holding `<span class="char">`. Four traps, all real:

**Baseline shift.** Per CSS 2.1 §10.8.1, an inline-block whose `overflow` is not `visible` uses its *bottom margin edge* as its baseline. The moment you add `overflow: hidden` to `.word`, every word's baseline jumps, the line box grows, and the h1 shifts down the instant JS runs. Fix with `vertical-align: top`.

**Descender clipping.** "Lindsay" has a `y`. Compensate with padding that grows the mask without moving layout:

```css
.hero__name .word {
  display: inline-block;
  overflow: hidden;
  vertical-align: top;                        /* kills the baseline quirk */
  --mask-pad: 0.18em;
  padding-bottom: var(--mask-pad);
  margin-bottom: calc(-1 * var(--mask-pad));  /* mask grows, layout doesn't */
}
.hero__name .char {
  display: inline-block;
  transform: translateY(calc(100% + var(--mask-pad)));  /* provably clear of the mask */
}
```

`translateY(110%)` is *not* enough once the padding exists — a sliver of an ascender-heavy glyph peeks through. The `calc()` is exact, with no font-metric guessing.

**Keep everything in `%`/`em`, never measured pixels.** That makes the split font-metric-independent: when Inclusive Sans swaps in, the spans just reflow. No re-split on resize, ever. (This is the decisive reason to mask per *word* rather than per *line* — line masks need a full re-split on every resize.)

**`overflow-wrap: anywhere` goes inert after the split** — atomic inline-blocks offer no intra-word break opportunity. Today that rule is the only thing stopping "Lindsay" at its `clamp()`'d 60px from punching out of the frame on a 320px phone. Guard: after splitting, if `h1.scrollWidth > h1.clientWidth + 1`, restore the original text node and fall back to a plain fade of the whole h1.

Build the span tree with DOM APIs (`createElement` / `textContent`), **not** a formatted template string — newlines between `<span class="char">` tags render as visible gaps between every letter. Insert an explicit `createTextNode(" ")` *between* words or they jam together.

Gate the reveal on the font, with a timeout that can never leave the hero hidden:

```js
await Promise.race([
  document.fonts.load('700 1em "Inclusive Sans"').then(() => document.fonts.ready),
  new Promise((r) => setTimeout(r, 1200)),
]);
```

Accessibility: set `aria-label="Lindsay Lee"` on the h1 and `aria-hidden` on the span tree **in the same function as the split**, so they can't desynchronize. If JS never runs, the plain `<h1>Lindsay Lee</h1>` in the source is already correct — so don't put the label in the markup.

---

## 2. Avatar pose cycle — the whimsy moment

**Assets needed:** 3–4 additional poses at the same 215×215 crop as `assets/Avatar.png` (e.g. `avatar-2.png` … `avatar-4.png`).

On hover/focus of `.hero__avatar`, step through the poses — a **hard cut every ~450ms**, not a crossfade. Pixel art should snap; a dissolve reads as mushy and fights the 8-bit voice. Preload all poses on idle so the first hover doesn't flash. On mouse-out, ease back to the base pose rather than stopping mid-cycle — it should feel like she settles. Pair it with a small `scale(1.03)` and a ±1.5° tilt so the container has life even before the pose lands.

Implement via a `data-poses` attribute on `.hero__avatar` listing the image paths, so the JS is asset-agnostic and adding a fifth pose is a markup change. Touch devices: fire one pose change on tap. Reduced motion: no cycling, static base pose.

---

## 3. Links — the highlighter

The best-value microinteraction on the page, and it's already half-built. `.company-link` paints its lilac underline as a `background-image` gradient at `background-size: 100% 2px`, anchored bottom-left, thickening to `3px` on hover.

Change: on hover/focus, **swell the fill** — a real highlighter stroke rising up behind the text, `--duration-med`, `--ease-out`. Hold the text still; only the ink moves.

Two fill heights, because the ink grows from the bottom of the *background box* and the two link types don't put that box in the same place. Nav links carry 4px of vertical padding, which drops their box clear of the glyphs, so `--link-underline-hover: 0.72em` tops out around a third of the x-height. An inline `.company-link` has no padding — its box bottom sits just under the baseline — so the same 0.72em swallows the entire lowercase and the sentence stops being readable mid-hover. `--link-underline-hover-inline: 0.52em` lands its top edge in the same visual place (measured: ink top 4.3px above a 8.4px x-height). Match the *look*, not the number.

Apply the same treatment to `.nav-link` / `.nav-overlay__link` (currently a `scaleX(0)→scaleX(1)` bar in `css/sections/nav.css`) so all three link treatments finally speak one language: **grow from left, swell in height.** This is where "high craft" is legible in half a second.

---

## 4. Scroll reveals

`data-reveal` on section headers, `.project` blocks, `.side-quest` cards, and `.value` rows. `data-reveal-group` on containers whose children should stagger.

- Default: `opacity 0→1`, `y 24px→0`, 0.7s `power2.out`, trigger `top 85%`, `once: true`.
- **Values rows stagger at 70ms**, and each row's `icon-star.svg` gets a small pop (`scale 0.8→1` plus a few degrees of rotation) as its row lands — the one place a bit of sparkle is thematically earned.
- Side-quest cards: same, 90ms stagger.
- Work project blocks reveal individually (they're tall; a stagger across them would never be seen at once).

**Use `fromTo`, never `from`.** `gsap.from()` with a ScrollTrigger has `immediateRender: true` and re-applies its start values on every `ScrollTrigger.refresh()` — so a resize or a late image load flickers already-revealed elements back to `opacity: 0`. This is the single most common reveal-on-scroll bug in GSAP codebases.

---

## 5. Flower parallax

The subtlest thing here and the easiest to get wrong.

Every `.flower-decor` is an `<img>` with `mix-blend-mode: multiply`, and `.flower-decor--header` already carries `transform: translateY(50%) rotate(-5deg)` — **with a different value at the ≤767px breakpoint**.

**Do not let GSAP tween `transform` on these.** GSAP resolves the computed matrix and writes an *inline* `transform`, which permanently outranks the stylesheet — the mobile `translateY(38%)` override would silently never apply again, and the `%`-of-own-height base offset would stop tracking the responsive `width: min(600px, 52vw)`. A wrapper div is also out: a transformed wrapper becomes a new isolation group and is a known source of WebKit blend flicker.

Instead, **JS writes only a unitless progress scalar; all geometry stays in CSS.**

```css
.flower-decor { --p: 0; --drift: 0px; }   /* --p written by motion.js, −1 → 1 */

.flower-decor--header {
  --base-y: 50%;
  --drift: 90px;
  transform: translateY(calc(var(--base-y) + var(--p) * var(--drift))) rotate(-5deg);
}

@media (max-width: 767px) {
  .flower-decor--header {
    --base-y: 38%;   /* the ONLY thing that changes — transform is untouched */
    --drift: 40px;
  }
}
```

This also *removes* existing duplication (the `rotate(-5deg)` is currently declared twice and waiting to drift out of sync) and makes every flower's amplitude tunable from the stylesheet.

The parallax itself needs no GSAP tween at all — a direct scroll→value map is what parallax *is*:

```js
ScrollTrigger.create({
  trigger: section, start: "top bottom", end: "bottom top",
  onUpdate: (self) => el.style.setProperty("--p", (self.progress - 0.5) * 2),
});
```

Gate it to `(min-width: 768px) and (prefers-reduced-motion: no-preference)` via `gsap.matchMedia`. Moving a `multiply` element forces a re-composite of its whole blend group each frame, so keep `--drift` modest and keep it off phones.

Add `ScrollTrigger.config({ ignoreMobileResize: true })` from day one — `.hero` is `min-height: 100dvh`, and iOS URL-bar collapse fires `resize` → refresh → a visible mid-scroll jump.

---

## 6. Header retraction

The page frame already claims 16px + safe-area on every edge, and the fixed header claims 74–76px more at the top. So the header retracts on scroll-down and returns on scroll-up, leaving the frame as the only permanent chrome. Built in `js/nav.js` (**not** `motion.js`) as a CSS class toggle — no GSAP, no second rAF loop, and no dependency on ScrollTrigger having loaded. If the GSAP CDN dies, `initNav()` bails early and the header simply never hides, which is the safe failure.

**It extends the one passive `scroll` listener that already drove `.is-sticky`**, rAF-coalesced, rather than adding a second.

### Direction hysteresis is the whole thing

Never act on a single event's delta. `onScroll` accumulates travel in the current direction and zeroes the accumulator whenever the direction flips: **12px** of downward travel to retract, **6px** of upward travel to return. Without this, trackpad jitter and iOS momentum wobble flip the header several times a second and it reads as broken. The asymmetry is deliberate — leaving should feel considered, returning should feel eager.

Force-show cases outrank the delta logic entirely: drawer open, reduced motion, within 120px of the top, and during an anchor scroll. At the **bottom** of the document the header *holds* whatever state it's in — rubber-banding at the extreme fabricates deltas in both directions, and neither should be allowed to flip it.

### The fade is the exit — the transform is not

**The single most counterintuitive thing here.** The header animates `opacity` and `transform` together, and the opacity finishes at ~60% of the slide. Once it hits 0 the header is gone; the remaining travel happens unseen. That means:

> **`--duration-chrome-fade` is the number the eye times, not `--duration-chrome-out`. Slowing the transform alone changes nothing anyone can see.**

This was learned the hard way — the exit's transform was doubled with zero perceived effect, because the fade was still bound to the shared `--duration-med`. Keep the fade at roughly 60% of the slide: push it much closer and you start *watching* the header labour off-screen, which reads as sluggish rather than relaxed.

The fade also does real work. The sticky header is an opaque 0.88 white slab, so a pure translate would drag that slab up across the content. Fading it means it dissolves where it stands — the same "content dissolves out of the frame" move as `.hero__border::after`. Fade `opacity`, **never** `backdrop-filter`: blur doesn't interpolate cleanly, but element opacity fades the backdrop-filter result for free and stays composite-only.

### Desktop and mobile get different numbers, on purpose

|  | desktop | mobile (≤767px) |
|---|---|---|
| `--duration-chrome-fade` | 560ms | 320ms |
| `--duration-chrome-out` | 900ms | 620ms |
| `--duration-chrome-in` | 640ms | 440ms |

Same motion, different *exposure*. A touch fling keeps content ripping past while the header dissolves, camouflaging it. A mouse wheel teleports one notch and stops dead, leaving the identical dissolve fully exposed against a static page — where it looks hurried. Do not collapse these into one compromise set; it suits neither.

Both use `--ease-soft`, not the site's `--ease-out`. `--ease-out` is an expo curve that bolts off the line and decelerates hard: perfect at `--duration-fast` for hovers, but stretched past half a second it reads as "darts, then hangs."

### Two traps

**`--header-height` is wrong on desktop.** It claims `64px`; the header renders at **74px** (the hamburger is `display: none` there, so the 30px sound toggle sets the height, not the 40px icon the token's comment assumes). Mobile's `76px` override is correct. The retraction sidesteps this with `translateY(-100%)` — self-referential, so it's right on every breakpoint and every notch with no number to maintain. Anything that genuinely needs the height reads `--header-h`, which `nav.js` measures onto `:root` via a `ResizeObserver`. **The stale token is still consumed by `hero.css` and is a latent bug.**

**No `visibility: hidden` on the retracted header** — it would pull the nav links out of the tab order and a keyboard user could never reach them. They stay focusable, and a `focusin` listener reveals the header instead.

`html { scroll-padding-top }` (added in `base.css`, reading `--header-h`) fixes a bug that predated all this: with a fixed header and no scroll-padding, anchor targets already landed underneath it.

---

## Files

| File | Change |
|---|---|
| `js/motion.js` | **new** — `initMotion()`, `splitHeroName()`, `initAvatarPoses()`, `gsap.matchMedia` scopes |
| `js/main.js` | register `initMotion()` |
| `index.html` | ScrollTrigger CDN tag; inline `js-motion` head script; `data-reveal` / `data-reveal-group` / `data-hero-reveal` hooks; `data-poses` on the avatar |
| `css/tokens.css` | motion scale: `--ease-out-expo`, `--ease-spring`, `--duration-xslow`, `--stagger-tight` / `--stagger-loose`. Later: `--ease-soft` and the `--duration-chrome-*` set (§6), split desktop/mobile |
| `css/base.css` | `html.js-motion [data-reveal] { opacity: 0 }` gate. Later: `scroll-padding-top` (§6) |
| `css/sections/hero.css` | `.word` / `.char` mask rules; var-composed flower transform; avatar hover; highlighter on `.company-link` |
| `css/sections/nav.css` | highlighter treatment on nav links. Later: `.site-header.is-hidden` (§6) |
| `js/nav.js` | **§6** — hide-on-scroll folded into the existing sticky scroll listener |
| `css/sections/work.css`, `side-quests.css`, `values.css` | var-composed flower transforms; reveal-safe base styles |
| `assets/avatar-2…4.png` | **new art needed** |

---

## Do not do — landmines

- **Never put a `transform`, `filter`, or `will-change` on `body`, `main`, or any common ancestor.** It would become the containing block for fixed descendants — the `.hero__border` page frame (`position: fixed; z-index: 220`) would start scrolling with the content, and the sticky header would detach. This is also precisely why any translate-based smooth-scroll library was a non-starter.
- **Don't remove `html { scroll-behavior: smooth }`** — the nav anchors depend on it. It's harmless alongside scrub/reveal triggers; it only conflicts with `pin`/`snap`, which this plan doesn't use.
- Every future project image needs `width`/`height` attributes or an `aspect-ratio` box, or it lands late and stales the trigger positions below it. `.project__img` already has `aspect-ratio: 383/287` — keep images inside it.
- Worth a code comment: `mix-blend-mode: multiply` on the flowers is currently a near-no-op (white/transparent backdrops); it only bites where a flower overlaps the `.side-quests` snow panel. The day anyone gives `.work` a background, the flowers will change appearance for no obvious reason.
- **Don't reach for a smooth-scroll library to make motion feel calmer.** It comes up because mobile's inertia makes everything read as more blended than a mouse wheel does — but hijacking wheel input across the whole page to fix the pacing of one 74px bar is wildly disproportionate, and it fights the 90-second skim this page exists for. The same feel is reachable by tuning durations (§6). See also the containing-block landmine above: a translate-based library would break the frame outright.
- **To make a fade + move feel slower, slow the *fade*.** Once opacity reaches 0 the element is gone and any remaining transform runs invisibly, so lengthening the transform alone changes nothing a viewer can perceive. This is not obvious and it has already cost one wasted round (§6).

---

## Verification

1. `npm run dev` → `http://127.0.0.1:8765/` (live-server; **don't kill port 8765**).
2. **Hero:** hard-reload several times. The name reveal must never play in the fallback font, must never leave letters clipped, and must never shift the h1 vertically. Check "Lindsay" doesn't overflow the frame at 320px.
3. **Failure gate (do this deliberately):** block the GSAP CDN in DevTools → Network. The page must render **fully visible and static**, with no console errors. Then disable JS entirely → same result. This is the test that matters most.
4. **Reduced motion:** macOS System Settings → Accessibility → Display → Reduce motion. Everything visible, nothing animates, parallax off. Toggle it *while the page is open* — `gsap.matchMedia` should revert live.
5. **Breakpoints:** confirm the hero flower sits correctly at 1440 and 768, and that the mobile `--base-y: 38%` still applies after parallax has run — inspect the element and confirm **no inline `transform`** was written, only `--p`.
6. **Parallax overlap:** the hero flower hangs into `.work` by design. Push it 90px further and confirm it doesn't crowd the first project block at 1440 and 768.
7. **Perf:** DevTools Performance, scroll the full page — hold 60fps. Watch for paint spikes over the `.side-quests` snow panel, where the multiply blend actually does work.
8. **Keyboard:** tab through. Focus rings intact, avatar poses cycle on focus, links highlight on `:focus-visible`, and no reveal traps focus inside an invisible element.
