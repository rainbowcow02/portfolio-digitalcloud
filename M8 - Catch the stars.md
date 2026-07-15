Ready for review
Select text to add comments on the plan
M8 — Catch the stars
Context
The footer already has a game-shaped hole in it. index.html:661–675 holds a <section class="game"> between the contact row and the legal row, containing a static "Click or press 'space' to play" prompt and the mini-me. css/sections/game.css defines the 287px white stage card and says "the stage is where the game will mount at M8." PRD.md lists js/game.js as # pending and names M8 as the next milestone, with mechanics explicitly deferred to now. The assets exist: assets/mini-me.png (101×122 pixel art) and assets/icon-star.png (64×64, currently referenced by nothing).

This milestone fills that hole with a real game and, in passing, finally gives the header's sound toggle a job — it currently renders title="Sound (coming soon)" and does nothing.

The game: stars fall, you move the mini-me left/right to catch them. Three misses ends the round. Difficulty ramps with your score, and your personal best persists.

Design note, since this is a first game: the mechanic isn't what makes footer games addicting — the ramp, the short round, and the persistent best are. That's where the care goes. The catching itself is about 40 lines.

Decisions already made
Round loop	Endless, 3 lives. Miss a star → lose a heart. 3 misses → game over card with score vs. best.
Rendering	<canvas> for the play field. DOM for the HUD and all copy.
Extras in v1	Personal best (localStorage) + sound effects. No combo multiplier, no golden star.
Sound	Synthesized with WebAudio — no audio files, no assets/audio/. Gated on the existing header toggle, which defaults to off.
Architecture
New js/game.js exporting initGame(), registered in js/main.js alongside the existing inits. Follows the house pattern exactly: one named initX(), a document.querySelector("[data-game]") guard with an early return, data-* attributes as hooks (never classes), and a JSDoc header explaining why.

Canvas for the field, DOM for the words. The canvas draws only stars, the mini-me, and catch sparkles. Score, best, hearts, the start button and the game-over card stay DOM elements styled with existing tokens — canvas text can't easily match Inclusive Sans / IBM Plex, and DOM copy stays screen-reader-readable and updates only on change rather than every frame.

One loop, and it's GSAP's. MOTION.md:32 is pointed about not adding a second rAF loop competing with GSAP's ticker, so the game runs on gsap.ticker.add() — and only while a round is actually running. It is removed on game over, on pause, and when the footer scrolls out of view, so an idle page pays nothing. If the GSAP CDN fails, fall back to a plain requestAnimationFrame (there's no ticker to compete with in that scenario) behind a tiny startLoop(fn) / stopLoop() shim.

Fail-safe, per MOTION.md's non-negotiable. If the canvas 2D context is null, or the sprites fail to load, initGame() bails and the stage stays exactly as it looks today: static card, prompt, mini-me. Nothing about the game is required for the footer to render.

Files
File	Change
js/game.js	new — the whole game, ~220 lines
js/main.js	register initGame()
js/sound.js	expose the on/off state so game.js can read it
index.html	game section markup; sound toggle title
css/sections/game.css	canvas, HUD, the three visual states
PRD.md / MOTION.md	M8 → done; log the reduced-motion decision below
The game itself
Framerate independence is the one thing to get right. Every speed is in pixels per second, multiplied by deltaTime. Moving entities by a fixed amount per frame is the classic first-game bug — it makes the game run at double speed on a 120Hz display. Clamp dt to ~1/30s so a backgrounded tab doesn't teleport every star through the floor on return.

Canvas sizing. Backing store = CSS size × devicePixelRatio, then ctx.scale(dpr, dpr) so all game math stays in CSS pixels. Re-run on ResizeObserver. Set ctx.imageSmoothingEnabled = false — the sprites are pixel art, matching the existing image-rendering: pixelated on .game__avatar.

