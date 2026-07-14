/**
 * Sticky header + mobile nav drawer reveal (GSAP).
 * Open: panel grows left → right. Close: content fades out while panel collapses R→L.
 */
export function initNav() {
  const header = document.querySelector("[data-site-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const overlay = document.querySelector("[data-nav-overlay]");
  const overlayLinks = document.querySelectorAll("[data-nav-overlay-link]");

  if (!header || !toggle || !overlay || typeof gsap === "undefined") return;

  // Live, not a one-shot .matches read: the hide-on-scroll behaviour below has to be able
  // to un-pin itself the moment someone turns Reduce Motion off (and vice versa) without a
  // reload, the way js/motion.js's gsap.matchMedia() scopes already do.
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduceMotion = reduceMotionQuery.matches;
  let isOpen = false;
  let linksTween = null;

  const drawerTl = gsap.timeline({
    paused: true,
    onReverseComplete: () => {
      overlay.classList.remove("is-open");
      gsap.set(overlay, { visibility: "hidden", pointerEvents: "none" });
    },
  });

  drawerTl
    .set(overlay, { visibility: "visible", pointerEvents: "auto" })
    .fromTo(
      overlay,
      { clipPath: "inset(0 100% 0 0)" },
      {
        clipPath: "inset(0 0% 0 0)",
        duration: reduceMotion ? 0.01 : 0.55,
        ease: "power3.inOut",
      }
    );

  function animateLinksIn() {
    linksTween?.kill();
    linksTween = gsap.fromTo(
      overlayLinks,
      { opacity: 0, x: -16 },
      {
        opacity: 1,
        x: 0,
        duration: reduceMotion ? 0.01 : 0.4,
        stagger: reduceMotion ? 0 : 0.05,
        ease: "power2.out",
        delay: reduceMotion ? 0 : 0.18,
      }
    );
  }

  function animateLinksOut() {
    linksTween?.kill();
    linksTween = gsap.to(overlayLinks, {
      opacity: 0,
      x: -8,
      duration: reduceMotion ? 0.01 : 0.2,
      stagger: 0,
      ease: "power1.in",
    });
  }

  function setOpen(nextOpen) {
    isOpen = nextOpen;
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    toggle.classList.toggle("is-open", isOpen);
    header.classList.toggle("is-nav-open", isOpen);
    document.body.classList.toggle("is-nav-open", isOpen);
    overlay.setAttribute("aria-hidden", String(!isOpen));

    if (isOpen) {
      // Drop .is-hidden rather than relying on .is-nav-open to out-specify it, or closing
      // the drawer would snap the header straight back out of view.
      reveal();
      overlay.classList.add("is-open");
      drawerTl.play(0);
      animateLinksIn();
      const sound = document.querySelector("[data-sound-toggle]");
      sound?.setAttribute("aria-hidden", "true");
      sound?.setAttribute("tabindex", "-1");
      const firstLink = overlay.querySelector(".nav-overlay__link");
      firstLink?.focus({ preventScroll: true });
    } else {
      // Fade content out immediately while drawer collapses — feels snappier
      animateLinksOut();
      drawerTl.reverse();
      const sound = document.querySelector("[data-sound-toggle]");
      sound?.removeAttribute("aria-hidden");
      sound?.removeAttribute("tabindex");
      toggle.focus({ preventScroll: true });
    }
  }

  toggle.addEventListener("click", () => setOpen(!isOpen));

  overlayLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (link.target === "_blank") return;
      setOpen(false);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isOpen) {
      setOpen(false);
    }
  });

  /* ——— Sticky material + hide-on-scroll ———
     The page frame already claims 16px + safe-area on every edge; the header claims
     74–76px more. Retracting it on scroll-down hands that back, and any scroll-up
     returns it. One passive listener, rAF-coalesced, drives both the frost and the
     retraction — ScrollTrigger already owns a rAF ticker (see MOTION.md), so this
     schedules work on scroll rather than running a second loop alongside it. */

  const STICKY_AFTER = 24; // px scrolled before the header frosts
  const HIDE_AFTER = 120; // px: never retract this close to the top of the page
  const INTENT_DOWN = 12; // px of accumulated downward travel before retracting
  const INTENT_UP = 6; // px of upward travel before revealing — lower, so it feels eager
  const SETTLE_MS = 700; // how long to pin the header for; also the scrollend fallback

  let stickyActive = false;
  let hidden = false;
  let lastY = Math.max(0, window.scrollY);
  let intent = 0; // signed accumulator, zeroed whenever the scroll direction flips
  let ticking = false;
  let pinUntil = 0; // timestamp: suppress auto-hide until a programmatic scroll settles

  function setHidden(next) {
    if (next === hidden) return;
    hidden = next;
    header.classList.toggle("is-hidden", hidden);
  }

  function reveal(pinMs = 0) {
    intent = 0;
    setHidden(false);
    if (pinMs) pinUntil = Math.max(pinUntil, performance.now() + pinMs);
  }

  function onScroll() {
    // clamp: iOS reports a negative scrollY while rubber-banding past the top
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;

    const shouldStick = y > STICKY_AFTER;
    if (shouldStick !== stickyActive) {
      stickyActive = shouldStick;
      header.classList.toggle("is-sticky", stickyActive);
    }

    // Rubber-banding at the bottom fabricates deltas in both directions, so hold whatever
    // state the header is already in rather than letting the wobble toggle it. Scrolling up
    // is the only thing that brings the header back, and that leaves this region at once.
    const atBottom =
      y + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atBottom && !reduceMotion && !isOpen && performance.now() >= pinUntil) {
      intent = 0;
      return;
    }

    // Force-show cases outrank the delta logic entirely. reveal() also zeroes the
    // accumulator, so travel banked inside one of these regions can't fire the instant
    // we leave it.
    if (reduceMotion || isOpen || y <= HIDE_AFTER || performance.now() < pinUntil) {
      reveal();
      return;
    }

    if (delta === 0) return;

    // Direction hysteresis — the whole reason this feels deliberate rather than twitchy.
    // Acting on a single event's delta flips the header several times a second under
    // trackpad jitter and iOS momentum wobble. Requiring *accumulated* travel in one
    // direction makes it respond to intent instead of to noise.
    if (Math.sign(delta) !== Math.sign(intent)) intent = 0;
    intent += delta;

    if (intent > INTENT_DOWN) setHidden(true);
    else if (intent < -INTENT_UP) setHidden(false);
  }

  function requestTick() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onScroll();
    });
  }

  onScroll();
  window.addEventListener("scroll", requestTick, { passive: true });

  // A retracted header keeps its links focusable on purpose (no visibility: hidden, or a
  // keyboard user could never reach the nav at all) — so tabbing into it has to bring it
  // back, otherwise focus lands on an invisible link somewhere above the viewport.
  header.addEventListener("focusin", () => reveal(SETTLE_MS));

  // Anchor nav. html carries scroll-behavior: smooth, so clicking "Work" scrolls *down* —
  // which would trip the retraction the user just asked to scroll past, and land the
  // section under a header caught mid-flight. Pin it until the smooth scroll settles.
  document.addEventListener("click", (event) => {
    if (event.target.closest?.('a[href^="#"]')) reveal(SETTLE_MS);
  });
  window.addEventListener("hashchange", () => reveal(SETTLE_MS));
  // ends the pin exactly where SETTLE_MS only guesses; absent in Safari, hence the timeout
  window.addEventListener("scrollend", () => {
    pinUntil = 0;
  });

  reduceMotionQuery.addEventListener("change", (event) => {
    reduceMotion = event.matches;
    // never leave the header stranded off-screen when the preference flips on
    if (reduceMotion) reveal();
  });

  /* Feeds html { scroll-padding-top } in base.css. Measured rather than read from
     --header-height because that token is wrong: it says 64px against a rendered 74px on
     desktop, and it can't see --safe-top. Measuring also tracks the 768px breakpoint for
     free. Height is unaffected by the retraction — translate and opacity don't touch the
     border box — so this keeps reporting the real height while the header is away. */
  function measureHeader() {
    const { height } = header.getBoundingClientRect();
    document.documentElement.style.setProperty("--header-h", `${Math.round(height)}px`);
  }

  measureHeader();
  new ResizeObserver(measureHeader).observe(header);

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 768px)").matches && isOpen) {
      setOpen(false);
    }
  });
}
