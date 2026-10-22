// МАССИВ МАСТЕР — поведение страниц: меню, фильтры каталога, галерея, подборка.
// Подборка хранится в localStorage этого браузера; если хранилище недоступно —
// работает в памяти до перезагрузки страницы.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CAT = window.MM_CATALOG || {};
  const TG = window.MM_TG;

  // --- шапка и меню ---
  const header = $('[data-header]');
  const onScroll = () => header && header.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const menuBtn = $('[data-menu]'), nav = $('[data-nav]');
  menuBtn && menuBtn.addEventListener('click', () => {
    const open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', open); nav.classList.toggle('open', open);
  });

  // --- уведомление ---
  const toastEl = $('[data-toast]'); let toastT;
  const toast = (t) => { if (!toastEl) return; toastEl.textContent = t; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2600); };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); return true; } catch { return false; } };

  // --- подборка ---
  const KEY = 'mm-bag';
  let mem = [];
  const readBag = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter((s) => CAT[s]); } catch { return mem; } };
  const writeBag = (b) => { mem = b; try { localStorage.setItem(KEY, JSON.stringify(b)); } catch { /* приватный режим */ } renderCount(); };
  const renderCount = () => { const n = readBag().length; $$('[data-bag-count]').forEach((el) => { el.textContent = n; el.hidden = !n; }); };
  renderCount();
  $$('[data-add]').forEach((btn) => btn.addEventListener('click', () => {
    const { slug } = JSON.parse(btn.dataset.add); const b = readBag();
    if (!b.includes(slug)) { b.push(slug); writeBag(b); toast('Добавлено в подборку'); } else toast('Уже в подборке');
  }));

  // Telegram: ссылка уже содержит текст; на всякий случай кладём его и в буфер обмена.
  $$('[data-tg-msg]').forEach((a) => a.addEventListener('click', () => { copy(a.dataset.tgMsg); }));

  const bagList = $('[data-bag-list]');
  if (bagList) {
    const render = () => {
      const b = readBag();
      $('[data-bag-empty]').hidden = !!b.length; $('[data-bag-summary]').hidden = !b.length;
      bagList.innerHTML = b.map((s) => `<div class="bag-row"><img src="${CAT[s].img}" alt=""><div><a href="/item/${s}/">${CAT[s].t}</a><p>${CAT[s].pt}</p></div><button data-rm="${s}" aria-label="Убрать">×</button></div>`).join('');
      const priced = b.filter((s) => CAT[s].p && !CAT[s].u && !CAT[s].f);
      const sum = priced.reduce((a, s) => a + CAT[s].p, 0);
      $('[data-bag-total]').textContent = sum ? `Итого: ${sum.toLocaleString('ru-RU')} ₽${priced.length < b.length ? ' + позиции с ценой по запросу' : ''}` : 'Цены уточню в переписке';
      const text = `Здравствуйте! Хочу заказать:\n${b.map((s, i) => `${i + 1}. ${CAT[s].t} — ${CAT[s].pt}\n${window.MM_SITE}/item/${s}/`).join('\n')}`;
      const send = $('[data-bag-send]'); send.href = `https://t.me/${TG}?text=${encodeURIComponent(text)}`; send.dataset.text = text;
      $$('[data-rm]').forEach((x) => x.addEventListener('click', () => { writeBag(readBag().filter((s) => s !== x.dataset.rm)); render(); }));
    };
    render();
    $('[data-bag-send]').addEventListener('click', (e) => copy(e.currentTarget.dataset.text));
    $('[data-bag-copy]').addEventListener('click', async () => toast((await copy($('[data-bag-send]').dataset.text)) ? 'Текст скопирован' : 'Не удалось скопировать'));
  }

  // --- каталог ---
  const grid = $('[data-grid]');
  // панель фильтров «прилипла» под шапкой → класс .stuck (стеклянная подложка)
  const sentinel = $('[data-filters-sentinel]'), fbar = $('[data-filters]');
  if (sentinel && fbar) new IntersectionObserver(([e]) => fbar.classList.toggle('stuck', !e.isIntersecting && e.boundingClientRect.top < 100), { rootMargin: '-77px 0px 0px 0px' }).observe(sentinel);

  if ($('[data-filters]') && grid) {
    const params = new URLSearchParams(location.search);
    const st = { cat: params.get('cat') || 'all', species: params.get('species') || 'all', view: params.get('view') || 'sale' };
    const SALE = ['available', 'ask', 'order', 'work'];
    const titles = { all: 'Всё дерево мастерской' };
    $$('[data-f-cat]').forEach((b) => { if (b.dataset.fCat !== 'all') titles[b.dataset.fCat] = b.textContent; });
    const apply = () => {
      let n = 0;
      $$('.card', grid).forEach((c) => {
        const ok = (st.cat === 'all' || c.dataset.cat === st.cat)
          && (st.species === 'all' || c.dataset.species.split(' ').includes(st.species))
          && (st.view === 'sale' ? SALE.includes(c.dataset.status) : !SALE.includes(c.dataset.status));
        c.hidden = !ok; if (ok) n++;
      });
      $$('[data-f-cat]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.fCat === st.cat));
      $$('[data-f-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.fView === st.view));
      $('[data-f-species]').value = st.species;
      $('[data-count]').textContent = `${st.view === 'archive' ? 'Работ в архиве' : 'Позиций'}: ${n}`;
      $('[data-empty]').hidden = n > 0;
      $('[data-cat-title]').textContent = st.view === 'archive' ? 'Архив работ' : (st.cat === 'all' ? titles.all : $(`[data-f-cat="${st.cat}"]`).textContent);
      const q = new URLSearchParams(); if (st.cat !== 'all') q.set('cat', st.cat); if (st.species !== 'all') q.set('species', st.species); if (st.view !== 'sale') q.set('view', st.view);
      history.replaceState(null, '', q.toString() ? `?${q}` : location.pathname);
    };
    $$('[data-f-cat]').forEach((b) => b.addEventListener('click', () => { st.cat = b.dataset.fCat; apply(); }));
    $$('[data-f-view]').forEach((b) => b.addEventListener('click', () => { st.view = b.dataset.fView; apply(); }));
    $('[data-f-species]').addEventListener('change', (e) => { st.species = e.target.value; apply(); });
    apply();
  }

})();
