// Галерея товара: лента фото листается мышью (перетаскиванием), пальцем, стрелками
// и клавишами ← →; миниатюры под лентой. Клик — полноэкранный просмотр PhotoSwipe
// (зум, перетаскивание, свайп) с лентой миниатюр внизу.
import PhotoSwipeLightbox from './vendor/photoswipe-lightbox.esm.min.js';

const root = document.querySelector('[data-g2]');
if (root) {
  const track = root.querySelector('[data-g2-track]');
  const slides = [...track.querySelectorAll('.g2-slide')];
  const thumbs = [...root.querySelectorAll('[data-g2-thumb]')];
  const cur = root.querySelector('[data-g2-cur]');
  let index = 0;

  const go = (i, smooth = true) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: slides[index].offsetLeft, behavior: smooth ? 'smooth' : 'auto' });
  };
  const mark = (i) => {
    if (cur) cur.textContent = i + 1;
    thumbs.forEach((t, k) => t.setAttribute('aria-current', k === i));
    const th = thumbs[i];
    if (th) th.parentElement.scrollTo({ left: th.offsetLeft - th.parentElement.clientWidth / 2 + th.clientWidth / 2, behavior: 'smooth' });
  };
  let raf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const i = Math.round(track.scrollLeft / track.clientWidth); if (i !== index) { index = i; } mark(index); });
  }, { passive: true });

  root.querySelector('[data-g2-prev]')?.addEventListener('click', () => go(index - 1));
  root.querySelector('[data-g2-next]')?.addEventListener('click', () => go(index + 1));
  thumbs.forEach((t) => t.addEventListener('click', () => go(+t.dataset.g2Thumb)));
  track.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); } });

  // перетаскивание мышью (палец и тачпад и так листают ленту нативно)
  let down = null, moved = false;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = { x: e.clientX, left: track.scrollLeft }; moved = false;
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!moved && Math.abs(dx) > 4) { moved = true; track.classList.add('dragging'); }
    if (!moved) return;
    track.scrollLeft = down.left - dx;
  });
  addEventListener('pointerup', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    track.classList.remove('dragging');
    const start = Math.round(down.left / track.clientWidth);
    down = null;
    if (!moved) return;
    go(Math.abs(dx) > track.clientWidth * 0.12 ? start + (dx < 0 ? 1 : -1) : start);
  });

  // полноэкранный просмотр
  const lightbox = new PhotoSwipeLightbox({
    gallery: track,
    children: '.g2-slide',
    pswpModule: () => import('./vendor/photoswipe.esm.min.js'),
    bgOpacity: 0.96,
    wheelToZoom: true,
    initialZoomLevel: 'fit',
    secondaryZoomLevel: 2,
    maxZoomLevel: 4,
    padding: { top: 30, bottom: thumbs.length ? 110 : 30, left: 0, right: 0 },
  });
  lightbox.on('uiRegister', () => {
    if (!thumbs.length) return;
    lightbox.pswp.ui.registerElement({
      name: 'mm-thumbs', className: 'pswp-mm-thumbs', appendTo: 'root',
      onInit: (el, pswp) => {
        el.innerHTML = thumbs.map((t, i) => `<button data-i="${i}">${t.innerHTML}</button>`).join('');
        const bs = [...el.children];
        const upd = () => {
          bs.forEach((b, i) => b.classList.toggle('on', i === pswp.currIndex));
          const b = bs[pswp.currIndex]; el.scrollTo({ left: b.offsetLeft - el.clientWidth / 2 + b.clientWidth / 2, behavior: 'smooth' });
        };
        bs.forEach((b) => b.addEventListener('click', () => pswp.goTo(+b.dataset.i)));
        pswp.on('change', upd); upd();
      },
    });
  });
  lightbox.on('change', () => { const p = lightbox.pswp; if (p) { go(p.currIndex, false); mark(p.currIndex); } });
  lightbox.init();
  // клик после перетаскивания не должен открывать просмотр
  track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopImmediatePropagation(); moved = false; } }, true);
  root.querySelector('[data-g2-full]')?.addEventListener('click', () => lightbox.loadAndOpen(index, { gallery: track }));
}