Play field. Cap the canvas at max-width: 640px, centered inside the full-width white card. The card stays 287px tall (a Figma value — don't fight it). This means the game plays identically on a 390px phone and a 1440px desktop, rather than becoming a different, easier game on a 1296px-wide field.

Player. { x, vx }, x = center, clamped to the field. Keyboard sets a target velocity from held ArrowLeft/ArrowRight (and A/D); actual vx lerps toward it, which costs one line and feels dramatically better than snapping. Touch sets a target x from the pointer and the player eases toward it — which means both of the mobile controls you imagined fall out of the same code: dragging steers, and tapping the left or right side pulls the mini-me that way.

Stars. { x, y, vy }, spawned on a timer at a random x, drawn ~28px. Removed when caught or when past the floor.

Collision is deliberately generous. Overlap test between the star's box and a catch band across the mini-me's head, slightly wider than the sprite. A pixel-tight hitbox feels broken to a player; a forgiving one feels good and nobody notices why.

The ramp is keyed to score, not elapsed time. Fall speed and spawn rate interpolate from caught = 0 to caught ≈ 40, then hold:

at 0 caught	at 40+ caught
fall speed	140 px/s	420 px/s
spawn interval	1.10 s	0.35 s
Per-star speed is jittered ±15% so the field doesn't fall in lockstep. Ramping on score rather than a clock is the important part: a struggling player stays in the gentle zone and a good player gets squeezed, so the game tunes itself to whoever's holding the keyboard. These six numbers are the entire feel of the game — expect to sit and tweak them, and that's the fun part.

States drive off a data-game-state attribute on the section (idle / playing / over), with CSS showing the right layer. All three states' copy lives in the DOM.

Accessibility & not hijacking the page
The prompt becomes a real control. Today it's a <p id="game-prompt"> used as the section's aria-labelledby. It becomes a <button class="game__start"> — focusable, and Enter/Space work for free — with an aria-label moving onto the section. Same copy.
Never swallow the page's keys. Arrows and space are only preventDefaulted while state === "playing", and playing is only ever reachable through an explicit click or keypress on the start button. The user has to opt in before the game touches the keyboard. Spacebar-scroll and arrow-scroll are untouched the rest of the time.
Pause aggressively: on window blur, on visibilitychange, and when an IntersectionObserver says the footer has scrolled mostly out of view. Resume when it comes back. The loop is fully detached from the ticker while paused.
Reduced motion. MOTION.md:24 makes this non-negotiable, but a game is user-initiated motion, which is the standard exception — refusing to move the stars would just mean no game. So the rule is: the falling stars and the player still move (the user pressed a button asking for exactly that), while the decorative motion — catch sparkles, star rotation — is gated off under prefers-reduced-motion: reduce, and nothing on the stage ever moves until the start button is pressed. Log this reasoning in MOTION.md; it's a judgment call and the next reader deserves it.
Whimsy pass
Reference: Josh Comeau. The lesson worth stealing isn't a feature list — it's that everything you touch responds, and it responds with sound. The whimsy is the feedback on actions you're already taking, which makes it nearly free. Concretely, in rough order of satisfaction-per-line:

The catch blip rises in pitch with each consecutive catch, and resets to the base note on a miss. Three lines. It hands you the entire dopamine curve of a combo system — the Mario coin-ladder effect — without building the combo system that was cut from scope. Do this one first.
The catch pops. The star flares and vanishes into a few sparkle particles; the mini-me does a tiny squash on impact. Canvas makes particles nearly free, which is part of why we picked it.
The score number bumps when it changes (a quick scale pulse on the DOM element — this is a --duration-fast GSAP tween, not a canvas thing).
Copy with a pulse. The game-over card picks from a small set of lines rather than always saying "Game over" — the difference between a portfolio that had a person in it and one that didn't.
An idle easter egg, budget permitting and last in line: if you leave the stage untouched, the mini-me occasionally shifts their weight. Strictly optional, and the first thing to cut.
All five are decorative, so all five are gated off under prefers-reduced-motion: reduce — unlike the falling stars, none of them were requested by pressing start.

Sound
Synthesized with WebAudio — a short square-wave blip on catch (rising in pitch per the whimsy pass above), a low thud on miss, a descending arpeggio on game over. Zero bytes downloaded, no assets/audio/ directory, and it lands squarely on the 8-bit vibe the PRD asks for. Real samples can swap in later behind the same three function calls.

Two things that will otherwise bite:

Autoplay policy. An AudioContext must be created (or .resume()d) inside a user gesture. Create it lazily on the first game start / first toggle-on, never at page load.
The toggle defaults to off (index.html:77, aria-pressed="false"). Keep it that way — a portfolio footer that starts blipping unannounced is a bug. Sound is opt-in.
js/sound.js currently only flips its own icons. Give it a tiny exported isSoundOn() (plus a CustomEvent on change) so game.js reads the state through the module instead of reaching into someone else's DOM. Update title="Sound (coming soon)" → title="Sound".

Best score: localStorage under a ctsBest key, wrapped in try/catch — Safari private mode throws on write. Shown in the HUD; the game-over card says "new best!" when beaten.

Verification
npm run dev is already bound to port 8765 — do not kill it, the PRD warns about this explicitly. Then:

Play it. Desktop and ~390px. Catch stars with arrows; drag and tap-to-side on touch. Confirm the ramp bites around 15–20 caught and that 3 misses ends the round.
Best persists — score, reload the page, confirm the best survives.
Sound — off by default; toggle on, hear catch/miss/game-over; toggle off mid-round, silence.
Keys aren't hijacked — before starting, space and arrows scroll the page normally. Only during a round do they stop.
Pause paths — tab away mid-round, scroll the footer out of view mid-round, and confirm on return that nothing teleported and no stars fell through while you were gone.
Reduced motion (macOS → Accessibility → Display → Reduce motion): the game still plays, sparkles are gone, nothing moves before you press start. Toggle it while the page is open.
Fail-safe — block the GSAP CDN in DevTools, reload: the footer card renders static with its prompt and mini-me, zero console errors.
Zero console errors, and token spot-checks — no magic numbers in game.css (MOTION.md:37 makes this a definition-of-done). Game tuning constants live in game.js, not the stylesheet.