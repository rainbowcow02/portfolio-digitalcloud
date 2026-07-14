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
| Sound | Build toggle UI only. Default **off**. Audio wiring deferred. |
| Music source (later) | Prefer a licensed ambient MP3 in `/assets/audio/`. Spotify Web Playback is a poor fit for a simple ambience toggle (Premium + OAuth). |
| Game | **Catch the stars** — mini-me character + star assets; vibe-code a simple 8-bit style game inspired by playful easter eggs (e.g. Notion `/dev`). Exact mechanics TBD at game milestone. |
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
- Sound: `aria-pressed`, icon swap, no audio yet  
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
│       ├── hero.css          # pending
│       ├── work.css          # pending
│       ├── side-quests.css   # pending
│       ├── values.css        # pending
│       ├── footer.css        # pending
│       └── game.css          # pending
├── js/
│   ├── main.js
│   ├── nav.js
│   ├── sound.js
│   └── game.js               # pending
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
| **M3** | Hero | ⬜ Next | Avatar, bio + lilac company links, Display-1, meta, flowers, page border |
| **M4** | Work grid | ⬜ Pending | Section header + project blocks; image placeholders; responsive stacking |
| **M5** | Side quests | ⬜ Pending | 3 cards; snow background; flowers |
| **M6** | Design values | ⬜ Pending | 2-col → stack; all 6 values; star icons |
| **M7** | Footer + contact | ⬜ Pending | thank you, Get in touch, social placeholders, legal row |
| **M8** | Game (catch the stars) | ⬜ Pending | mini-me + stars; Space/click to play; simple scoring |
| **M9** | Polish pass | ⬜ Pending | Focus states audit, reduced motion, console clean, cross-check Figma |
| **M10** | Content & assets swap | ⬜ Later | Final copy, images, social icons/URLs, optional audio file |
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

```bash
cd "/Users/lindsaylee/Documents/Side Projects/portfolio-digitalcloud"
python3 -m http.server 8765
```

Open: http://127.0.0.1:8765/  
Stop: `Ctrl+C`  
Free port if needed: `lsof -ti:8765 | xargs kill -9`

---

## 10. Open items / ask before guessing

| Item | Status |
|---|---|
| Final project descriptions (still `{Project}` placeholders) | Waiting on Lindsay |
| “Lowest level of detail” value body (`xxx`) | Waiting on Lindsay |
| Social icon assets + URLs | Waiting on Lindsay |
| Work / side-quest imagery | Waiting on Lindsay |
| Ambient audio file for sound toggle | Deferred |
| Exact catch-the-stars rules (scoring, difficulty) | Decide at M8 |
| About / case-study IA | Post-v1 |

---

## 11. Changelog (implementation)

| Date | Change |
|---|---|
| 2026-07-13 | Tokens + nav scaffolded; sticky + GSAP circular reveal → L→R drawer; hamburger→X morph; sound UI; Resume link |
| 2026-07-13 | Close: parallel content fade; removed menu “Based in NYC”; drawer covers sound without sound fade animation |
| 2026-07-13 | PRD authored |

---

*Next up: **M3 — Hero**.*
