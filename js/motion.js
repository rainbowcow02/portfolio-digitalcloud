/**
 * Motion layer: hero entrance, scroll reveals, flower parallax, avatar pose cycle.
 *
 * Two rules govern everything here.
 *
 * 1. The page must never be blank. Reveal elements start at `opacity: 0`, but only
 *    under `html.js-motion`, which a blocking <head> script adds when JS runs and
 *    motion is allowed. If GSAP fails to load, we drop that class and bail — the
 *    page renders complete and static. (This is why we can't just early-return like
 *    initNav does; nothing there is pre-hidden, so a bare return is harmless.)
 *
 * 2. Reduced motion is enforced in JS, not CSS. The `* { transition-duration: .01ms }`
 *    rule in base.css does nothing to GSAP, which writes inline styles on a rAF
 *    ticker and never touches CSS transitions. gsap.matchMedia() is a live listener
 *    that reverts its tweens and kills its ScrollTriggers when the query flips.
 */

const REVEAL_START = { opacity: 0, y: 24 };
const REVEAL_END = { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" };

export function initMotion() {
  const root = document.documentElement;
  const showEverything = () => root.classList.remove("js-motion");

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    showEverything();
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  // iOS collapses its URL bar on scroll, which fires resize -> refresh -> trigger
  // positions recompute mid-scroll -> visible jump. The hero is 100dvh, so this bites.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: reduce)", () => {
    showEverything();
  });

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    playHeroEntrance();
    initScrollReveals();
    return showEverything;
  });

  // Parallax is desktop-only: moving a mix-blend-mode element forces the browser to
  // re-composite its whole blend group each frame, and phones don't need the depth.
  mm.add(
    "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
    () => {
      const stop = initFlowerParallax();
      return stop;
    }
  );

  // Independent of the motion scopes: a pose swap is a state change, not an
  // animation, so it stays available under reduced motion (just without the cycling).
  initAvatarPoses();
}

/* ——— Hero ——— */

/**
 * Splits the h1 into per-word masks holding per-character spans.
 *
 * Everything is expressed in % / em and nothing is measured in pixels, which makes
 * the split font-metric independent: when Inclusive Sans swaps in, the spans simply
 * reflow. That's also why the mask is per-word and not per-line — line masks would
 * need a full re-split on every resize.
 *
 * Returns the char elements, or null if the split had to be abandoned.
 */
function splitHeroName(name) {
  const text = name.textContent.trim();
  if (!text) return null;

  const originalHTML = name.innerHTML;
  const frag = document.createDocumentFragment();

  text.split(/\s+/).forEach((word, i) => {
    // a real space between words, or the inline-block words jam together
    if (i > 0) frag.appendChild(document.createTextNode(" "));

    const wordEl = document.createElement("span");
    wordEl.className = "word";

    // Built with DOM APIs on purpose: any newline between two <span class="char">
    // tags in a template string renders as a collapsed space, i.e. a visible gap
    // between every single letter.
    for (const ch of word) {
      const charEl = document.createElement("span");
      charEl.className = "char";
      charEl.textContent = ch;
      wordEl.appendChild(charEl);
    }

    frag.appendChild(wordEl);
  });

  name.replaceChildren(frag);

  // Splitting made each word an atomic inline-block, which kills the
  // `overflow-wrap: anywhere` that was the only thing keeping "Lindsay" inside the
  // page frame on a narrow phone. If it no longer fits, put the text back.
  if (name.scrollWidth > name.clientWidth + 1) {
    name.innerHTML = originalHTML;
    return null;
  }

  // Set together so the visible name and the accessible name can never desync: the
  // span tree is decorative now, and the label carries the heading's whole content.
  name.setAttribute("aria-label", text);
  name.querySelectorAll(".word").forEach((w) => w.setAttribute("aria-hidden", "true"));

  return name.querySelectorAll(".char");
}

async function playHeroEntrance() {
  const name = document.querySelector(".hero__name");
  const arrow = document.querySelector(".meta-pair__arrow");

  // Don't let the reveal play in the fallback face and then visibly reflow into
  // Inclusive Sans. The race is load-bearing: a stalled font request must not leave
  // the hero hidden forever.
  await Promise.race([
    document.fonts
      ? document.fonts
          .load('700 1em "Inclusive Sans"')
          .then(() => document.fonts.ready)
      : Promise.resolve(),
    new Promise((resolve) => setTimeout(resolve, 1200)),
  ]);

  const chars = name ? splitHeroName(name) : null;
  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

  // She pops up into frame rather than dissolving in: rising from below, overshooting
  // her resting spot, settling. The fade is a separate, much shorter tween — carried
  // by the back ease it would read as the crossfade we're trying to get away from, so
  // she's opaque a quarter of the way up and the rest is pure movement.
  tl.fromTo(
    "[data-hero-reveal='avatar']",
    { opacity: 0 },
    { opacity: 1, duration: 0.22, ease: "none" },
    0.15
  )
    .fromTo(
      "[data-hero-reveal='avatar']",
      { y: 38, scale: 0.92 },
      { y: 0, scale: 1, duration: 0.4, ease: "back.out(2.1)" },
      0.15
    )
    .fromTo(
      "[data-hero-reveal='bio']",
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.85, stagger: 0.08 },
      0.3
    );

  if (chars) {
    tl.to(chars, { y: 0, duration: 0.9, stagger: 0.035 }, 0.75);
  } else {
    // split was abandoned (name would overflow) — fade the whole h1 instead
    tl.fromTo(name, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.75);
  }

  // The meta lines are reference material, not a headline — they should arrive, not
  // perform. A long soft fade over a short rise (power1, not the timeline's power3)
  // reads as settling into place while the eye is still on the name.
  tl.fromTo(
    "[data-hero-reveal='meta']",
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 1, ease: "power1.out", stagger: 0.14 },
    1.35
  );

  if (arrow) {
    // the standing invitation to scroll — held until the meta row it sits in has
    // finished arriving, so the arrow isn't bobbing while its own line is still moving
    tl.to(
      arrow,
      {
        y: 3,
        duration: 1.2,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      },
      2.1
    );
  }
}

