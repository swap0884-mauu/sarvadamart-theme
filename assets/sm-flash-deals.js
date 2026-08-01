(() => {
  const initialize = (section) => {
    if (!section || section.dataset.initialized === 'true') return;
    section.dataset.initialized = 'true';

    const countdown = section.querySelector('[data-countdown]');
    const hours = section.querySelector('[data-hours]');
    const minutes = section.querySelector('[data-minutes]');
    const seconds = section.querySelector('[data-seconds]');
    const expired = section.querySelector('[data-expired]');
    const endTime = new Date(section.dataset.countdownEnd).getTime();

    const updateCountdown = () => {
      const remaining = Number.isNaN(endTime) ? 0 : endTime - Date.now();
      if (remaining <= 0) {
        countdown.classList.add('is-expired');
        expired.hidden = false;
        return true;
      }
      hours.textContent = String(Math.floor(remaining / 3600000)).padStart(2, '0');
      minutes.textContent = String(Math.floor((remaining % 3600000) / 60000)).padStart(2, '0');
      seconds.textContent = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
      return false;
    };

    if (!updateCountdown()) {
      const timer = window.setInterval(() => {
        if (updateCountdown()) window.clearInterval(timer);
      }, 1000);
    }

    const list = section.querySelector('[data-product-list]');
    const previous = section.querySelector('[data-carousel-previous]');
    const next = section.querySelector('[data-carousel-next]');
    if (!list || !previous || !next) return;

    const scrollByCard = (direction) => {
      const card = list.querySelector('.sm-flash-deals__product-item');
      const gap = Number.parseFloat(window.getComputedStyle(list).gap) || 0;
      const amount = card ? card.getBoundingClientRect().width + gap : list.clientWidth;
      list.scrollBy({ left: direction * amount, behavior: 'smooth' });
    };

    previous.addEventListener('click', () => scrollByCard(-1));
    next.addEventListener('click', () => scrollByCard(1));
    list.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') { event.preventDefault(); scrollByCard(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); scrollByCard(1); }
    });
  };

  const initializeAll = (root = document) => root.querySelectorAll('[data-sm-flash-deals]').forEach(initialize);
  document.addEventListener('DOMContentLoaded', () => initializeAll());
  document.addEventListener('shopify:section:load', (event) => initializeAll(event.target));
})();
