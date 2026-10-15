/* His Glory Forever — theme scripts (no dependencies) */
(() => {
  'use strict';

  const theme = window.theme || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ---------- Money ---------- */

  const formatMoney = (cents, format = theme.moneyFormat || '${{amount}}') => {
    const value = (Number(cents) || 0) / 100;
    const fmt = (n, decimals, thousands = ',', dec = '.') => {
      const fixed = n.toFixed(decimals).split('.');
      fixed[0] = fixed[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return fixed.join(dec);
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount': return fmt(value, 2);
        case 'amount_no_decimals': return fmt(value, 0);
        case 'amount_with_comma_separator': return fmt(value, 2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(value, 0, '.', ',');
        default: return fmt(value, 2);
      }
    });
  };

  const formatMoneyShort = (cents) => formatMoney(cents).replace(/[.,]00(?=\D*$)/, '');

  /* ---------- Focus trap for drawers ---------- */

  const focusable = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  let lastFocused = null;
  let activeTrap = null;

  const trapFocus = (container) => {
    lastFocused = document.activeElement;
    activeTrap = (e) => {
      if (e.key !== 'Tab') return;
      const items = $$(focusable, container).filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', activeTrap);
    container.focus();
  };

  const releaseFocus = () => {
    if (activeTrap) document.removeEventListener('keydown', activeTrap);
    activeTrap = null;
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  };

  /* ---------- Generic drawer ---------- */

  const openDrawer = (drawer, overlay, trigger) => {
    if (!drawer) return;
    drawer.classList.add('is-open');
    overlay && overlay.classList.add('is-open');
    document.body.classList.add('is-locked');
    trigger && trigger.setAttribute('aria-expanded', 'true');
    trapFocus(drawer);
  };

  const closeDrawer = (drawer, overlay, trigger) => {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    overlay && overlay.classList.remove('is-open');
    document.body.classList.remove('is-locked');
    trigger && trigger.setAttribute('aria-expanded', 'false');
    releaseFocus();
  };

  /* ---------- Header ---------- */

  const initHeader = () => {
    const section = $('.section-header');
    if (!section) return;

    // Shadow once the page scrolls
    const onScroll = () => section.classList.toggle('is-scrolled', window.scrollY > 4);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mega menus: open on hover (desktop) and on click/keyboard
    const items = $$('[data-mega]', section);
    const closeAll = (except) => items.forEach((item) => {
      if (item === except) return;
      item.classList.remove('is-open');
      const btn = $('.nav__link', item);
      btn && btn.setAttribute('aria-expanded', 'false');
    });

    items.forEach((item) => {
      const btn = $('.nav__link', item);
      let timer;
      const open = () => { clearTimeout(timer); closeAll(item); item.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); };
      const close = () => { timer = setTimeout(() => { item.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); }, 120); };
      item.addEventListener('mouseenter', open);
      item.addEventListener('mouseleave', close);
      btn.addEventListener('click', () => (item.classList.contains('is-open') ? (item.classList.remove('is-open'), btn.setAttribute('aria-expanded', 'false')) : open()));
      item.addEventListener('focusout', (e) => { if (!item.contains(e.relatedTarget)) close(); });
    });

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
    document.addEventListener('click', (e) => { if (!e.target.closest('[data-mega]')) closeAll(); });

    // Search
    const searchToggle = $('[data-search-toggle]', section);
    const search = $('#HeaderSearch', section);
    if (searchToggle && search) {
      searchToggle.addEventListener('click', () => {
        const open = !search.classList.contains('is-open');
        search.classList.toggle('is-open', open);
        searchToggle.setAttribute('aria-expanded', String(open));
        if (open) $('input[type="search"]', search).focus();
      });
    }

    // Mobile menu
    const menu = $('#MenuDrawer');
    const menuOverlay = $('[data-menu-overlay]');
    const menuOpen = $('[data-menu-open]');
    menuOpen && menuOpen.addEventListener('click', () => openDrawer(menu, menuOverlay, menuOpen));
    $$('[data-menu-close]').forEach((b) => b.addEventListener('click', () => closeDrawer(menu, menuOverlay, menuOpen)));
    menuOverlay && menuOverlay.addEventListener('click', () => closeDrawer(menu, menuOverlay, menuOpen));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(menu, menuOverlay, menuOpen); });
  };

  /* ---------- Announcement rotator ---------- */

  const initAnnouncements = (root = document) => {
    $$('[data-announcement]', root).forEach((wrap) => {
      const slides = $$('.announcement-bar__slide', wrap);
      if (!slides.length) return;
      if (!slides.some((s) => s.classList.contains('is-active'))) slides[0].classList.add('is-active');
      if (slides.length < 2) return;
      const interval = Number(wrap.dataset.interval) || 5000;
      let index = slides.findIndex((s) => s.classList.contains('is-active'));
      let paused = false;
      wrap.addEventListener('mouseenter', () => (paused = true));
      wrap.addEventListener('mouseleave', () => (paused = false));
      setInterval(() => {
        if (paused || document.hidden) return;
        slides[index].classList.remove('is-active');
        index = (index + 1) % slides.length;
        slides[index].classList.add('is-active');
      }, interval);
    });
  };

  /* ---------- Free-shipping progress ---------- */

  const updateFreeShipping = (cart) => {
    const threshold = Number(theme.freeShippingThreshold) || 0;
    if (!theme.freeShippingEnabled || threshold <= 0 || !cart) return;
    const total = cart.total_price;
    const remaining = threshold - total;
    const percent = Math.min(100, Math.round((total / threshold) * 100));
    const s = theme.strings || {};
    let text;
    if (cart.item_count === 0) text = (s.freeShippingIntro || '').replace('[amount]', formatMoneyShort(threshold));
    else if (remaining > 0) text = (s.freeShippingAway || '').replace('[amount]', formatMoney(remaining));
    else text = s.freeShippingUnlocked || '';
    $$('[data-free-shipping-text]').forEach((el) => (el.textContent = text));
    $$('[data-free-shipping-fill]').forEach((el) => {
      el.style.width = `${percent}%`;
      el.parentElement && el.parentElement.setAttribute('aria-valuenow', String(percent));
    });
  };

  /* ---------- Cart ---------- */

  const Cart = {
    drawer: null,
    overlay: null,

    init() {
      this.drawer = $('[data-cart-drawer]');
      this.overlay = $('[data-cart-overlay]');

      document.addEventListener('click', (e) => {
        const openBtn = e.target.closest('[data-cart-open]');
        if (openBtn && this.drawer && theme.cartType === 'drawer' && !document.body.classList.contains('template-cart')) {
          e.preventDefault();
          this.open(openBtn);
        }
        if (e.target.closest('[data-cart-close]') || e.target.closest('[data-cart-overlay]')) this.close();
      });

      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.close(); });

      this.bindDrawer();

      // Any add-to-cart form on the site
      document.addEventListener('submit', (e) => {
        const form = e.target;
        if (!(form instanceof HTMLFormElement)) return;
        const action = form.getAttribute('action') || '';
        if (!action.includes('/cart/add') || theme.cartType !== 'drawer' || !this.drawer) return;
        e.preventDefault();
        this.add(form);
      });
    },

    open(trigger) { openDrawer(this.drawer, this.overlay, trigger); },
    close() { closeDrawer(this.drawer, this.overlay); },

    bindDrawer() {
      if (!this.drawer) return;
      this.drawer.addEventListener('click', (e) => {
        const item = e.target.closest('.cart-item');
        if (!item) return;
        const line = Number(item.dataset.line);
        const input = $('[data-qty-input]', item);
        if (e.target.closest('[data-qty-change]')) {
          const delta = Number(e.target.closest('[data-qty-change]').dataset.qtyChange);
          this.change(line, Math.max(0, Number(input.value) + delta), item);
        }
        if (e.target.closest('[data-remove]')) this.change(line, 0, item);
      });
      this.drawer.addEventListener('change', (e) => {
        if (!e.target.matches('[data-qty-input]')) return;
        const item = e.target.closest('.cart-item');
        this.change(Number(item.dataset.line), Math.max(0, Number(e.target.value) || 0), item);
      });
    },

    async request(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw data;
      return data;
    },

    async change(line, quantity, item) {
      this.drawer.classList.add('is-updating');
      const error = item && $('[data-line-error]', item);
      try {
        const cart = await this.request(`${theme.routes.cartChange}.js`, { line, quantity, sections: ['cart-drawer'] });
        this.render(cart);
      } catch (err) {
        if (error) { error.textContent = err.description || err.message || 'Something went wrong. Please try again.'; error.hidden = false; }
      } finally {
        this.drawer.classList.remove('is-updating');
      }
    },

    async add(form) {
      const button = form.querySelector('[type="submit"]');
      const errorEl = form.querySelector('[data-form-error]');
      button && button.classList.add('is-loading');
      if (errorEl) errorEl.hidden = true;
      try {
        const formData = new FormData(form);
        formData.append('sections', 'cart-drawer');
        const res = await fetch(`${theme.routes.cartAdd}.js`, { method: 'POST', headers: { Accept: 'application/json' }, body: formData });
        const data = await res.json();
        if (!res.ok) throw data;
        const cart = await (await fetch(`${theme.routes.cart}.js`)).json();
        cart.sections = data.sections;
        this.render(cart);
        this.open(button);
        document.dispatchEvent(new CustomEvent('cart:added', { detail: { item: data } }));
      } catch (err) {
        if (errorEl) { errorEl.textContent = err.description || err.message || 'Could not add to cart.'; errorEl.hidden = false; }
        else window.location.href = theme.routes.cart;
      } finally {
        button && button.classList.remove('is-loading');
      }
    },

    render(cart) {
      if (cart.sections && cart.sections['cart-drawer'] && this.drawer) {
        const doc = new DOMParser().parseFromString(cart.sections['cart-drawer'], 'text/html');
        const fresh = doc.querySelector('[data-cart-drawer]');
        if (fresh) this.drawer.innerHTML = fresh.innerHTML;
      }
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = cart.item_count;
        el.hidden = cart.item_count === 0;
      });
      updateFreeShipping(cart);
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { cart } }));
    }
  };

  window.HGFCart = Cart;

  /* ---------- Category tiles: Women's / Men's toggle ---------- */

  const initCategoryTiles = (root = document) => {
    $$('[data-category-tiles]', root).forEach((section) => {
      const tabs = $$('[data-audience-tab]', section);
      if (!tabs.length) return;
      const show = (audience) => {
        tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.audienceTab === audience)));
        $$('[data-audience]', section).forEach((tile) => {
          const a = tile.dataset.audience;
          tile.hidden = !(a === 'all' || a === audience);
        });
      };
      tabs.forEach((tab) => tab.addEventListener('click', () => show(tab.dataset.audienceTab)));
    });
  };

  /* ---------- Hero slideshow ---------- */

  const initSlideshows = (root = document) => {
    $$('[data-slideshow]', root).forEach((show) => {
      if (show.dataset.ready) return;
      show.dataset.ready = 'true';
      const slides = $$('[data-slide]', show);
      const dots = $$('[data-slide-dot]', show);
      if (slides.length < 2) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let autoplay = show.dataset.autoplay === 'true' && !reduce;
      const interval = Number(show.dataset.interval) || 7000;
      let index = 0;
      let timer = null;
      let hovering = false;

      const go = (n) => {
        index = (n + slides.length) % slides.length;
        slides.forEach((sl, i) => {
          const on = i === index;
          sl.classList.toggle('is-active', on);
          sl.setAttribute('aria-hidden', String(!on));
          $$('a, button', sl).forEach((el) => (on ? el.removeAttribute('tabindex') : el.setAttribute('tabindex', '-1')));
        });
        dots.forEach((d, i) => {
          d.classList.toggle('is-active', i === index);
          if (i === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
        });
      };

      const stop = () => { clearInterval(timer); timer = null; };
      const start = () => { stop(); if (autoplay) timer = setInterval(() => { if (!hovering && !document.hidden) go(index + 1); }, interval); };

      const prev = $('[data-slide-prev]', show);
      const next = $('[data-slide-next]', show);
      prev && prev.addEventListener('click', () => { go(index - 1); start(); });
      next && next.addEventListener('click', () => { go(index + 1); start(); });
      dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.slideDot)); start(); }));

      const pause = $('[data-slide-pause]', show);
      if (pause) {
        if (!autoplay) show.classList.add('is-paused');
        pause.addEventListener('click', () => {
          autoplay = !autoplay;
          show.classList.toggle('is-paused', !autoplay);
          pause.setAttribute('aria-label', autoplay ? pause.dataset.labelPause : pause.dataset.labelPlay);
          start();
        });
      }

      show.addEventListener('mouseenter', () => (hovering = true));
      show.addEventListener('mouseleave', () => (hovering = false));
      show.addEventListener('focusin', () => (hovering = true));
      show.addEventListener('focusout', () => (hovering = false));

      // Swipe on touch screens
      let x0 = null;
      show.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
      show.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) { go(index + (dx < 0 ? 1 : -1)); start(); }
        x0 = null;
      });

      // Theme editor: show the slide being edited
      show.addEventListener('shopify:block:select', (e) => { const i = slides.indexOf(e.target); if (i > -1) { go(i); stop(); } });
      show.addEventListener('shopify:block:deselect', start);

      go(0);
      start();
    });
  };

  /* ---------- Boot ---------- */

  const boot = () => {
    initHeader();
    initAnnouncements();
    Cart.init();
    initCategoryTiles();
    initSlideshows();
  };

  // Re-run section scripts when edited in the theme editor
  document.addEventListener('shopify:section:load', (e) => {
    initCategoryTiles(e.target);
    initAnnouncements(e.target);
    initSlideshows(e.target);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
