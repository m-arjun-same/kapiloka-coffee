/* Kapiloka — THE POUR SYSTEM behaviour (own code, no dependencies).
   Pour-stream scroll rail · steam bend · section wipes · order tray · tilt/magnetic. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(pointer: fine)').matches;

  /* ---------- 1 · pour stream ---------- */
  var pour = document.createElement('div');
  pour.className = 'kl-pour';
  pour.innerHTML = '<div class="kl-pour__fill"></div><div class="kl-pour__drop"></div>';
  document.body.appendChild(pour);
  var fill = pour.querySelector('.kl-pour__fill'), drop = pour.querySelector('.kl-pour__drop');
  var ticking = false;
  function paint() {
    ticking = false;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (window.innerWidth < 768) { fill.style.width = (p * 100) + '%'; }
    else { fill.style.height = (p * 100) + '%'; drop.style.top = (p * 100) + '%'; }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint();

  /* ---------- 2 · steam wisps ---------- */
  var WISP = '<svg viewBox="0 0 20 64"><path d="M10 62 C 4 46, 16 38, 10 24 C 5 13, 13 7, 11 1"/></svg>';
  function steam(host) {
    if (!host) return null;
    var s = document.createElement('div');
    s.className = 'kl-steam'; s.setAttribute('aria-hidden', 'true');
    s.innerHTML = WISP + WISP + WISP;
    host.appendChild(s);
    return s;
  }
  var heroSteam = steam(document.querySelector('.hero'));
  steam(document.querySelector('.slogan'));
  if (heroSteam && fine && !reduce) {
    var hero = document.querySelector('.hero');
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      heroSteam.style.setProperty('--kl-steam-bend', (nx * 22).toFixed(1) + 'deg');
    });
    hero.addEventListener('pointerleave', function () { heroSteam.style.setProperty('--kl-steam-bend', '0deg'); });
  }

  /* ---------- 3 · section wipe transitions ---------- */
  document.documentElement.classList.add('kl-armed');
  var wipeSections = document.querySelectorAll('.figures, .package, .inside, .benefits, .faq, .cta');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('kl-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    wipeSections.forEach(function (sec) {
      sec.classList.add('kl-wipe');
      var c = document.createElement('div');
      c.className = 'kl-curtain'; c.setAttribute('aria-hidden', 'true');
      sec.insertBefore(c, sec.firstChild);
      io.observe(sec);
    });
  }

  /* ---------- 4 · order tray ---------- */
  var tray = [], trayEl = null, panelEl = null, toastEl = null, toastTimer = null;
  function inr(n) { return '₹' + n; }
  function ensureTrayUI() {
    if (trayEl) return;
    trayEl = document.createElement('button');
    trayEl.type = 'button'; trayEl.className = 'kl-tray';
    trayEl.setAttribute('aria-label', 'Open your tray');
    document.body.appendChild(trayEl);
    trayEl.addEventListener('click', function () { panelEl.classList.toggle('open'); });
    panelEl = document.createElement('div');
    panelEl.className = 'kl-panel';
    document.body.appendChild(panelEl);
    toastEl = document.createElement('div');
    toastEl.className = 'kl-toast'; toastEl.setAttribute('role', 'status');
    document.body.appendChild(toastEl);
  }
  function renderTray() {
    ensureTrayUI();
    var total = tray.reduce(function (a, i) { return a + i.price; }, 0);
    trayEl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9h13l-1.2 9.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 9Z"/><path d="M7 9c0-3 2-5 5-5"/></svg>' +
      '<span>Tray · ' + tray.length + (tray.length === 1 ? ' item' : ' items') + '</span><span class="kl-tray__total">' + inr(total) + '</span>';
    trayEl.classList.toggle('show', tray.length > 0);
    if (!tray.length) { panelEl.classList.remove('open'); return; }
    panelEl.innerHTML = '<h3>Your tray</h3><p>Built from the board — show it at the Kapiloka counter.</p><ul>' +
      tray.map(function (it, idx) {
        return '<li><span>' + it.name + '</span><span>' + inr(it.price) + '</span><button type="button" data-rm="' + idx + '" aria-label="Remove ' + it.name + '">×</button></li>';
      }).join('') +
      '</ul><div class="kl-panel__foot"><span>Total</span><span>' + inr(total) + '</span></div>' +
      '<button type="button" class="kl-panel__clear">Clear tray</button>';
    panelEl.querySelectorAll('[data-rm]').forEach(function (b) {
      b.addEventListener('click', function () { tray.splice(+b.getAttribute('data-rm'), 1); renderTray(); });
    });
    panelEl.querySelector('.kl-panel__clear').addEventListener('click', function () { tray = []; renderTray(); });
  }
  function toast(name, price) {
    ensureTrayUI();
    toastEl.innerHTML = 'Added to tray — ' + name + ' · <b>' + inr(price) + '</b>';
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2100);
  }
  function parseRow(li) {
    var strong = li.querySelector('strong'), span = li.querySelector('span');
    if (!strong) return null;
    var txt = strong.textContent.trim();
    var m = txt.match(/₹\s*(\d+)/);
    if (!m) return null;
    var price = +m[1], name;
    if (txt.indexOf('·') > -1) name = txt.split('·')[0].trim();
    else name = span ? span.textContent.trim() : 'Item';
    return { name: name, price: price };
  }
  document.querySelectorAll('.terms__rows li, .format-slide__rows li').forEach(function (li) {
    li.setAttribute('tabindex', '0');
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', 'Add ' + (parseRow(li) ? parseRow(li).name : 'item') + ' to tray');
    li.title = 'Tap to add to your tray';
    function add() {
      var item = parseRow(li);
      if (!item) return;
      tray.push(item); renderTray(); toast(item.name, item.price);
      li.classList.remove('kl-added'); void li.offsetWidth; li.classList.add('kl-added');
      if (trayEl && !reduce) { trayEl.classList.remove('bounce'); void trayEl.offsetWidth; trayEl.classList.add('bounce'); }
    }
    li.addEventListener('click', add);
    li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); add(); } });
  });
  window.__kl = { count: function () { return tray.length; }, total: function () { return tray.reduce(function (a, i) { return a + i.price; }, 0); } };

  /* ---------- 5 · tilt cards + magnetic buttons (desktop) ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.benefit').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
        var ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) / r.width * 6;
        var dy = (e.clientY - r.top - r.height / 2) / r.height * 6;
        btn.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      });
      btn.addEventListener('pointerleave', function () { btn.style.translate = ''; });
    });
  }
})();
