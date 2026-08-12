document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("carousel-track");
  const slides = Array.from(track.querySelectorAll(".carousel-slide"));
  const images = slides.map((slide) => slide.querySelector(".carousel-image"));
  const titleEl = document.getElementById("image-title");
  const counterEl = document.getElementById("image-counter");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const viewAllBtn = document.getElementById("view-all-btn");
  const portfolioOverlay = document.getElementById("portfolio-overlay");
  const contactOverlay = document.getElementById("contact-overlay");
  const overlayGrid = document.getElementById("overlay-grid");
  const contactContent = document.getElementById("contact");
  const portfolioLink = document.getElementById("portfolio-link");
  const contactLink = document.getElementById("contact-link");
  const imageStage = document.querySelector(".image-stage");
  const siteHeader = document.querySelector(".site-header");
  const siteFooter = document.querySelector(".site-footer");
  const flashEl = document.getElementById("viewfinder-flash");

  const total = slides.length;
  const flashInMs = 45;
  const flashOutMs = 320;

  let currentIndex = 0;
  let targetIndex = 0;
  let isAnimating = false;
  let flashTimer = null;
  let touchStartX = 0;
  let touchCurrentX = 0;
  let activeOverlay = null;

  function normalizeIndex(index) {
    return ((index % total) + total) % total;
  }

  function getTitleFromAlt(alt) {
    return alt && alt.trim() ? alt.trim() : "";
  }

  function isAnyOverlayOpen() {
    return activeOverlay !== null;
  }

  function ensureImageLoaded(index) {
    const img = images[normalizeIndex(index)];
    if (!img || img.dataset.loaded === "true") return;

    const src = img.getAttribute("src") || img.dataset.src;
    if (!src) return;

    if (!img.getAttribute("src")) {
      img.src = src;
    }

    img.dataset.loaded = "true";
  }

  function preloadNearby(index) {
    ensureImageLoaded(index);
    ensureImageLoaded(index + 1);
    ensureImageLoaded(index - 1);
  }

  function setActiveSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
    });
  }

  function updateUI() {
    const image = images[currentIndex];
    titleEl.textContent = getTitleFromAlt(image?.alt || "");
    counterEl.textContent = `${currentIndex + 1} / ${total}`;
  }

  function updateNavActive() {
    portfolioLink.classList.toggle("is-active", activeOverlay !== "contact");
    contactLink.classList.toggle("is-active", activeOverlay === "contact");
  }

  function updateFooterButton() {
    const isOpen = isAnyOverlayOpen();
    viewAllBtn.classList.toggle("is-close", isOpen);
    viewAllBtn.querySelector(".view-all-btn__label").textContent = isOpen
      ? "CLOSE"
      : "VIEW ALL";
  }

  function clearFlash() {
    if (flashTimer) {
      window.clearTimeout(flashTimer);
      flashTimer = null;
    }
  }

  function playFlash() {
    clearFlash();
    preloadNearby(targetIndex);

    flashEl.style.transition = "none";
    flashEl.style.opacity = "0";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flashEl.style.transition = `opacity ${flashInMs}ms ease-in`;
        flashEl.style.opacity = "1";

        flashTimer = window.setTimeout(() => {
          flashTimer = null;
          currentIndex = targetIndex;
          setActiveSlide(currentIndex);
          preloadNearby(currentIndex);
          updateUI();

          requestAnimationFrame(() => {
            flashEl.style.transition = `opacity ${flashOutMs}ms ease-out`;
            flashEl.style.opacity = "0";

            flashTimer = window.setTimeout(() => {
              flashTimer = null;
              flashEl.style.transition = "none";
              isAnimating = false;
            }, flashOutMs);
          });
        }, flashInMs);
      });
    });
  }

  function goToRealIndex(realIndex, animate = true) {
    const nextIndex = normalizeIndex(realIndex);
    ensureImageLoaded(nextIndex);

    if (!animate) {
      clearFlash();
      isAnimating = false;
      flashEl.style.transition = "none";
      flashEl.style.opacity = "0";
      targetIndex = nextIndex;
      currentIndex = nextIndex;
      setActiveSlide(currentIndex);
      preloadNearby(currentIndex);
      updateUI();
      return;
    }

    if (!isAnimating && nextIndex === currentIndex) return;

    targetIndex = nextIndex;
    isAnimating = true;
    playFlash();
  }

  function goNext() {
    const base = isAnimating ? targetIndex : currentIndex;
    goToRealIndex(base + 1);
  }

  function goPrev() {
    const base = isAnimating ? targetIndex : currentIndex;
    goToRealIndex(base - 1);
  }

  prevBtn.addEventListener("click", goPrev);
  nextBtn.addEventListener("click", goNext);
  document.querySelector(".click-zone-left").addEventListener("click", goPrev);
  document.querySelector(".click-zone-right").addEventListener("click", goNext);

  document.addEventListener("keydown", (e) => {
    if (isAnyOverlayOpen()) {
      if (e.key === "Escape") closeActiveOverlay();
      return;
    }

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    }

    if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  });

  imageStage.addEventListener(
    "touchstart",
    (e) => {
      if (isAnyOverlayOpen()) return;
      touchStartX = touchCurrentX = e.touches[0].clientX;
    },
    { passive: true }
  );

  imageStage.addEventListener(
    "touchmove",
    (e) => {
      if (isAnyOverlayOpen()) return;
      touchCurrentX = e.touches[0].clientX;
    },
    { passive: true }
  );

  imageStage.addEventListener("touchend", () => {
    if (isAnyOverlayOpen()) return;

    const delta = touchCurrentX - touchStartX;
    const threshold = 50;

    if (delta > threshold) {
      goPrev();
    } else if (delta < -threshold) {
      goNext();
    }

    touchStartX = 0;
    touchCurrentX = 0;
  });

  function updateLayoutVars() {
    document.documentElement.style.setProperty(
      "--header-offset",
      `${siteHeader.offsetHeight}px`
    );
    document.documentElement.style.setProperty(
      "--footer-offset",
      `${siteFooter.offsetHeight}px`
    );
  }

  function syncOverlayTopAlign(element) {
    const img = slides[currentIndex]?.querySelector(".carousel-image");
    if (!img || !element) return;

    const imageTop = img.getBoundingClientRect().top;
    const headerBottom = siteHeader.getBoundingClientRect().bottom;
    element.style.paddingTop = `${Math.max(0, imageTop - headerBottom)}px`;
  }

  function buildPortfolioOverlay() {
    images.forEach((_, index) => ensureImageLoaded(index));
    overlayGrid.innerHTML = "";

    images.forEach((image, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "overlay-item";
      button.setAttribute(
        "aria-label",
        getTitleFromAlt(image.alt) || `Image ${index + 1}`
      );

      const thumb = document.createElement("img");
      thumb.src = image.src || image.dataset.src || "";
      thumb.alt = image.alt || "";
      thumb.loading = "lazy";

      button.appendChild(thumb);
      button.addEventListener("click", () => {
        closeActiveOverlay();
        goToRealIndex(index, false);
      });

      overlayGrid.appendChild(button);
    });
  }

  function isContactPath() {
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    return path === "/contact";
  }

  function updateContactPath(open) {
    const onContactPath = isContactPath();

    if (open && !onContactPath) {
      history.pushState({ contact: true }, "", "/contact");
      return;
    }

    if (!open && onContactPath) {
      history.pushState(null, "", "/");
    }
  }

  function syncContactFromPath() {
    if (isContactPath()) {
      if (activeOverlay !== "contact") {
        openContactOverlay({ updatePath: false });
      }
      return;
    }

    if (activeOverlay === "contact") {
      closeActiveOverlay({ updatePath: false });
    }
  }

  function showOverlay(overlayEl, type, alignElement) {
    updateLayoutVars();

    if (type === "portfolio" && alignElement) {
      syncOverlayTopAlign(alignElement);
    } else if (alignElement) {
      alignElement.style.paddingTop = "";
    }

    overlayEl.hidden = false;
    overlayEl.setAttribute("aria-hidden", "false");
    activeOverlay = type;
    updateNavActive();
    updateFooterButton();
    document.body.classList.add("overlay-open");
    document.body.classList.toggle("contact-overlay-open", type === "contact");

    if (type === "contact") {
      document.getElementById("footer-copyright").setAttribute("aria-hidden", "false");
    }

    requestAnimationFrame(() => {
      overlayEl.classList.add("is-open");
    });
  }

  function hideOverlay(overlayEl) {
    overlayEl.classList.remove("is-open");
    overlayEl.setAttribute("aria-hidden", "true");

    const onTransitionEnd = () => {
      overlayEl.hidden = true;
      overlayEl.removeEventListener("transitionend", onTransitionEnd);
    };

    overlayEl.addEventListener("transitionend", onTransitionEnd);
  }

  function openPortfolioOverlay() {
    if (activeOverlay === "portfolio") return;

    if (activeOverlay === "contact") {
      hideOverlay(contactOverlay);
      activeOverlay = null;
      document.body.classList.remove("overlay-open", "contact-overlay-open");
      document.getElementById("footer-copyright").setAttribute("aria-hidden", "true");
      updateContactPath(false);
    }

    buildPortfolioOverlay();
    showOverlay(portfolioOverlay, "portfolio", overlayGrid);
  }

  function openContactOverlay({ updatePath = true } = {}) {
    if (activeOverlay === "contact") return;

    if (activeOverlay === "portfolio") {
      hideOverlay(portfolioOverlay);
    }

    showOverlay(contactOverlay, "contact", contactContent);

    if (updatePath) {
      updateContactPath(true);
    }
  }

  function closeActiveOverlay({ updatePath = true } = {}) {
    const wasContact = activeOverlay === "contact";

    if (activeOverlay === "portfolio") {
      hideOverlay(portfolioOverlay);
    } else if (wasContact) {
      hideOverlay(contactOverlay);
    }

    activeOverlay = null;
    document.body.classList.remove("overlay-open", "contact-overlay-open");
    document.getElementById("footer-copyright").setAttribute("aria-hidden", "true");
    updateNavActive();
    updateFooterButton();

    if (wasContact && updatePath) {
      updateContactPath(false);
    }
  }

  viewAllBtn.addEventListener("click", () => {
    if (isAnyOverlayOpen()) {
      closeActiveOverlay();
    } else {
      openPortfolioOverlay();
    }
  });

  contactLink.addEventListener("click", (e) => {
    e.preventDefault();
    if (activeOverlay === "contact") {
      closeActiveOverlay();
    } else {
      openContactOverlay();
    }
  });

  portfolioLink.addEventListener("click", (e) => {
    if (activeOverlay) {
      e.preventDefault();
      closeActiveOverlay();
    }
  });

  window.addEventListener("resize", () => {
    updateLayoutVars();
    if (activeOverlay === "portfolio") {
      syncOverlayTopAlign(overlayGrid);
    }
  });

  window.addEventListener("popstate", syncContactFromPath);

  updateLayoutVars();
  targetIndex = currentIndex;
  setActiveSlide(currentIndex);
  preloadNearby(currentIndex);
  updateUI();

  if (window.location.hash === "#contact") {
    history.replaceState({ contact: true }, "", "/contact");
  }

  if (isContactPath()) {
    openContactOverlay({ updatePath: false });
  }
});
