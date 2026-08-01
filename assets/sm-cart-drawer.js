class SmCartDrawer extends HTMLElement {
  constructor() {
    super();
    this.sectionId = this.dataset.sectionId;
    this.isOpen = false;
    this.focusedElementBeforeOpen = null;
    this.isUpdating = false;
    this.abortController = null;
    this.debounceTimer = null;

    this.onDocumentClick = this.onDocumentClick.bind(this);
    this.onDrawerClick = this.onDrawerClick.bind(this);
    this.onDrawerChange = this.onDrawerChange.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
  }

  connectedCallback() {
    this.bindEvents();
  }

  disconnectedCallback() {
    this.unbindEvents();
  }

  bindEvents() {
    document.addEventListener('click', this.onDocumentClick);
    this.addEventListener('click', this.onDrawerClick);
    this.addEventListener('change', this.onDrawerChange);
    this.addEventListener('keydown', this.onKeyDown);
  }

  unbindEvents() {
    document.removeEventListener('click', this.onDocumentClick);
    this.removeEventListener('click', this.onDrawerClick);
    this.removeEventListener('change', this.onDrawerChange);
    this.removeEventListener('keydown', this.onKeyDown);
  }

  onDocumentClick(event) {
    const trigger = event.target.closest('[data-sm-cart-open]');
    if (trigger) {
      event.preventDefault();
      this.open();
    }
  }

  onDrawerClick(event) {
    const target = event.target;

    if (target.hasAttribute('data-sm-cart-overlay') || target.closest('[data-sm-cart-close]')) {
      event.preventDefault();
      this.close();
      return;
    }

    const removeBtn = target.closest('[data-sm-cart-remove]');
    if (removeBtn) {
      event.preventDefault();
      const key = removeBtn.getAttribute('data-key');
      if (key) this.updateQuantity(key, 0);
      return;
    }

    const increaseBtn = target.closest('[data-sm-quantity-increase]');
    if (increaseBtn) {
      event.preventDefault();
      const key = increaseBtn.getAttribute('data-key');
      const input = this.querySelector(`input[data-sm-quantity-input][data-key="${key}"]`);
      if (input && key) {
        const currentVal = parseInt(input.value, 10) || 0;
        this.updateQuantity(key, currentVal + 1);
      }
      return;
    }

    const decreaseBtn = target.closest('[data-sm-quantity-decrease]');
    if (decreaseBtn) {
      event.preventDefault();
      const key = decreaseBtn.getAttribute('data-key');
      const input = this.querySelector(`input[data-sm-quantity-input][data-key="${key}"]`);
      if (input && key) {
        const currentVal = parseInt(input.value, 10) || 0;
        const newVal = Math.max(0, currentVal - 1);
        this.updateQuantity(key, newVal);
      }
      return;
    }
  }

  onDrawerChange(event) {
    const target = event.target;
    if (target.matches('[data-sm-quantity-input]')) {
      const key = target.getAttribute('data-key');
      let value = parseInt(target.value, 10);
      if (isNaN(value) || value < 0) {
        value = 0;
      }
      target.value = value;
      if (key) {
        this.debounce(() => this.updateQuantity(key, value), 300);
      }
    }
  }

  onKeyDown(event) {
    if (!this.isOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === 'Tab') {
      this.handleFocusTrap(event);
    }
  }

  open() {
    if (this.isOpen) return;

    this.focusedElementBeforeOpen = document.activeElement;
    this.isOpen = true;
    this.classList.add('is-open');
    this.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overflow-hidden');

    this.refresh();

    setTimeout(() => {
      const closeBtn = this.querySelector('[data-sm-cart-close]');
      if (closeBtn) {
        closeBtn.focus();
      } else {
        const focusable = this.getFocusableElements();
        if (focusable.length > 0) focusable[0].focus();
      }
    }, 100);
  }

  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.classList.remove('is-open');
    this.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overflow-hidden');

    if (this.focusedElementBeforeOpen && typeof this.focusedElementBeforeOpen.focus === 'function') {
      this.focusedElementBeforeOpen.focus();
    }
  }

  getFocusableElements() {
    return Array.from(
      this.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
  }

  handleFocusTrap(event) {
    const focusables = this.getFocusableElements();
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }

    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    if (event.shiftKey) {
      if (document.activeElement === firstElement || !this.contains(document.activeElement)) {
        lastElement.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement || !this.contains(document.activeElement)) {
        firstElement.focus();
        event.preventDefault();
      }
    }
  }

  setLoadingState(loading) {
    this.isUpdating = loading;
    if (loading) {
      this.classList.add('sm-drawer--loading');
    } else {
      this.classList.remove('sm-drawer--loading');
    }

    const buttons = this.querySelectorAll('button, input');
    buttons.forEach((btn) => {
      btn.disabled = loading;
    });
  }

  showError(message) {
    const errorEl = this.querySelector('[data-sm-error-message]');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }
  }

  clearError() {
    const errorEl = this.querySelector('[data-sm-error-message]');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.hidden = true;
    }
  }

  async updateQuantity(key, quantity) {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.clearError();
    this.setLoadingState(true);

    try {
      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: key,
          quantity: quantity
        }),
        signal: this.abortController.signal
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.description || 'Failed to update cart item quantity.');
      }

      await this.refresh();
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.showError(error.message || 'Network error occurred. Please try again.');
      this.setLoadingState(false);
    }
  }

  async refresh() {
    if (!this.sectionId) {
      this.setLoadingState(false);
      return;
    }

    this.setLoadingState(true);

    try {
      const response = await fetch(`${window.location.pathname}?section_id=${this.sectionId}`);
      if (!response.ok) {
        throw new Error('Could not refresh cart UI.');
      }

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const targetId = `SMCartDrawer-${this.sectionId}`;
      const newElement = doc.getElementById(targetId);

      if (newElement) {
        this.innerHTML = newElement.innerHTML;
        this.updateHeaderCount();
      }
    } catch (error) {
      this.showError('Unable to update cart layout.');
    } finally {
      this.setLoadingState(false);
    }
  }

  updateHeaderCount() {
    const countEl = this.querySelector('[data-sm-cart-count]');
    const count = countEl ? parseInt(countEl.textContent.trim(), 10) || 0 : 0;

    const targets = document.querySelectorAll('[data-sm-cart-count], .cart-count-bubble, [data-cart-count]');
    targets.forEach((el) => {
      if (el !== countEl) {
        el.textContent = count;
      }
    });
  }

  debounce(fn, wait) {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => fn(), wait);
  }
}

if (!customElements.get('sm-cart-drawer')) {
  customElements.define('sm-cart-drawer', SmCartDrawer);
}