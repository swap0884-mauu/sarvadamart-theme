assets/sm-featured-products.js

'use strict';

(() => {
  const SECTION_SELECTOR = '.sm-featured-products';
  const STORAGE_PREFIX = 'sm-featured-products-wishlist-';
  const CART_ADD_URL = '/cart/add.js';

  const getStorageKey = (productId) => `${STORAGE_PREFIX}${productId}`;

  const getProductId = (card) => {
    const variantInput = card.querySelector('[name="id"]');
    return variantInput?.value || card.querySelector('a[href*="/products/"]')?.href || '';
  };

  const showNotification = (section, message, type) => {
    let notification = section.querySelector('[data-sm-featured-products-notification]');

    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'sm-featured-products__notification';
      notification.setAttribute('data-sm-featured-products-notification', '');
      notification.setAttribute('role', 'status');
      notification.setAttribute('aria-live', 'polite');
      section.prepend(notification);
    }

    notification.textContent = message;
    notification.dataset.status = type;
    notification.hidden = false;

    window.clearTimeout(notification.hideTimer);
    notification.hideTimer = window.setTimeout(() => {
      notification.hidden = true;
    }, 3000);
  };

  const setLoadingState = (button, isLoading) => {
    const label = button.querySelector('span');

    if (isLoading) {
      button.dataset.label = label?.textContent.trim() || button.textContent.trim();
      button.disabled = true;
      button.classList.add('is-loading');
      button.setAttribute('aria-busy', 'true');

      if (label) label.textContent = 'Adding...';
      return;
    }

    button.disabled = false;
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');

    if (label && button.dataset.label) {
      label.textContent = button.dataset.label;
      delete button.dataset.label;
    }
  };

  const initializeWishlist = (section, signal) => {
    section.querySelectorAll('.sm-featured-products__icon-button[type="button"]').forEach((button) => {
      const productId = getProductId(button.closest('.sm-featured-products__card'));

      if (!productId) return;

      try {
        button.setAttribute('aria-pressed', String(sessionStorage.getItem(getStorageKey(productId)) === 'true'));
      } catch {
        button.setAttribute('aria-pressed', 'false');
      }

      button.addEventListener(
        'click',
        () => {
          const isActive = button.getAttribute('aria-pressed') !== 'true';

          button.setAttribute('aria-pressed', String(isActive));
          button.classList.toggle('is-active', isActive);

          try {
            sessionStorage.setItem(getStorageKey(productId), String(isActive));
          } catch {
            return;
          }
        },
        { signal }
      );
    });
  };

  const openQuickView = (trigger) => {
    const productUrl = trigger.getAttribute('href');

    if (!productUrl || !window.HTMLDialogElement) {
      window.location.assign(productUrl || window.location.href);
      return;
    }

    const dialog = document.createElement('dialog');
    const closeButton = document.createElement('button');
    const frame = document.createElement('iframe');

    dialog.className = 'sm-featured-products__quick-view-modal';
    dialog.setAttribute('aria-label', 'Quick product view');

    closeButton.className = 'sm-featured-products__quick-view-close';
    closeButton.type = 'button';
    closeButton.textContent = 'Close';
    closeButton.setAttribute('aria-label', 'Close quick view');

    frame.className = 'sm-featured-products__quick-view-frame';
    frame.src = productUrl;
    frame.title = trigger.getAttribute('aria-label') || 'Quick product view';
    frame.loading = 'lazy';

    dialog.append(closeButton, frame);
    document.body.appendChild(dialog);

    const closeDialog = () => {
      if (dialog.open) dialog.close();
      dialog.remove();

      if (document.body.contains(trigger)) trigger.focus();
    };

    closeButton.addEventListener('click', closeDialog);

    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeDialog();
    });

    dialog.addEventListener('close', () => {
      if (document.body.contains(dialog)) dialog.remove();
    });

    frame.addEventListener('error', () => {
      closeDialog();
      window.location.assign(productUrl);
    });

    dialog.showModal();
    closeButton.focus();
  };

  const initializeQuickView = (section, signal) => {
    section.querySelectorAll('.sm-featured-products__icon-button[href]').forEach((trigger) => {
      trigger.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          openQuickView(trigger);
        },
        { signal }
      );
    });
  };

  const addToCart = async (section, form, signal) => {
    const button = form.querySelector('[type="submit"]');
    const variantInput = form.querySelector('[name="id"]');

    if (!button || button.disabled) return;

    if (!variantInput?.value) {
      showNotification(section, 'This product is unavailable.', 'error');
      return;
    }

    setLoadingState(button, true);

    try {
      const response = await fetch(CART_ADD_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: new FormData(form),
        signal
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.description || result.message || 'Unable to add this product to your cart.');
      }

      showNotification(section, 'Product added to your cart.', 'success');

      document.dispatchEvent(
        new CustomEvent('cart:updated', {
          bubbles: true,
          detail: {
            source: 'sm-featured-products',
            product: result
          }
        })
      );
    } catch (error) {
      if (error?.name !== 'AbortError') {
        showNotification(section, error?.message || 'Something went wrong. Please try again.', 'error');
      }
    } finally {
      if (document.body.contains(button)) setLoadingState(button, false);
    }
  };

  const initializeForms = (section, signal) => {
    section.querySelectorAll('.sm-featured-products__form form').forEach((form) => {
      form.addEventListener(
        'submit',
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          addToCart(section, form, signal);
        },
        { capture: true, signal }
      );
    });
  };

  const initializeSection = (section) => {
    if (!section || section.dataset.smFeaturedProductsInitialized === 'true') return;

    const controller = new AbortController();

    section.dataset.smFeaturedProductsInitialized = 'true';
    section.smFeaturedProductsController = controller;

    initializeWishlist(section, controller.signal);
    initializeQuickView(section, controller.signal);
    initializeForms(section, controller.signal);
  };

  const destroySection = (section) => {
    section?.smFeaturedProductsController?.abort();

    if (section) {
      delete section.smFeaturedProductsController;
      delete section.dataset.smFeaturedProductsInitialized;
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