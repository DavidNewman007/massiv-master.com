// «Изюминки» (22.10.2026, на показ владельцу — каждую можно выключить флагом ниже):
//  STAMP — при «В подборку» на фото выжигается клеймо мастерской с дымком;
//  LOUPE — лупа фактуры: круглое увеличение дерева под мышью на фото каталога и историй;
//  RINGS — эмблема в левом нижнем углу растит годовые кольца по мере прокрутки, клик — наверх.
(() => {
  const ON = { STAMP: true, LOUPE: false, RINGS: true }; // лупа выключена по просьбе владельца 22.10.2026
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EN = document.documentElement.lang === 'en';
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // ---------- клеймо ----------
  if (ON.STAMP) {
    const stage = $('.g2-stage');
    const logo = $('.brand .logo-mark');
    $$('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
      if (!stage || !logo) return;
      const wrap = document.createElement('div');
      wrap.className = 'stamp';
      wrap.innerHTML = `<svg viewBox="0 0 260 260" aria-hidden="true">
        <defs><path id="st-top" d="M38,130 a92,92 0 1,1 184,0"/><path id="st-bot" d="M30,130 a100,100 0 0,0 200,0"/></defs>
        <circle cx="130" cy="130" r="122" fill="none" stroke="currentColor" stroke-width="5"/>
        <circle cx="130" cy="130" r="112" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 6"/>
        <text><textPath href="#st-top" startOffset="50%" text-anchor="middle">${EN ? 'MASSIV MASTER' : 'МАССИВ МАСТЕР'}</textPath></text>
        <text class="b"><textPath href="#st-bot" startOffset="50%" text-anchor="middle">${EN ? 'MADE IN SOCHI' : 'СДЕЛАНО В СОЧИ'}</textPath></text>
      </svg>`;
      const mark = logo.cloneNode(true);
      mark.setAttribute('class', 'stamp-mark');
      wrap.appendChild(mark);
      for (let i = 0; i < 5; i++) {
        const p = document.createElement('i');
        p.className = 'puff';
        p.style.setProperty('--x', `${(Math.random() - 0.5) * 90}px`);
        p.style.setProperty('--d', `${0.2 + i * 0.09}s`);
        wrap.appendChild(p);
      }
      stage.appendChild(wrap);
      setTimeout(() => wrap.classList.add('out'), reduce ? 1200 : 2200);
      setTimeout(() => wrap.remove(), reduce ? 1700 : 3200);
    }));
  }

  // ---------- лупа фактуры ----------
  if (ON.LOUPE && fine && !reduce) {
    const lens = document.createElement('div');
    lens.className = 'loupe';
    lens.setAttribute('aria-hidden', 'true');
    document.body.appendChild(lens);
    const Z = 2.6, R = 95;
    let active = null;
    const move = (e) => {
      if (!active) return;
      const img = $('img', active);
      if (!img || !img.naturalWidth) return;
      const r = img.getBoundingClientRect();
      // object-fit: cover — считаем, какой кусок исходника реально виден
      const s = Math.max(r.width / img.naturalWidth, r.height / img.naturalHeight);
      const w = img.naturalWidth * s, h = img.naturalHeight * s;
      const ox = (r.width - w) / 2, oy = (r.height - h) / 2;
      const px = e.clientX - r.left - ox, py = e.clientY - r.top - oy;
      lens.style.backgroundSize = `${w * Z}px ${h * Z}px`;
      lens.style.backgroundPosition = `${-(px * Z - R)}px ${-(py * Z - R)}px`;
      lens.style.transform = `translate(${e.clientX - R}px, ${e.clientY - R}px)`;
    };
    $$('[data-loupe]').forEach((el) => {
      el.addEventListener('mouseenter', (e) => {
        active = el;
        const img = $('img', el);
        lens.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
        // крупный файл подгружаем в фоне и подменяем, когда готов
        const hi = new Image();
        hi.onload = () => { if (active === el) lens.style.backgroundImage = `url("${el.dataset.loupe}")`; };
        hi.src = el.dataset.loupe;
        lens.classList.add('on');
        document.documentElement.classList.add('loupe-on');
        move(e);
      });
      el.addEventListener('mousemove', move);
      el.addEventListener('mouseleave', () => { active = null; lens.classList.remove('on'); document.documentElement.classList.remove('loupe-on'); });
    });
  }

  // ---------- растущие годовые кольца ----------
  if (ON.RINGS) {
    const N = 12, C = 32;
    const ring = (i) => {
      const base = 3.2 + i * 2.35, pts = [];
      for (let k = 0; k <= 64; k++) {
        const a = (k / 64) * Math.PI * 2;
        const rr = base * (1 + 0.05 * Math.sin(3 * a + i * 0.9) + 0.035 * Math.sin(5 * a + i * 1.7));
        pts.push(`${(C + rr * Math.cos(a)).toFixed(2)},${(C + rr * Math.sin(a)).toFixed(2)}`);
      }
      return `<path d="M${pts.join('L')}Z"/>`;
    };
    const el = document.createElement('a');
    el.className = 'rings';
    el.href = '#main';
    el.setAttribute('aria-label', EN ? 'Back to top' : 'Наверх');
    el.innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle class="core" cx="32" cy="32" r="1.6"/>${Array.from({ length: N }, (_, i) => ring(i)).join('')}</svg><span class="rings-lbl">${EN ? 'Ring' : 'Кольцо'} <b>00</b></span>`;
    document.body.appendChild(el);
    const paths = $$('path', el), lbl = $('b', el);
    paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.dataset.l = L; });
    let last = -1;
    const upd = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const prog = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      el.classList.toggle('on', scrollY > 240);
      const x = prog * N;
      paths.forEach((p, i) => { p.style.strokeDashoffset = p.dataset.l * (1 - Math.min(1, Math.max(0, x - i))); });
      const n = Math.min(N, Math.floor(x + 0.001));
      if (n !== last) { last = n; lbl.textContent = String(n).padStart(2, '0'); }
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
    el.addEventListener('click', (e) => { e.preventDefault(); if (window.mmLenis) window.mmLenis.scrollTo(0, { duration: 1.6 }); else scrollTo({ top: 0, behavior: 'smooth' }); });
  }
})();
