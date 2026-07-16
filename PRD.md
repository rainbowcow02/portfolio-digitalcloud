# PRD — Lindsay Lee Portfolio (Digital Cloud)

**Status:** In progress  
**Last updated:** July 13, 2026  
**Owner:** Lindsay Lee  
**Implementation:** Plain HTML / CSS / vanilla JS + GSAP (CDN)

---

## 1. Overview

Build a personal portfolio site from the Figma desktop and mobile specs with high visual fidelity. The site should feel modern, refined, accessible, and slightly whimsical—matching the cloud/flower aesthetic without “improving” or approximating the design.

### Design sources

| Viewport | Figma |
|---|---|
| Desktop (1440) | [desktop-home](https://www.figma.com/design/LH5rB96VrwliSz35YGgEvO/Untitled?node-id=63-1272&m=dev) |
| Mobile (390) | [mobile-home](https://www.figma.com/design/LH5rB96VrwliSz35YGgEvO/Untitled?node-id=63-1536&m=dev) |

### Primary goals

1. Pixel-faithful implementation of spacing, type, and color via design tokens  
2. Responsive behavior per agreed breakpoints and section rules  
3. Reusable components for repeated patterns  
4. GSAP motion (nav drawer, later scroll/game) without adding unapproved dependencies  
5. Room to grow into case-study pages and an about page later  

---

## 2. Product decisions (locked)

| Topic | Decision |
|---|---|
| Stack (v1) | Plain HTML + CSS + vanilla JS; GSAP via CDN. No React/Vite for v1. |
| Future architecture | Simple case-study pages and an about page may be added later; revisit Vite/React only if multi-page complexity warrants it. |
| Sound | Toggle UI + WebAudio SFX for the game (catch / miss / game-over). Default **off**. Ambient MP3 still deferred. |
| Music source (later) | Prefer a licensed ambient MP3 in `/assets/audio/`. Spotify Web Playback is a poor fit for a simple ambience toggle (Premium + OAuth). |
| Game | **Catch the stars** — canvas play field, DOM HUD. Endless round, 3 lives; score-keyed ramp; site-wide best via hobby high-score API; WebAudio SFX gated on the sound toggle. No combo multiplier, no golden star. |
| Resume | [Google Drive PDF](https://drive.google.com/file/d/1mQqWUtJsV2n5Tk-uJDFnfsV9eOMg8I_J/view) — open in new tab |
| Copy | Use Figma placeholder text as-is; final copy later |
| Design values (mobile) | Show all **6** values, stacked |
| Work / side-quest / social images | Grey placeholders until final assets are supplied |
| Arrow asset | `assets/icon-arrow-down.svg` |
| Company names in bio | Semibold + stylized underline using **Lilac** |
| Spacing | 4px scale; round Figma outliers **up** to nearest multiple of 4 |

---

## 3. Design system

### 3.1 Color primitives

| Token | Hex |
|---|---|
| `--white` | `#FFFFFF` |
| `--black` | `#000000` |
| `--grey` | `#797979` |
| `--snow` | `#FCF8F8` |
| `--lavender` | `#FAE9FF` |
| `--mauve` | `#FBEAFF` |
| `--periwinkle` | `#D7E3FF` |
| `--peach` | `#F5E3DD` |
| `--lilac` | `#E8C5F2` |

Components use **semantic** tokens (e.g. `--color-text-primary`, `--color-link-underline` → lilac), not raw primitives.

### 3.2 Typography

Fonts: **Inclusive Sans** (display), **IBM Plex Sans** (body/UI), **IBM Plex Mono** (metadata secondary).

| Style | Desktop | Mobile notes |
|---|---|---|
| Display-1 | 180 | 60 (`clamp`); tracking −4% / −6% mobile |
| Display-2 | 150 | Fluid `clamp` (e.g. thank-you ~96→150) |
| Title/Lrg | 36 | 36 |
| Title/Sm | 19 | 19 |
| Subtitle | 18 | 18 |
| Body | 16 | 16 |
| Link | 15 | 15 / Medium |
| Metadata/Primary | 14 | Hero meta may use 12 on mobile per Figma |
| Metadata/Secondary | 13 | Mono; smaller on mobile hero per Figma |

### 3.3 Spacing

`--space-*` multiples of **4px** only. Outliers from Figma rounded up (e.g. 15→16, 23→24, 90→92, 130→132).

### 3.4 Breakpoints

| Name | Range |
|---|---|
| Mobile | ≤767px (design frame 390) |
| Desktop | ≥768px (design frame 1440) |

### 3.5 Interaction principles

- Visible `:focus-visible` (ink outline + lilac offset ring)  
- Nav / company links: lilac underline grows from left  
- Honor `prefers-reduced-motion`  
- Sound: `aria-pressed`, icon swap; WebAudio game SFX when on (default off)  
- Project image hover: subtle lift (when images land)  

---

## 4. Information architecture

### v1 (single page)

1. **Nav** — About, Work, Side, Resume (external), Contact + sound toggle  
2. **Hero** — Avatar, personal description, Display-1 name, scroll meta, flowers  
3. **Work** — “Snapshots of my work” project blocks (variable image counts)  
4. **Side quests** — 3 cards (Cupboard, Cute Notes, Cozy Calcifer)  
5. **Design values** — 6 principles with star icons  
6. **Footer** — thank you + Get in touch + social placeholders  
7. **Game** — Catch the stars (mini-me)  
8. **Legal footer** — © + last updated  

### Later (out of v1 critical path)

- About page  
- Case study pages  
- Real project/social imagery  
- Ambient audio on sound toggle  

---

## 5. Responsive rules (do not invent)

| Section | Desktop → Mobile |
|---|---|
| Nav | Full links → hamburger; sound always in header; sticky when scrolled; drawer mask open/close |
| Hero | Display-1 → 60px; avatar + description horizontal → vertical |
| Work | Multi-column image rows → stacked (per project layout) |
| Side quests | 3-column → 1-column stacked |
| Design values | 2-column → 1-column stacked (all 6) |
| Footer | 2-column → 1-column stacked |

### Intentional exceptions (do not “normalize”)

- Lavender/mauve page border on hero viewport  
- Oversized Display-1 name  
- Rotated “thank / you”  
- Decorative flowers overlapping content  
- Variable work image counts (3 / 2 / 3 / 1 / 3 on desktop)  

---

## 6. File structure

```
portfolio-digitalcloud/
├── PRD.md
├── index.html
├── css/
│   ├── tokens.css
│   ├── typography.css
│   ├── base.css
│   └── sections/
│       ├── nav.css
│       ├── hero.css
│       ├── work.css
│       ├── side-quests.css
│       ├── values.css
│       ├── footer.css
│       └── game.css
├── js/
│   ├── main.js
│   ├── nav.js
│   ├── sound.js
│   ├── motion.js
│   └── game.js
└── assets/                   # final filenames; no generated placeholders
```

### Components (BEM-style classes)

`SiteNav`, `NavLink`, `SoundToggle`, `SectionHeader`, `ProjectBlock`, `SideQuestCard`, `ValueRow`, `MetaPair`, `SocialIcon`, `FlowerDecor`

---

## 7. Milestones

Build **section by section**. Do not advance until the current section passes verification (desktop + ~390px, zero console errors, token spot-checks).

| # | Milestone | Status | Notes |
|---|---|---|---|
| **M0** | Plan + token/architecture approval | ✅ Done | Stack, colors, spacing, game/sound decisions locked |
| **M1** | Design tokens + base + typography | ✅ Done | `tokens.css`, `typography.css`, `base.css` |
| **M2** | Nav | ✅ Done | Sticky header; desktop links; mobile hamburger→X morph; L→R drawer open / R→L close; parallel content fade on close; sound UI only; Resume URL; drawer covers sound (no sound fade) |
| **M3** | Hero | ✅ Done | Avatar, bio + lilac company links, Display-1, meta, flowers, page border |
| **M4** | Work grid | ✅ Done | Section header + 5 project blocks (3/2/3/1/3 imgs); grey placeholders; images stack on mobile; snapshots + projects flowers |
| **M5** | Side quests | ✅ Done | Section header + 3 cards (Cupboard, Cute Notes, Cozy Calcifer); snow background; grey placeholders; stacked on mobile; side flower |
| **M6** | Design values | ✅ Done | Left header + 700px value list; all 6 ValueRows with star icons; stacks on mobile |
| **M7** | Footer + contact | ✅ Done | thank you, Get in touch, live social links (LinkedIn / GitHub / email), legal row |
| **M8** | Game (catch the stars) | ✅ Done | Canvas game in `js/game.js`: mini-me catches falling stars, 3 misses ends it, best score persisted. Card is the start button; arrows / drag to move |
| **M9** | Polish pass | ⬜ Pending | Focus states audit, reduced motion, console clean, cross-check Figma |
| **M10** | Content & assets swap | ⬜ Later | Final copy, images, optional audio file |
| **M11** | Multi-page (optional) | ⬜ Later | About + case studies |

---

## 8. Definition of done (whole build)

- [ ] All colors / spacing / type via variables—no magic numbers in component CSS  
- [ ] Responsive rules above at both breakpoints  
- [ ] No console errors or warnings  
- [ ] GSAP nav (and later motions) work; `prefers-reduced-motion` respected  
- [ ] Keyboard focus visible on all interactive elements  
- [ ] Placeholder assets clearly temporary until finals land  

---

## 9. Local development

**Recommended** — run once in your own terminal and leave it open:

```bash
cd "/Users/lindsaylee/Documents/Side Projects/portfolio-digitalcloud"
npm install   # first time only
npm run dev
```

Open: http://127.0.0.1:8765/  
`npm run dev` uses **live-server** (auto-reload on save). Use `npm start` for a plain static server without reload.

Stop: `Ctrl+C` in the terminal where the server is running.

**Fallback** (no Node): `python3 -m http.server 8765`

**Avoid** killing port 8765 while developing — that stops whichever server you started. Only free the port if something is stuck: `lsof -ti:8765 | xargs kill -9`

---

## 10. Open items / ask before guessing

| Item | Status |
|---|---|
| Final project descriptions (still `{Project}` placeholders) | Waiting on Lindsay |
| “Lowest level of detail” value body (`xxx`) | Waiting on Lindsay |
| Work / side-quest imagery | Waiting on Lindsay |
| Ambient audio file for sound toggle | Deferred |
| Exact catch-the-stars rules (scoring, difficulty) | ✅ Decided at M8 — see §2 |
| About / case-study IA | Post-v1 |

---

## 11. Changelog (implementation)

| Date | Change |
|---|---|
| 2026-07-13 | Tokens + nav scaffolded; sticky + GSAP circular reveal → L→R drawer; hamburger→X morph; sound UI; Resume link |
| 2026-07-13 | Close: parallel content fade; removed menu “Based in NYC”; drawer covers sound without sound fade animation |
| 2026-07-13 | PRD authored |
| 2026-07-13 | M3 Hero: avatar + bio, lilac company underlines, Display-1, meta pairs, flower decor, mauve page border; responsive stack |
| 2026-07-13 | M4 Work: “Snapshots of my work” + 5 ProjectBlocks; flex image rows (3/2/3/1/3) at 383×287 aspect; images stack full-width on mobile; hover lift; snapshots + projects flowers. Work has no background of its own, so the header flower spills past the hero into Work while Work's content still paints over it |
| 2026-07-13 | M5 Side quests: snow panel; centered header + 650px description; 3 SideQuestCards (Cupboard / Cute Notes / Cozy Calcifer) in a flex row that stacks on mobile; grey image placeholders with hover lift; side flower starts above the section so it spills onto Work's white background. Removed the temporary `.page-spacer` — `#side` is now a real section |
| 2026-07-13 | M6 Design values: left SectionHeader (320px) + right value list (max 700px) on desktop, stacked on mobile; 6 ValueRows with `icon-star.svg`, hairline rules between rows (top rule desktop-only per Figma); value body drops to 15px on mobile (`--text-body-mobile`); values flower crests the top edge onto the side-quests snow panel |
| 2026-07-14 | M7 Footer: snow panel with “If you’ve made it this far…” kicker + rotated thank / you (Display-2, overlapped with an em-based negative margin so the overlap tracks the fluid size), right-hand Get in touch column (490px) with 3 grey SocialIcon placeholders; legal row (© + updated) in mono. Single `<footer>` wraps contact + legal so the game can slot between them at M8. Mobile: columns stack, blurb hidden per Figma, “Get in touch” drops to 24px, icons 48px |
| 2026-07-14 | M7 legal row: space-between at both breakpoints per Figma. Only fits on mobile with Figma’s shortened label, so the markup carries both (“Last updated:” at 13px desktop / “Updated:” in Mono Medium at 12px mobile, `--text-legal-mobile`) and swaps them at the breakpoint. Bottom padding raised 20 → 36 so the row isn’t flush to the page frame. Year set to © 2026 (desktop Figma still says 2025) |

| 2026-07-14 | M7 footer synced to the updated Figma (node 63:1488): contact row bottom-aligns its columns, the Get in touch column is sized by its 360px blurb instead of a fixed 490px, gaps tighten (36 → 24, 16 → 8), and “Get in touch” drops to Title/Sm (19) |
| 2026-07-14 | M7 SocialIcons are real: LinkedIn, GitHub and a mailto, as inline `currentColor` SVGs (no new asset files, sharp at any size) centred in Figma's 48px tile, which is kept as the tap target. Hover lifts 2px; the global `:focus-visible` ring picks up the tile's 8px radius. Grey placeholders retired |
| 2026-07-14 | M8 (partial) Game placeholder: `#game` section slots between the footer contact row and the legal row, inside the footer's snow panel. White card (287px, 5px white border, 6px radius) centred on “Click or press “space” to play” (Title/Sm) above the 68×82 mini-me. No JS and no game behaviour yet — the prompt is copy, not a control, so the card is not focusable or clickable until the mechanics land |
| 2026-07-14 | M9 Motion layer (`js/motion.js`, planned in [MOTION.md](MOTION.md)): hero entrance (avatar → bio → per-letter name reveal → meta → arrow bob), scroll reveals, staggered values with a star pop, and flower parallax. **Added ScrollTrigger** from the same GSAP CDN + version pin — a first-party plugin of an already-approved library, not a new dependency; the alternative (IntersectionObserver + a hand-rolled rAF loop) can't do scrubbed parallax without reimplementing it badly. Rejected: smooth-scroll libraries (they hijack input, and translating `main` would break the fixed page frame), shaders/three.js, cursor parallax. Two structural rules: reveals' `opacity: 0` is gated on `html.js-motion` so a blocked CDN can never blank the page, and reduced motion is enforced via `gsap.matchMedia` in JS — the `!important` transition rule in base.css does nothing to GSAP. Flowers are parallaxed by writing a `--p` scalar only, never a GSAP `transform` tween, which would bake an inline transform and permanently defeat the mobile `--base-y` override |
| 2026-07-14 | M8 Game mechanics: `js/game.js` on `gsap.ticker` (rAF fallback). Stars fall, mini-me catches; 3 misses → game over; score-keyed ramp; `ctsBest` in localStorage. Sound toggle drives WebAudio blips (`js/sound.js` exports `isSoundOn()`). Pause on blur / hide / scroll-away; keys only hijacked while playing. Reduced-motion exception logged in MOTION.md — gameplay motion stays, decorative sparkles/spin/squash gate off |
| 2026-07-15 | Game Best is site-wide only (hobby high-score API + `HOUSE_BEST` floor). Removed personal `localStorage` (`ctsBest`) so the HUD never prefers a local score over the shared record |

---

*Next up: **M9 — Polish pass**.*
