'use strict';

(() => {
  const SECTION_SELECTOR = '.sm-why-sarvada';
  const CARD_SELECTOR = '.sm-why-sarvada__card';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  const shouldReduceMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

  const revealCard = (card) => {
    card.classList.add('is-revealed');
  };

  const initializeHoverEffects = (section, signal) => {
    section.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      card.addEventListener(
        'pointerenter',
        () => {
          card.classList.add('is-hovered');
        },
        { passive: true, signal }
      );

      card.addEventListener(
        'pointerleave',
        () => {
          card.classList.remove('is-hovered');
        },
        { passive: true, signal }
      );
    });
  };

  const initializeRevealAnimation = (section, signal) => {
    const cards = [...section.querySelectorAll(CARD_SELECTOR)];

    if (!cards.length) return;

    if (shouldReduceMotion() || !('IntersectionObserver' in window)) {
      cards.forEach(revealCard);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, activeObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          window.requestAnimationFrame(() => {
            revealCard(entry.target);
          });

          activeObserver.unobserve(entry.target);
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -8%',
        threshold: 0.15
      }
    );

    cards.forEach((card) => observer.observe(card));

    signal.addEventListener(
      'abort',
      () => {
        observer.disconnect();
      },
      { once: true }
    );
  };

  const initializeSection = (section) => {
    if (!section || section.dataset.smWhySarvadaInitialized === 'true') return;

    const controller = new AbortController();

    section.dataset.smWhySarvadaInitialized = 'true';
    section.smWhySarvadaController = controller;

    initializeHoverEffects(section, controller.signal);
    initializeRevealAnimation(section, controller.signal);
  };

  const destroySection = (section) => {
    section?.smWhySarvadaController?.abort();

    if (section) {
      delete section.smWhySarvadaController;
      delete section.dataset.smWhySarvadaInitialized;
    }
  };

  const initializeAll = (root = document) => {
    root.querySelectorAll(SECTION_SELECTOR).forEach(initializeSection);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeAll(), { once: true });
  } else {
    initializeAll();
  }

  document.addEventListener('shopify:section:load', (event) => {
    initializeAll(event.target);
  });

  document.addEventListener('shopify:section:unload', (event) => {
    destroySection(event.target.querySelector(SECTION_SELECTOR) || event.target);
  });
})();