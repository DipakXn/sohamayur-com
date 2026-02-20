document.addEventListener('DOMContentLoaded', function(){
  // Delegate add-to-cart for related products
  document.body.addEventListener('click', function(e){
    var btn = e.target.closest && e.target.closest('.related-product-add');
    if(!btn) return;
    e.preventDefault();
    var variantId = btn.getAttribute('data-variant-id');
    if(!variantId) return;
    btn.disabled = true;
    btn.classList.add('is-loading');

    // Use fetch to add product to cart via AJAX
    fetch('/cart/add.js', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({id: Number(variantId), quantity: 1})
    })
    .then(function(resp){
      if(!resp.ok) throw resp;
      return resp.json();
    })
    .then(function(){
      // Refresh cart drawer by requesting the section HTML and replacing the cart-drawer element
      refreshCartDrawer();
    })
    .catch(function(){
      // If error, re-enable button
      btn.disabled = false;
      btn.classList.remove('is-loading');
    });
  });

  function refreshCartDrawer(){
    // Refresh cart drawer inner sections (avoid replacing custom element to keep it open)
    try {
      var cartUrl = window.location.pathname + '?section_id=cart-drawer';
      fetch(cartUrl, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw r; return r.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          // Replace cart drawer items and footer (same selectors used by cart.js)
          var selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          selectors.forEach(function (selector) {
            var target = document.querySelector(selector);
            var source = doc.querySelector(selector);
            if (target && source) target.replaceWith(source);
          });
          // After replacing markup, allow a currency-conversion app (eg. BUCKS by Helixo)
          // to re-run conversions. We call any known conversion hooks and our helper.
          try { if (typeof window.__convertCartDrawerPrices === 'function') window.__convertCartDrawerPrices(); } catch(e){}
          try { if (typeof convertCartPrices === 'function') convertCartPrices(); } catch(e){}
        })
        .catch(function () {
          // ignore
        });

      // Also refresh header cart icon bubble so count updates immediately
      var bubbleUrl = window.location.pathname + '?section_id=cart-icon-bubble';
      fetch(bubbleUrl, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw r; return r.text(); })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, 'text/html');
          var source = doc.getElementById('cart-icon-bubble') || doc.querySelector('#cart-icon-bubble');
          var target = document.getElementById('cart-icon-bubble');
          if (source && target) {
            target.innerHTML = source.innerHTML;
          }
        })
        .catch(function () {
          // fallback: fetch /cart.js and update totals/counts where possible
          fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
            var totals = document.querySelector('.totals__total-value');
            if (totals) totals.textContent = (cart.total_price / 100).toLocaleString(undefined, { style: 'currency', currency: cart.currency });
            var bubble = document.querySelector('.cart-count-bubble');
            if (bubble) {
              bubble.innerHTML = (cart.item_count < 100) ? '<span aria-hidden="true">' + cart.item_count + '</span>' : '';
            }
          }).catch(function () {});
        });
    } catch (e) {
      // best-effort
    }
  }

  // Debounce utility
  function debounce(fn, wait) {
    var t;
    return function () {
      var ctx = this, args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait || 100);
    };
  }

  // Attempt to trigger currency conversion for prices inside the cart drawer.
  // We try several well-known global hooks used by currency apps, then dispatch
  // a generic event so third-party scripts (like BUCKS) can listen and convert.
  function convertCartPrices() {
    try {
      // Exposed hook for other scripts to call explicitly
      window.__convertCartDrawerPrices = convertCartPrices;

      var converted = false;

      // Common Shopify Currency script patterns
      if (window.Currency && typeof window.Currency.convertAll === 'function') {
        try { window.Currency.convertAll(); converted = true; } catch (e) {}
      }
      if (!converted && window.Currency && typeof window.Currency.convert === 'function') {
        try { window.Currency.convert(); converted = true; } catch (e) {}
      }

      // Try app-specific global hooks (best-effort; names may vary)
      if (!converted && window.Bucks && typeof window.Bucks.convert === 'function') {
        try { window.Bucks.convert(); converted = true; } catch (e) {}
      }
      if (!converted && window.bucks && typeof window.bucks.convert === 'function') {
        try { window.bucks.convert(); converted = true; } catch (e) {}
      }

      // Helixo/Bucks may provide other global helpers; try a few common names
      if (!converted && window.Helixo && typeof window.Helixo.convertAll === 'function') {
        try { window.Helixo.convertAll(); converted = true; } catch (e) {}
      }

      // If still not converted, dispatch a generic event so the app can listen.
      if (!converted) {
        try { document.dispatchEvent(new CustomEvent('cart-drawer:currency-change')); } catch (e) {}
      }
    } catch (e) {
      // swallow
    }
  }

  // Wire common currency-change events used by various apps/scripts
  ['currency:change','currencyChange','currency:updated','cart:currencyChanged','bucks:currencyChanged','helixo:currencyChanged'].forEach(function(evt){
    document.addEventListener(evt, debounce(convertCartPrices, 120));
  });

  // If there's a select input for currency switches, listen for changes
  document.addEventListener('change', function(e){
    try {
      var t = e.target;
      if (!t) return;
      if (t.name && t.name.toLowerCase().indexOf('currency') !== -1) debounce(convertCartPrices, 120)();
      if (t.dataset && t.dataset.currency) debounce(convertCartPrices, 120)();
    } catch (e) {}
  });

  // Observe body attribute changes (some currency apps set data attributes)
  try {
    var bodyObserver = new MutationObserver(debounce(function(mutations){
      mutations.forEach(function(m){
        if (m.attributeName && m.attributeName.indexOf('currency') !== -1) convertCartPrices();
      });
    }, 150));
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['data-currency','data-shop-currency','data-active-currency'] });
  } catch (e) {}

  // Expose convert helper for external callers (apps can call this after conversion)
  try { window.__convertCartDrawerPrices = convertCartPrices; } catch (e) {}
});
class CartDrawer extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
    this.setHeaderCartIconAccessibility();
  }

  setHeaderCartIconAccessibility() {
    const cartLink = document.querySelector('#cart-icon-bubble');
    cartLink.setAttribute('role', 'button');
    cartLink.setAttribute('aria-haspopup', 'dialog');
    cartLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.open(cartLink);
    });
    cartLink.addEventListener('keydown', (event) => {
      if (event.code.toUpperCase() === 'SPACE') {
        event.preventDefault();
        this.open(cartLink);
      }
    });
  }

  open(triggeredBy) {
    if (triggeredBy) this.setActiveElement(triggeredBy);
    const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
    if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
    // here the animation doesn't seem to always get triggered. A timeout seem to help
    setTimeout(() => {
      this.classList.add('animate', 'active');
    });

    this.addEventListener(
      'transitionend',
      () => {
        const containerToTrapFocusOn = this.classList.contains('is-empty')
          ? this.querySelector('.drawer__inner-empty')
          : document.getElementById('CartDrawer');
        const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
        trapFocus(containerToTrapFocusOn, focusElement);
      },
      { once: true }
    );

    document.body.classList.add('overflow-hidden');
  }

  close() {
    this.classList.remove('active');
    removeTrapFocus(this.activeElement);
    document.body.classList.remove('overflow-hidden');
  }

  setSummaryAccessibility(cartDrawerNote) {
    cartDrawerNote.setAttribute('role', 'button');
    cartDrawerNote.setAttribute('aria-expanded', 'false');

    if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
      cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
    }

    cartDrawerNote.addEventListener('click', (event) => {
      event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
    });

    cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
  }

  renderContents(parsedState) {
    this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
    this.productId = parsedState.id;
    this.getSectionsToRender().forEach((section) => {
      const sectionElement = section.selector
        ? document.querySelector(section.selector)
        : document.getElementById(section.id);
      sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    setTimeout(() => {
      this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      this.open();
    });
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-drawer',
        selector: '#CartDrawer',
      },
      {
        id: 'cart-icon-bubble',
      },
    ];
  }

  getSectionDOM(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-drawer', CartDrawer);

class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return [
      {
        id: 'CartDrawer',
        section: 'cart-drawer',
        selector: '.drawer__inner',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
    ];
  }
}

