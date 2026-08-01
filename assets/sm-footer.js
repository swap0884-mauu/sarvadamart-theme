'use strict';

(() => {
  const FOOTER_SELECTOR = '.sm-footer';
  const MOBILE_BREAKPOINT = '(max-width: 767px)';
  const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const prefersReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

  const getMessageElement = (form) => {
    let message = form.querySelector('[data-sm-footer-message]');

    if (message) return message;

    message = document.createElement('small');
    message.className = 'sm-footer__form-message';
    message.setAttribute('data-sm-footer-message', '');
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    message.hidden = true;

    form.appendChild(message);

    return message;
  };

  const showFormMessage = (form, message, type) => {
    const messageElement = getMessageElement(form);

    messageElement.textContent = message;
    messageElement.classList.toggle('sm-footer__form-message--error', type === 'error');
    messageElement.hidden = false;
  };

  const setNewsletterLoading = (button, isLoading) => {
    if (!button) return;

    if (isLoading) {
      button.dataset.originalLabel = button.textContent.trim();
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'Subscribing...';
      return;
    }

    button.disabled = false;
    button.removeAttribute('aria-busy');

    if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel;
      delete button.dataset.originalLabel;
    }
  };

  const submitNewsletter = async (form, controller) => {
    const emailInput = form.querySelector('[name="contact[email]"]');
    const submitButton = form.querySelector('[type="submit"]');
    const email = emailInput?.value.trim() || '';

    if (!emailInput || !submitButton) return;

    if (!isValidEmail(email)) {
      emailInput.setAttribute('aria-invalid', 'true');
      showFormMessage(form, 'Please enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    emailInput.removeAttribute('aria-invalid');
    setNewsletterLoading(submitButton, true);

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: {
          Accept: 'text/html',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new FormData(form),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Unable to subscribe at this time.');
      }

      const responseText = await response.text();
      const documentResponse = new DOMParser().parseFromString(responseText, 'text/html');
      const hasError = documentResponse.querySelector('.errors, [aria-invalid="true"]');

      if (hasError) {
        throw new Error('Please check your email address and try again.');
      }

      form.reset();
      showFormMessage(form, 'Thank you for subscribing.', 'success');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        showFormMessage(form, error?.message || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      if (document.body.contains(submitButton)) {
        setNewsletterLoading(submitButton, false);
      }
    }
  };

  const initializeNewsletter = (footer, controller) => {
    const form = footer.querySelector('.sm-footer__newsletter-form');

    if (!form) return;

    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        submitNewsletter(form, controller);
      },
      { signal: controller.signal }
    );
  };

  const updateAccordionState = (footer, isMobile) => {
    footer.querySelectorAll('.sm-footer__column').forEach((column) => {
      const heading = column.querySelector('.sm-footer__heading');
      const content = column.querySelector('.sm-footer__menu');

      if (!heading || !content) return;

      if (!heading.id) {
        heading.id = `SMFooterAccordion-${Math.random().toString(36).slice(2, 10)}`;
      }

      if (!content.id) {
        content.id = `${heading.id}-content`;
      }

      if (!isMobile) {
        heading.removeAttribute('role');
        heading.removeAttribute('tabindex');
        heading.removeAttribute('aria-controls');
        heading.removeAttribute('aria-expanded');
        content.hidden = false;
        return;
      }

      heading.setAttribute('role', 'button');
      heading.setAttribute('tabindex', '0');
      heading.setAttribute('aria-controls', content.id);

      if (!heading.hasAttribute('aria-expanded')) {
        heading.setAttribute('aria-expanded', 'false');
        content.hidden = true;
      }
    });
  };

  const toggleAccordion = (heading) => {
    const contentId = heading.getAttribute('aria-controls');
    const content = contentId ? document.getElementById(contentId) : null;

    if (!content) return;

    const isExpanded = heading.getAttribute('aria-expanded') === 'true';

    heading.setAttribute('aria-expanded', String(!isExpanded));
    content.hidden = isExpanded;
  };

  const initializeAccordions = (footer, controller) => {
    const mediaQuery = window.matchMedia(MOBILE_BREAKPOINT);

    const handleMediaChange = () => {
      updateAccordionState(footer, mediaQuery.matches);
    };

    updateAccordionState(footer, mediaQuery.matches);

    footer.addEventListener(
      'click',
      (event) => {
        const heading = event.target.closest('.sm-footer__heading[role="button"]');

        if (heading) toggleAccordion(heading);
      },
      { signal: controller.signal }
    );

    footer.addEventListener(
      'keydown',
      (event) => {
        const heading = event.target.closest('.sm-footer__heading[role="button"]');

        if (!heading || !['Enter', ' '].includes(event.key)) return;

        event.preventDefault();
        toggleAccordion(heading);
      },
      { signal: controller.signal }
    );

    mediaQuery.addEventListener('change', handleMediaChange, { signal: controller.signal });
  };

  const initializeScrollToTop = (footer, controller) => {
    const button = footer.querySelector('[data-scroll-to-top]');

    if (!button) return;

    const toggleButton = () => {
      button.hidden = window.scrollY < 400;
    };

    button.addEventListener(
      'click',
      () => {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });
      },
      { signal: controller.signal }
    );

    window.addEventListener('scroll', toggleButton, {
      passive: true,
      signal: controller.signal
    });

    toggleButton();
  };

  const initializeFooter = (footer) => {
    if (!footer || footer.dataset.smFooterInitialized === 'true') return;

    const controller = new AbortController();

    footer.dataset.smFooterInitialized = 'true';
    footer.smFooterController = controller;

    initializeNewsletter(footer, controller);
    initializeAccordions(footer, controller);
    initializeScrollToTop(footer, controller);
  };

  const destroyFooter = (footer) => {
    footer?.smFooterController?.abort();

    if (footer) {
      delete footer.smFooterController;
      delete footer.dataset.smFooterInitialized;
    }
  };

  const initializeAll = (root = document) => {
    root.querySelectorAll(FOOTER_SELECTOR).forEach(initializeFooter);
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
    destroyFooter(event.target.querySelector(FOOTER_SELECTOR) || event.target);
  });

  document.addEventListener('shopify:section:select', (event) => {
    const footer = event.target.querySelector(FOOTER_SELECTOR) || event.target.closest(FOOTER_SELECTOR);

    if (footer && !prefersReducedMotion()) {
      footer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  document.addEventListener('shopify:section:deselect', () => {});
})();