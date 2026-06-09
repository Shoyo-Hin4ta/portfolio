/* ============================================================
   app.js — motion + interaction layer
   Preloader · custom cursor · magnetic hover · scroll reveals ·
   parallax · animated counters · word-by-word statement.
   Graceful: if GSAP is missing, content stays visible.
   ============================================================ */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  document.documentElement.classList.add('js');
  if (hasGSAP && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* ---------- helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const lerp = (a, b, n) => a + (b - a) * n;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ============================================================
     SPLIT the hero headline lines into animatable spans
     ============================================================ */
  function wrapHeadline() {
    $$('.hero-headline .line').forEach((line) => {
      const span = document.createElement('span');
      span.innerHTML = line.innerHTML;
      line.innerHTML = '';
      line.appendChild(span);
    });
  }
  wrapHeadline();

  /* ----------------------------------------------------------
     Pre-hide the hero-intro elements immediately, before the
     preloader curtain reveals them. Without this they sit at
     rest during the curtain slide, then heroIntro() replays
     them — which reads as the hero text animating a second
     time once the page loads. This makes heroIntro their first
     and only entrance.
     ---------------------------------------------------------- */
  function setHeroInitial() {
    if (!hasGSAP || reduce) return;
    gsap.set('.hero-headline .line > span', { yPercent: 115 });
    gsap.set('.hero-eyebrow', { opacity: 0, y: 16 });
    gsap.set('.hero-sub', { opacity: 0, y: 24 });
    gsap.set('.hero-meta > *', { opacity: 0, y: 24 });
    gsap.set('.scroll-cue', { opacity: 0 });
    gsap.set('.site-header > *', { opacity: 0, y: -14 });
  }
  setHeroInitial();

  /* ============================================================
     PRELOADER
     ============================================================ */
  function runPreloader(done) {
    const pl = $('#preloader');
    if (!pl) { done(); return; }
    const count = $('#pl-count-num');
    const bar = $('.pl-bar');
    const marks = $$('.pl-mark span');

    if (!hasGSAP || reduce) {
      // simple fallback
      let n = 0;
      const iv = setInterval(() => {
        n = Math.min(100, n + 7);
        if (count) count.textContent = String(n).padStart(3, '0');
        if (bar) bar.style.transform = `scaleX(${n / 100})`;
        if (n >= 100) {
          clearInterval(iv);
          pl.style.transition = 'opacity .6s ease, visibility .6s';
          pl.style.opacity = '0'; pl.style.visibility = 'hidden';
          setTimeout(done, 400);
        }
      }, 80);
      return;
    }

    const tl = gsap.timeline();
    tl.to(marks, { yPercent: -100, stagger: 0.06, duration: 0.7, ease: 'power3.out' }, 0.1);
    const counter = { v: 0 };
    tl.to(counter, {
      v: 100, duration: 1.25, ease: 'power2.inOut',
      onUpdate() {
        const n = Math.round(counter.v);
        if (count) count.textContent = String(n).padStart(3, '0');
        if (bar) bar.style.transform = `scaleX(${n / 100})`;
      }
    }, 0.1);
    tl.to('.pl-mark span', { yPercent: -210, stagger: 0.04, duration: 0.5, ease: 'power3.in' }, '+=0.15');
    tl.to('.pl-count, .pl-bar-wrap', { opacity: 0, duration: 0.3 }, '<');
    tl.to(pl, {
      yPercent: -100, duration: 0.85, ease: 'expo.inOut',
      onComplete() { pl.style.display = 'none'; done(); }
    }, '-=0.1');
  }

  /* ============================================================
     HERO intro (after preloader)
     ============================================================ */
  function heroIntro() {
    const spans = $$('.hero-headline .line > span');
    const em = $('.hero-headline em');
    if (!hasGSAP || reduce) {
      spans.forEach(s => { s.style.transform = 'none'; });
      if (em) em.classList.add('drawn');
      gsapSafeShow();
      return;
    }
    // Elements were pre-hidden by setHeroInitial(); reveal them to their
    // resting state exactly once. Same choreography/timing as before, just
    // `to` instead of `from` so the entrance can't replay after the preloader.
    const tl = gsap.timeline();
    tl.to(spans, { yPercent: 0, duration: 1.05, stagger: 0.09, ease: 'power4.out' });
    tl.add(() => { if (em) em.classList.add('drawn'); }, '-=0.5');
    tl.to('.hero-eyebrow', { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, 0.2);
    tl.to('.hero-sub', { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.7');
    tl.to('.hero-meta > *', { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: 'power2.out' }, '-=0.6');
    tl.to('.scroll-cue', { opacity: 1, duration: 0.6 }, '-=0.4');
    tl.to('.site-header > *', { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' }, '-=0.8');
  }

  function gsapSafeShow() {
    $$('.reveal, .reveal-now').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
  }

  /* ============================================================
     SCROLL REVEALS + PARALLAX (scrollytelling)
     ============================================================ */
  function scrollScenes() {
    if (!hasGSAP || !window.ScrollTrigger || reduce) { gsapSafeShow(); return; }

    // generic reveals
    $$('.reveal').forEach((el) => {
      const d = parseFloat(el.dataset.delay || 0);
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, delay: d, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });

    // staggered groups
    $$('[data-stagger]').forEach((group) => {
      const kids = $$(':scope > *', group);
      gsap.set(kids, { opacity: 0, y: 30 });
      gsap.to(kids, {
        opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 82%' }
      });
    });

    // parallax (data-parallax = speed; negative moves up faster)
    $$('[data-parallax]').forEach((el) => {
      const speed = parseFloat(el.dataset.parallax);
      gsap.to(el, {
        yPercent: speed, ease: 'none',
        scrollTrigger: { trigger: el.closest('section') || el, start: 'top bottom', end: 'bottom top', scrub: 1 }
      });
    });

    // statement: word fade as it scrolls through
    const words = $$('.statement .w');
    if (words.length) {
      gsap.to(words, {
        opacity: 1, stagger: 0.02, ease: 'none',
        scrollTrigger: { trigger: '.statement', start: 'top 82%', end: 'top 35%', scrub: true }
      });
    }

    // section titles: subtle slide
    $$('.sec-title').forEach((t) => {
      gsap.from(t, {
        yPercent: 40, opacity: 0.0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: t, start: 'top 90%' }
      });
    });

    // animated counters
    $$('[data-count]').forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const dec = (el.dataset.dec ? parseInt(el.dataset.dec) : 0);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const o = { v: 0 };
      gsap.to(o, {
        v: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
        onUpdate() { const val = dec > 0 ? o.v.toFixed(dec) : Math.round(o.v).toLocaleString('en-US'); el.textContent = prefix + val + suffix; }
      });
    });

    // work cards: rise + gentle scale as they enter
    $$('.work-card').forEach((card) => {
      gsap.from(card, {
        y: 60, opacity: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: card, start: 'top 85%' }
      });
    });

    // feature agent pills cascade
    const pills = $$('.agent-pill');
    if (pills.length) {
      gsap.from(pills, {
        x: 36, opacity: 0, duration: 0.7, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: '.feature', start: 'top 70%' }
      });
    }

    // contact head per-word rise
    const cwords = $$('.contact-head .cw');
    if (cwords.length) {
      gsap.from(cwords, {
        yPercent: 110, opacity: 0, duration: 1, stagger: 0.08, ease: 'power4.out',
        scrollTrigger: { trigger: '.site-footer', start: 'top 75%' }
      });
    }
  }

  /* ============================================================
     SCROLL PROGRESS BAR
     ============================================================ */
  function progressBar() {
    const bar = $('.scroll-progress');
    if (!bar) return;
    function upd() {
      const h = document.body.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${clamp(window.scrollY / Math.max(1, h), 0, 1)})`;
    }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ============================================================
     MARQUEE (infinite, scroll-velocity aware)
     ============================================================ */
  function marquee() {
    const track = $('.marquee-track');
    if (!track) return;
    // duplicate content to loop seamlessly
    track.innerHTML += track.innerHTML;
    let x = 0, base = 0.6, vel = 0, last = performance.now();
    const half = () => track.scrollWidth / 2;
    let lastScroll = window.scrollY;
    window.addEventListener('scroll', () => {
      vel = (window.scrollY - lastScroll);
      lastScroll = window.scrollY;
    }, { passive: true });
    function tick(now) {
      const dt = Math.min(40, now - last); last = now;
      x -= (base + vel * 0.25) * (dt / 16.6);
      vel *= 0.9;
      const hw = half();
      if (x <= -hw) x += hw;
      if (x > 0) x -= hw;
      track.style.transform = `translateX(${x}px)`;
      requestAnimationFrame(tick);
    }
    if (!reduce) requestAnimationFrame(tick);
  }

  /* ============================================================
     CUSTOM CURSOR + MAGNETIC
     ============================================================ */
  function cursor() {
    if (coarse || reduce) return;
    const dot = $('.cursor-dot');
    const ring = $('.cursor-ring');
    const label = $('.cursor-label');
    if (!dot || !ring) return;

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;
    window.addEventListener('pointermove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
    window.addEventListener('pointerup', () => ring.classList.remove('is-down'));

    function loop() {
      rx = lerp(rx, mx, 0.18); ry = lerp(ry, my, 0.18);
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      if (label) label.style.transform = `translate(${rx}px, ${ry + 40}px) translate(-50%,-50%) scale(${label.classList.contains('show') ? 1 : 0})`;
      requestAnimationFrame(loop);
    }
    loop();

    // hover targets
    $$('a, button, .work-card, .proj-card, .skill-col li, [data-magnetic]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        ring.classList.add('is-hover');
        const lab = el.getAttribute('data-cursor');
        if (lab && label) { label.textContent = lab; label.classList.add('show'); }
      });
      el.addEventListener('pointerleave', () => {
        ring.classList.remove('is-hover');
        if (label) label.classList.remove('show');
      });
    });

    // magnetic elements
    $$('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 0.4;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform .5s cubic-bezier(0.22,1,0.36,1)';
        el.style.transform = 'translate(0,0)';
        setTimeout(() => { el.style.transition = ''; }, 500);
      });
    });
  }

  /* ============================================================
     WORK CARD spotlight (mouse-follow glow var)
     ============================================================ */
  function cardSpotlight() {
    $$('.work-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
      });
    });
  }

  /* ============================================================
     SMOOTH ANCHOR NAV
     ============================================================ */
  function anchors() {
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const t = $(id);
        if (!t) return;
        e.preventDefault();
        const y = t.getBoundingClientRect().top + window.scrollY - 10;
        window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
      });
    });
  }

  /* ============================================================
     HEADER scrolled state
     ============================================================ */
  function headerScroll() {
    const h = $('.site-header');
    if (!h) return;
    function upd() { h.classList.toggle('scrolled', window.scrollY > window.innerHeight * 0.6); }
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ============================================================
     PIPELINE — pinned scrollytelling (GimmieAI search anatomy)
     ============================================================ */
  function pipelineScrolly() {
    const sec = $('#pipeline');
    if (!sec) return;
    const pin = $('.pipeline-pin', sec);
    const nodes = $$('.pipe-node', sec);
    const fill = $('.pipe-line-fill', sec);
    const cap = $('.pipeline-caption', sec);
    const pcNum = $('.pc-num', sec), pcTitle = $('.pc-title', sec), pcBody = $('.pc-body', sec);
    const data = [
      { t: 'You describe a person', b: '\u201CMy sister, loves ceramics and trail runs, mid-30s.\u201D A plain-language vibe goes in. No filters, no categories, no dropdowns.' },
      { t: 'Claude plans the search', b: 'A Claude planner edge function turns that sentence into a structured query plan: intents, constraints, price band, and which retailers are worth hitting.' },
      { t: 'Fan out to every store at once', b: 'A parallel fetcher hits Amazon, Etsy, Target, Poshmark and the Shopify Catalog MCP concurrently, not one after another, so latency is the slowest store, not the sum.' },
      { t: 'Unify & dedupe', b: 'Every result collapses into one UnifiedProduct type with cross-retailer dedup, so the same mug from three stores shows up once, at its best price.' },
      { t: 'Cached & served in ~10s', b: 'Versioned Redis caching keeps repeat searches instant, and the ranked set streams back to the shopper in about ten seconds.' }
    ];
    const N = data.length;
    let shown = -1;

    function render(idx, prog) {
      nodes.forEach((n, i) => {
        n.classList.toggle('current', i === idx);
        n.classList.toggle('done', i < idx);
      });
      if (fill) fill.style.width = (prog * 100).toFixed(1) + '%';
      if (idx !== shown) {
        shown = idx;
        const d = data[idx];
        if (pcNum) pcNum.textContent = String(idx + 1).padStart(2, '0') + ' / ' + String(N).padStart(2, '0');
        if (pcTitle) pcTitle.textContent = d.t;
        if (pcBody) pcBody.textContent = d.b;
        if (cap) { cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap'); }
      }
    }

    if (!hasGSAP || !window.ScrollTrigger || reduce) {
      render(N - 1, 1);
      return;
    }
    render(0, 0);
    const dist = Math.min(window.innerHeight, 880) * N * 0.78;
    ScrollTrigger.create({
      trigger: sec,
      start: 'top top',
      end: '+=' + dist,
      pin: pin,
      pinSpacing: true,
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate(self) {
        const p = self.progress;
        const idx = Math.max(0, Math.min(N - 1, Math.floor(p * N - 0.0001)));
        render(idx, p);
      }
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  let __booted = false;
  function boot() {
    if (__booted) return;
    __booted = true;
    progressBar(); marquee(); cursor(); cardSpotlight(); anchors(); headerScroll();
    pipelineScrolly();
    scrollScenes();
    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
  }

  window.addEventListener('load', () => {
    if (hasGSAP && window.ScrollTrigger) ScrollTrigger.refresh();
  });

  let __started = false;
  function start() {
    if (__started) return;
    __started = true;
    runPreloader(() => {
      boot();
      heroIntro();
    });
    // Safety net: if rAF/GSAP never ticks (e.g. tab opened in the background,
    // reduced power mode), reveal everything statically so the page is never
    // trapped behind the preloader. No-op when the ticker is alive.
    setTimeout(() => {
      const alive = !window.gsap || gsap.ticker.frame > 3;
      if (alive) return;
      try {
        const pl = document.getElementById('preloader');
        if (pl) { pl.style.display = 'none'; }
        boot();
        $$('.hero-headline .line > span').forEach((s) => { s.style.transform = 'none'; });
        const em = $('.hero-headline em'); if (em) em.classList.add('drawn');
        gsapSafeShow();
        $$('.hero-eyebrow, .hero-sub, .hero-meta > *, .scroll-cue, .site-header > *')
          .forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
      } catch (e) { /* noop */ }
    }, 2600);
  }
  // Bulletproof boot: whichever fires first wins (guarded to run once).
  document.addEventListener('DOMContentLoaded', start);
  window.addEventListener('load', start);
  if (document.readyState !== 'loading') start();
  setTimeout(start, 0);
})();