customElements.define('cart-drawer-items', CartDrawerItems);


document.addEventListener('DOMContentLoaded', function () {

  /* ===============================
     COUNTDOWN TIMER (DAILY RESET)
  =============================== */
  function startCartCountdown() {
    const el = document.getElementById('cartCountdown');
    if (!el) return;

    const now = new Date();
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    function update() {
      const diff = end - new Date();
      if (diff <= 0) return;

      const h = String(Math.floor(diff / 36e5)).padStart(2, '0');
      const m = String(Math.floor(diff % 36e5 / 6e4)).padStart(2, '0');
      const s = String(Math.floor(diff % 6e4 / 1000)).padStart(2, '0');

      el.textContent = `${h}:${m}:${s}`;
    }

    update();
    setInterval(update, 1000);
  }

  /* ===============================
     DELIVERY DATE + PROGRESS
  =============================== */
  function setDeliveryEstimate() {
    const dateEl = document.getElementById('deliveryDate');
    const progressEl = document.getElementById('deliveryProgress');
    if (!dateEl || !progressEl) return;

    const today = new Date();
    const delivery = new Date(today);
    delivery.setDate(today.getDate() + 3);

    dateEl.textContent = delivery.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    // Progress: Today → Processing (1/3)
    progressEl.style.width = '33%';
  }

  /* ===============================
     INIT WHEN CART OPENS
  =============================== */
  document.addEventListener('click', function (e) {
    if (e.target.closest('#cart-icon-bubble')) {
      setTimeout(() => {
        startCartCountdown();
        setDeliveryEstimate();
      }, 200);
    }
  });

});
