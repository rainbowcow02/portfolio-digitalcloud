# Motion & microinteraction plan

Status: **planned, not yet built.** Slots into M8/M9 of [PRD.md](PRD.md).

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
| 0.15s | avatar | scale 0.94→1 + fade, `power3.out` |
| 0.30s | tagline | y 12px→0 + fade |
| 0.42s | bio paragraphs | 80ms stagger |
| 0.75s | **"Lindsay Lee"** | letters clip up from a per-word mask, 35ms stagger, `power3.out` 0.9s |
| 1.30s | meta pairs | fade in |
| 1.45s | arrow | begins a slow idle bob (2.4s loop, ~3px, `sine.inOut`) |

Mark the non-name elements `data-hero-reveal`; drive the whole thing from one GSAP timeline.

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

Change: on hover/focus, **swell the fill to ~0.72em** — a real highlighter stroke rising up behind the text, `--duration-med`, `--ease-out`. Add `mix-blend-mode: multiply` **on the background layer** so the lilac reads like translucent marker ink over the black glyphs rather than a flat block behind them. Hold the text still; only the ink moves.

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

## Files

| File | Change |
|---|---|
| `js/motion.js` | **new** — `initMotion()`, `splitHeroName()`, `initAvatarPoses()`, `gsap.matchMedia` scopes |
| `js/main.js` | register `initMotion()` |
| `index.html` | ScrollTrigger CDN tag; inline `js-motion` head script; `data-reveal` / `data-reveal-group` / `data-hero-reveal` hooks; `data-poses` on the avatar |
| `css/tokens.css` | motion scale: `--ease-out-expo`, `--ease-spring`, `--duration-xslow`, `--stagger-tight` / `--stagger-loose` |
| `css/base.css` | `html.js-motion [data-reveal] { opacity: 0 }` gate |
| `css/sections/hero.css` | `.word` / `.char` mask rules; var-composed flower transform; avatar hover; highlighter on `.company-link` |
| `css/sections/nav.css` | highlighter treatment on nav links |
| `css/sections/work.css`, `side-quests.css`, `values.css` | var-composed flower transforms; reveal-safe base styles |
| `assets/avatar-2…4.png` | **new art needed** |

---

## Do not do — landmines

- **Never put a `transform`, `filter`, or `will-change` on `body`, `main`, or any common ancestor.** It would become the containing block for fixed descendants — the `.hero__border` page frame (`position: fixed; z-index: 220`) would start scrolling with the content, and the sticky header would detach. This is also precisely why any translate-based smooth-scroll library was a non-starter.
- **Don't remove `html { scroll-behavior: smooth }`** — the nav anchors depend on it. It's harmless alongside scrub/reveal triggers; it only conflicts with `pin`/`snap`, which this plan doesn't use.
- Every future project image needs `width`/`height` attributes or an `aspect-ratio` box, or it lands late and stales the trigger positions below it. `.project__img` already has `aspect-ratio: 383/287` — keep images inside it.
- Worth a code comment: `mix-blend-mode: multiply` on the flowers is currently a near-no-op (white/transparent backdrops); it only bites where a flower overlaps the `.side-quests` snow panel. The day anyone gives `.work` a background, the flowers will change appearance for no obvious reason.

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
