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

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let isOpen = false;
  let stickyActive = false;
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

  function updateSticky() {
    const shouldStick = window.scrollY > 24;
    if (shouldStick === stickyActive) return;
    stickyActive = shouldStick;
    header.classList.toggle("is-sticky", stickyActive);
  }

  updateSticky();
  window.addEventListener("scroll", updateSticky, { passive: true });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 768px)").matches && isOpen) {
      setOpen(false);
    }
  });
}