/* ——— Scroll reveals ——— */

function initScrollReveals() {
  // Groups stagger their children; the group itself is the trigger, so the whole
  // set animates as one gesture rather than each child firing at its own threshold.
  gsap.utils.toArray("[data-reveal-group]").forEach((group) => {
    const items = group.querySelectorAll("[data-reveal-item]");
    if (!items.length) return;

    const stagger = Number(group.dataset.revealStagger) || 0.07;

    gsap.fromTo(items, REVEAL_START, {
      ...REVEAL_END,
      stagger,
      scrollTrigger: { trigger: group, start: "top 85%", once: true },
    });

    // Each row's star pops as the row lands — the one place a bit of sparkle is
    // thematically earned rather than decorative.
    const stars = group.querySelectorAll("[data-reveal-item] .value__star");
    if (stars.length) {
      gsap.fromTo(
        stars,
        { scale: 0.8, rotate: -12 },
        {
          scale: 1,
          rotate: 0,
          duration: 0.5,
          ease: "back.out(2)",
          stagger,
          delay: 0.12,
          scrollTrigger: { trigger: group, start: "top 85%", once: true },
        }
      );
    }
  });

  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    // fromTo, never from: gsap.from() has immediateRender and re-applies its start
    // values on every ScrollTrigger.refresh(), so a resize or a late-loading image
    // flickers already-revealed elements back to opacity 0.
    gsap.fromTo(el, REVEAL_START, {
      ...REVEAL_END,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });
  });
}

/* ——— Flower parallax ——— */

/**
 * Writes ONLY a unitless progress scalar (--p, -1 → 1) onto each flower. Every bit of
 * geometry — base offset, drift amplitude, rotation — lives in CSS and stays
 * responsive.
 *
 * Deliberately not a GSAP tween on `transform`: GSAP would resolve the computed
 * matrix and write an inline transform, which outranks the stylesheet forever. The
 * hero flower's mobile override (translateY 50% -> 38%) would silently never apply
 * again, and its %-of-own-height offset would stop tracking its fluid width.
 */
function initFlowerParallax() {
  const flowers = document.querySelectorAll(".flower-decor");
  const triggers = [];

  flowers.forEach((flower) => {
    const section = flower.closest("section");
    if (!section) return;

    triggers.push(
      ScrollTrigger.create({
        trigger: section,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          flower.style.setProperty("--p", (self.progress - 0.5) * 2);
        },
      })
    );
  });

  return () => {
    triggers.forEach((t) => t.kill());
    flowers.forEach((f) => f.style.removeProperty("--p"));
  };
}

/* ——— Avatar pose cycle ——— */

/**
 * Steps the avatar through its poses on hover/focus. Hard cuts, not crossfades —
 * pixel art should snap; a dissolve reads as mushy and fights the 8-bit voice.
 *
 * Asset-agnostic: reads the pose list off `data-poses`, so adding a pose is a markup
 * change. Degrades to nothing if only the base pose is listed.
 */
function initAvatarPoses() {
  const avatar = document.querySelector("[data-poses]");
  const img = avatar?.querySelector(".hero__avatar-img");
  if (!avatar || !img) return;

  const poses = avatar.dataset.poses
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (poses.length < 2) return;

  const base = img.getAttribute("src");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Preload when the browser is idle so the first hover never flashes a blank frame.
  const preload = () => poses.forEach((src) => (new Image().src = src));
  "requestIdleCallback" in window
    ? requestIdleCallback(preload)
    : setTimeout(preload, 1000);

  let timer = null;
  let i = 0;

  const stop = () => {
    clearInterval(timer);
    timer = null;
  };

  const start = () => {
    if (timer) return;
    // one pose immediately, so a hover always feels answered
    i = (i + 1) % poses.length;
    img.src = poses[i];
    if (reduced.matches) return;

    timer = setInterval(() => {
      i = (i + 1) % poses.length;
      img.src = poses[i];
    }, 450);
  };

  const settle = () => {
    stop();
    i = 0;
    img.src = base;
  };

  avatar.addEventListener("mouseenter", start);
  avatar.addEventListener("mouseleave", settle);

  // Touch: one pose per tap, no cycling. Deliberately not keyboard-focusable — it's
  // decoration, and a tab stop that changes nothing functional is noise for keyboard
  // and screen-reader users.
  avatar.addEventListener(
    "touchstart",
    () => {
      stop();
      i = (i + 1) % poses.length;
      img.src = poses[i];
    },
    { passive: true }
  );
}
