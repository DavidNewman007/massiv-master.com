// МАССИВ МАСТЕР — анимации: прелоадер, плавная прокрутка, видео-герой, манифест,
// горизонтальный «Путь дерева», параллакс, появление блоков, курсор.
// Содержимое видно и без этого файла; при prefers-reduced-motion анимации отключены.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const desktop = matchMedia('(min-width: 801px)');
  const hasGsap = window.gsap && window.ScrollTrigger;
  if (reduce) root.classList.add('no-motion');

  // --- появление блоков ---
  // Заголовки с data-reveal-lines режем на слова, сохраняя <em>.
  $$('[data-reveal-lines]').forEach((h) => {
    const parts = [];
    [...h.childNodes].forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((t) => parts.push(t.trim() ? { t } : { s: t }));
      else parts.push({ el: n });
    });
    h.textContent = '';
    let i = 0;
    parts.forEach((p) => {
      if (p.s) return h.append(' ');
      const wrap = document.createElement('span'); wrap.className = 'rl-wrap';
      const inner = document.createElement('span'); inner.className = 'rl'; inner.style.setProperty('--d', `${i++ * 0.07}s`);
      p.el ? inner.append(p.el) : (inner.textContent = p.t);
      wrap.append(inner); h.append(wrap);
    });
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
  $$('[data-reveal], [data-clip-reveal], [data-reveal-lines]').forEach((el) => (reduce ? el.classList.add('in') : io.observe(el)));

  // --- счётчики ---
  const cio = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.countTo, t0 = performance.now(), dur = 1600;
    if (reduce || to === 0) { el.textContent = to; return; }
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('[data-count-to]').forEach((el) => cio.observe(el));

  // --- видео-герой: подписи к кадрам монтажа (каждый клип ≈3,8 с) ---
  const video = $('[data-hero-video]');
  if (video) {
    const SEG = 3.8;
    const num = $('[data-cap-num]'), text = $('[data-cap-text]'), bar = $('[data-cap-bar]');
    let last = -1;
    const caps = () => JSON.parse((video.currentSrc || '').includes('mobile') ? video.dataset.capsMob : video.dataset.caps);
    video.addEventListener('timeupdate', () => {
      const t = video.currentTime, i = Math.min(4, Math.floor(t / SEG));
      bar.style.width = `${Math.min(100, ((t - i * SEG) / SEG) * 100)}%`;
      if (i !== last) { last = i; num.textContent = `0${i + 1}`; text.textContent = caps()[i]; }
    });
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); }
  }

  // --- манифест: слова проявляются по мере прокрутки ---
  const mf = $('[data-words]');
  let words = [];
  if (mf) {
    mf.innerHTML = mf.textContent.split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
    words = $$('.w', mf);
  }

  // --- курсор и «магнитные» кнопки ---
  if (fine && !reduce) {
    root.classList.add('has-cursor');
    const cur = $('.cursor');
    let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
    addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
    const loop = () => { cx += (mx - cx) * 0.2; cy += (my - cy) * 0.2; cur.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); };
    loop();
    document.addEventListener('mouseover', (e) => cur.classList.toggle('big', !!e.target.closest('a, button, [data-open]')));
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('mousemove', (e) => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.18}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`; });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
    // плавающее фото над списком разделов
    const list = $('[data-hover-list]'), fl = $('[data-hover-float]');
    if (list && fl) {
      const img = $('img', fl); let fx = 0, fy = 0, tx = 0, ty = 0, on = false;
      $$('[data-hover-img]', list).forEach((a) => {
        a.addEventListener('mouseenter', () => { img.src = a.dataset.hoverImg; fl.classList.add('on'); on = true; });
        a.addEventListener('mouseleave', () => { fl.classList.remove('on'); on = false; });
      });
      addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      const fol = () => { fx += (tx - fx) * 0.12; fy += (ty - fy) * 0.12; if (on) fl.style.left = `${fx}px`, fl.style.top = `${fy}px`; requestAnimationFrame(fol); };
      fol();
    }
  }

  // --- прелоадер ---
  const pre = $('[data-preloader]');
  const heroIn = () => {
    if (!hasGsap || reduce) return;
    gsap.from('[data-hero-word]', { yPercent: 110, duration: 1.4, ease: 'expo.out', stagger: 0.12 });
    gsap.from('.hero2-kicker span, .hero2-lead, .hero2-cta, .hero2-caption', { y: 30, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08, delay: 0.25 });
    gsap.from('[data-hero-media]', { clipPath: 'inset(0 0 0 100%)', duration: 1.6, ease: 'expo.inOut' });
  };
  if (pre) {
    let seen = false;
    try { seen = sessionStorage.getItem('mm-pre') === '1'; sessionStorage.setItem('mm-pre', '1'); } catch { /* без хранилища — показываем */ }
    if (seen || reduce || !hasGsap) { pre.classList.add('done'); heroIn(); }
    else {
      const cnt = $('[data-pre-count]'), o = { v: 0 };
      const tl = gsap.timeline({ onComplete: () => { pre.classList.add('done'); } });
      tl.from('.pre-logo', { rotate: -120, scale: 0.4, opacity: 0, duration: 1.2, ease: 'expo.out' })
        .from('.pre-word', { letterSpacing: '1.4em', opacity: 0, duration: 1.2, ease: 'expo.out' }, 0.1)
        .to(o, { v: 100, duration: 1.4, ease: 'power2.inOut', onUpdate: () => { cnt.textContent = Math.round(o.v); } }, 0)
        .to(pre, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, 1.5)
        .add(heroIn, 1.75);
    }
  }

  if (!hasGsap || reduce) { words.forEach((w) => (w.style.opacity = 1)); return; }

  // --- плавная прокрутка ---
  gsap.registerPlugin(ScrollTrigger);
  let lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.mmLenis = lenis;
    // бегущая строка чуть «наклоняется» от скорости прокрутки
    const mq = $$('.marquee-in');
    lenis.on('scroll', ({ velocity }) => { const s = Math.max(-8, Math.min(8, velocity * 0.4)); mq.forEach((m) => (m.style.transform = `skewX(${-s}deg)`)); });
  }

  // герой уменьшается в «окно» при прокрутке
  if ($('[data-hero]')) {
    gsap.to('[data-hero-media] video', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero2-in', { yPercent: -12, opacity: 0.2, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: '80% top', scrub: true } });
  }

  if (words.length) {
    ScrollTrigger.create({ trigger: mf, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: (s) => { const n = s.progress * words.length; words.forEach((w, i) => (w.style.opacity = Math.max(0.14, Math.min(1, n - i + 1)))); } });
  }

  // параллакс внутри рамок
  $$('[data-parallax]').forEach((el) => gsap.fromTo(el, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // горизонтальный путь дерева — только на широких экранах
  const track = $('[data-hpath-track]');
  if (track) {
    ScrollTrigger.matchMedia({
      '(min-width: 801px)': () => {
        const dist = () => track.scrollWidth - innerWidth;
        const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '[data-hpath-pin]', start: 'top top', end: () => `+=${dist()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 } });
        gsap.to('[data-hpath-bar]', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '[data-hpath-pin]', start: 'top top', end: () => `+=${dist()}`, scrub: true } });
        $$('[data-parallax-x]', track).forEach((el) => gsap.fromTo(el, { xPercent: 6 }, { xPercent: -6, ease: 'none', scrollTrigger: { trigger: el, containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }));
      },
    });
  }
  addEventListener('load', () => ScrollTrigger.refresh());
})();

