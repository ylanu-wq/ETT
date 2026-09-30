/* ============================================================
 * script.js — логика ETT v3 (English Today and Tomorrow)
 * Vanilla JavaScript ES6+, без библиотек и фреймворков.
 *
 * v3: PWA + безопасность
 *  - Service Worker (офлайн, кэш картинок)
 *  - кнопка установки PWA (beforeinstallprompt)
 *  - sanitizeURL: блокировка javascript:, data: (кроме картинок), blob:
 *  - sanitizeText: лимиты длины и контроль символов
 *  - убран inline-onerror (совместимость с CSP)
 *  - входная валидация pattern и maxlength в форме
 *  - sanitizeEmoji: только эмодзи в icon-полях
 * ============================================================
 *
 * v2: Web Speech API, выбор тем для повторения, онбординг,
 *     тёмная тема, режим для слабовидящих, левое боковое меню,
 *     прогресс-бар, индикатор изученности, горячие клавиши,
 *     сохранение прогресса, статистика за всё время.
 * ============================================================ */
(function () {
  'use strict';

  /* ============================================================
   * КОНСТАНТЫ
   * ============================================================ */
  const LS_FOLDERS  = 'ett_folders';
  const LS_WORDS    = 'ett_words';
  const LS_STATS    = 'ett_stats';        // статистика за всё время
  const LS_PROGRESS = 'ett_progress';     // незавершённая сессия повторения
  const LS_ONB      = 'ett_onb_done';     // флаг онбординга
  const LS_THEME    = 'ett_theme';        // тема: '' | 'dark' | 'a11y'
  const LS_SIDEBAR  = 'ett_sidebar';      // состояние бокового меню
  const LS_ACCENT   = 'ett_accent';       // акцентный цвет
  const LS_FONT     = 'ett_font';         // шрифт
  const LS_FONTSIZE = 'ett_fontsize';     // размер шрифта
  const LS_PALETTE  = 'ett_palette';      // готовая палитра

  // Готовые палитры: [accent, dark, darkHover, danger, success]
  const PALETTES = {
    ocean:   { accent:'#0284c7', dark:'#0f172a', danger:'#dc2626', success:'#16a34a', name:'Океан' },
    forest:  { accent:'#16a34a', dark:'#14532d', danger:'#dc2626', success:'#16a34a', name:'Лес' },
    sunset:  { accent:'#ea580c', dark:'#7c2d12', danger:'#dc2626', success:'#16a34a', name:'Закат' },
    lavender:{ accent:'#7c3aed', dark:'#2e1065', danger:'#dc2626', success:'#16a34a', name:'Лаванда' },
    cherry:  { accent:'#dc2626', dark:'#7f1d1d', danger:'#991b1b', success:'#16a34a', name:'Вишня' },
    mint:    { accent:'#0d9488', dark:'#134e4a', danger:'#dc2626', success:'#16a34a', name:'Мята' },
    gold:    { accent:'#ca8a04', dark:'#713f12', danger:'#dc2626', success:'#16a34a', name:'Золото' },
    mono:    { accent:'#475569', dark:'#0f172a', danger:'#dc2626', success:'#16a34a', name:'Монохром' }
  };

  const UNSPLASH_KEY = 'YOUR_UNSPLASH_ACCESS_KEY'; // плейсхолдер
  const UNSPLASH_ENDPOINT = 'https://api.unsplash.com/search/photos';

  /* ============================================================
   * СОСТОЯНИЕ
   * ============================================================ */
  let folders = [];
  let words = [];
  let activeFolderId = 'all';
  let searchQuery = '';
  let studySession = null;
  let moveWordId = null;
  let stats = { learned: 0, best: 0, lastStudy: null };  // статистика за всё время

  /* ============================================================
   * loadState — загрузка состояния из LocalStorage
   *  С защитой: если данные повреждены или содержат небезопасные поля,
   *  сбрасываем к встроенному словарю.
   * ============================================================ */
  function loadState() {
    try {
      const f = localStorage.getItem(LS_FOLDERS);
      const w = localStorage.getItem(LS_WORDS);
      if (f && w) {
        folders = JSON.parse(f);
        words = JSON.parse(w);
        // Санитизация загруженных данных (защита от подделки через DevTools)
        folders.forEach(folder => {
          folder.id   = sanitizeText(folder.id, 20);
          folder.name = sanitizeText(folder.name, LIMITS.FOLDER_NAME_MAX);
          folder.icon = sanitizeEmoji(folder.icon);
          folder.isSystem = !!folder.isSystem;
        });
        words.forEach(word => {
          word.id         = sanitizeText(word.id, 20);
          word.word       = sanitizeText(word.word, LIMITS.WORD_MAX);
          word.translation= sanitizeText(word.translation, LIMITS.TRANSLATION_MAX);
          word.example    = sanitizeText(word.example, LIMITS.EXAMPLE_MAX);
          word.folderId   = sanitizeText(word.folderId, 20);
          word.imageUrl   = sanitizeURL(word.imageUrl);
        });
        // Удаляем слова с пустыми обязательными полями
        words = words.filter(w => w.word && w.translation && w.folderId);
        // Удаляем папки без id
        folders = folders.filter(f => f.id);
      } else {
        folders = JSON.parse(JSON.stringify(window.SYSTEM_FOLDERS || []));
        words = JSON.parse(JSON.stringify(window.SYSTEM_WORDS || []));
        saveState();
      }
    } catch (e) {
      console.warn('LocalStorage read failed', e);
      folders = JSON.parse(JSON.stringify(window.SYSTEM_FOLDERS || []));
      words = JSON.parse(JSON.stringify(window.SYSTEM_WORDS || []));
      saveState();
    }
    // Загрузка статистики
    try {
      const s = localStorage.getItem(LS_STATS);
      if (s) stats = JSON.parse(s);
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(LS_FOLDERS, JSON.stringify(folders));
      localStorage.setItem(LS_WORDS, JSON.stringify(words));
    } catch (e) {
      toast('Не удалось сохранить: ' + e.message, 'error');
    }
  }

  function saveStats() {
    localStorage.setItem(LS_STATS, JSON.stringify(stats));
  }

  /* ============================================================
   * УТИЛИТЫ БЕЗОПАСНОСТИ
   * ============================================================ */

  // Максимальные длины полей (защита от переполнения и DoS)
  const LIMITS = {
    WORD_MAX: 80,        // английское слово
    TRANSLATION_MAX: 80, // перевод
    EXAMPLE_MAX: 200,    // пример
    FOLDER_NAME_MAX: 40, // имя папки
    URL_MAX: 500,        // длина URL картинки
    ICON_MAX: 8,         // эмодзи-иконка (1-2 эмодзи максимум)
  };

  // Разрешённые схемы URL для imageUrl (защита от javascript:, data:text/html)
  const SAFE_URL_HOSTS = [
    'images.unsplash.com',
    'source.unsplash.com',
    'api.unsplash.com'
  ];

  /*
   * escapeHTML — экранирует спецсимволы для вставки в текстовый узел или атрибут
   */
  function escapeHTML(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  /*
   * sanitizeText — обрезает строку до лимита и удаляет управляющие символы
   * (кроме таба и перевода строки)
   */
  function sanitizeText(s, maxLen) {
    s = String(s || '');
    // Удаляем управляющие символы кроме \t, \n, \r
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    if (maxLen) s = s.slice(0, maxLen);
    return s.trim();
  }

  /*
   * sanitizeURL — проверяет URL картинки на безопасность.
   * Возвращает безопасный URL или пустую строку, если URL опасен.
   * Разрешены: http(s) на любой хост (картинки с любого CDN),
   *            data:image/* (Base64 картинок),
   *            blob: (для локально созданных объектов).
   * Запрещены: javascript:, data:text/html, file:, vbscript:.
   */
  function sanitizeURL(url) {
    url = String(url || '').trim();
    if (!url || url.length > LIMITS.URL_MAX) return '';
    // Декодируем для проверки реальной схемы
    let lower = url.toLowerCase();
    try { lower = decodeURIComponent(lower); } catch (_) {}

    // Явный запрет опасных схем
    if (/^\s*(javascript|vbscript|file|data:text|data:application|data:base64)/i.test(lower)) return '';
    // data:image/* — разрешаем (картинки в Base64)
    if (/^data:image\/(png|jpeg|jpg|gif|webp|svg)/i.test(lower)) return url;
    // blob: — разрешаем
    if (lower.startsWith('blob:')) return url;
    // http(s) — разрешаем
    if (/^https?:\/\//i.test(url)) {
      try {
        const u = new URL(url);
        // Блокируем localhost и приватные IP (защита от SSRF в браузере)
        if (u.hostname === 'localhost' || u.hostname === '127.0.0.1' || u.hostname === '0.0.0.0') {
          return '';
        }
        // Блокируем приватные диапазоны (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
        if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)/.test(u.hostname)) {
          return '';
        }
        return url;
      } catch (e) { return ''; }
    }
    return '';
  }

  /*
   * sanitizeEmoji — принимает только эмодзи и пробельные символы,
   * обрезает до 2 эмодзи (чтобы нельзя было подсунуть длинную строку)
   */
  function sanitizeEmoji(s) {
    s = String(s || '').trim();
    if (!s) return '📁';
    // Берём только первые 2 символа-эмодзи (Unicode emoji блок)
    // Удаляем любые управляющие и потенциально опасные символы
    const cleaned = s.replace(/[\x00-\x1F\x7F<>"'&]/g, '');
    if (!cleaned) return '📁';
    return cleaned.slice(0, 4); // эмодзи могут быть составными до 4 code units
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }
  function toast(msg, type) {
    const el = document.createElement('div');
    el.className = 'toast' + (type ? ' is-' + type : '');
    el.textContent = msg;  // textContent безопаснее innerHTML
    $('#toasts').appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }

  /* ============================================================
   * Web Speech API — озвучка английского слова
   * ============================================================ */
  function speak(text) {
    if (!('speechSynthesis' in window)) {
      toast('Озвучка не поддерживается браузером', 'error');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.9;
      // Найти английский голос, если доступен
      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang && v.lang.startsWith('en'));
      if (enVoice) u.voice = enVoice;
      window.speechSynthesis.speak(u);
    } catch (e) {
      console.warn('TTS error', e);
    }
  }

  /* ============================================================
   * ТЕМЫ — переключение тёмной темы и режима для слабовидящих
   *  + акцентный цвет, шрифт, размер шрифта (настройки оформления)
   * ============================================================ */
  function applyTheme(theme) {
    document.body.classList.remove('dark-theme', 'a11y');
    if (theme === 'dark') document.body.classList.add('dark-theme');
    else if (theme === 'a11y') document.body.classList.add('a11y');
    localStorage.setItem(LS_THEME, theme || '');
    // Подсветка активных кнопок
    $('#btnDarkMode').classList.toggle('is-active', theme === 'dark');
    $('#btnA11y').classList.toggle('is-active', theme === 'a11y');
    $('#sideDark').classList.toggle('is-active', theme === 'dark');
    $('#sideA11y').classList.toggle('is-active', theme === 'a11y');
    // Подсветка в настройках
    $all('.theme-option').forEach(o => {
      o.classList.toggle('is-active', o.dataset.theme === (theme || ''));
    });
  }
  function toggleDark() {
    const cur = localStorage.getItem(LS_THEME) || '';
    applyTheme(cur === 'dark' ? '' : 'dark');
    toast(cur === 'dark' ? 'Светлая тема' : 'Тёмная тема включена', 'success');
  }
  function toggleA11y() {
    const cur = localStorage.getItem(LS_THEME) || '';
    applyTheme(cur === 'a11y' ? '' : 'a11y');
    toast(cur === 'a11y' ? 'Стандартный режим' : 'Режим для слабовидящих включён', 'success');
  }

  /* ============================================================
   * НАСТРОЙКИ ОФОРМЛЕНИЯ: акцент, шрифт, размер шрифта
   * ============================================================ */
  function applyAccent(color) {
    if (!color) color = '#0284c7';
    // Логируем亮度 для выбора контрастного варианта акцента на тёмном
    document.documentElement.style.setProperty('--c-accent', color);
    // Вычисляем более тёмный вариант для hover
    const darker = darkenColor(color, 15);
    document.documentElement.style.setProperty('--c-accent-dark', darker);
    localStorage.setItem(LS_ACCENT, color);
    // Подсветка в настройках
    $all('.accent-option').forEach(o => {
      o.classList.toggle('is-active', o.dataset.accent === color);
    });
  }

  function applyFont(font) {
    if (!font) font = 'Inter';
    document.documentElement.style.setProperty('--app-font', `'${font}', sans-serif`);
    document.body.style.fontFamily = `'${font}', system-ui, sans-serif`;
    localStorage.setItem(LS_FONT, font);
    $all('.font-option').forEach(o => {
      o.classList.toggle('is-active', o.dataset.font === font);
    });
  }

  function applyFontSize(size) {
    if (!size) size = 16;
    size = parseInt(size, 10);
    document.documentElement.style.setProperty('--font-base', size + 'px');
    localStorage.setItem(LS_FONTSIZE, size);
    $all('.size-option').forEach(o => {
      o.classList.toggle('is-active', parseInt(o.dataset.size, 10) === size);
    });
  }

  // Затемнение HEX-цвета на percent %
  function darkenColor(hex, percent) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const factor = 1 - percent / 100;
    const nr = Math.max(0, Math.round(r * factor));
    const ng = Math.max(0, Math.round(g * factor));
    const nb = Math.max(0, Math.round(b * factor));
    return '#' + [nr, ng, nb].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function resetSettings() {
    applyTheme('');
    applyAccent('#0284c7');
    applyFont('Inter');
    applyFontSize(16);
    applyPalette('ocean');
    toast('Настройки сброшены', 'success');
  }

  /* ============================================================
   * applyPalette — применить готовую палитру (меняет accent + dark)
   * ============================================================ */
  function applyPalette(name) {
    if (!name || !PALETTES[name]) name = 'ocean';
    const p = PALETTES[name];
    document.documentElement.style.setProperty('--c-accent', p.accent);
    document.documentElement.style.setProperty('--c-accent-dark', darkenColor(p.accent, 15));
    document.documentElement.style.setProperty('--c-dark', p.dark);
    document.documentElement.style.setProperty('--c-danger', p.danger);
    document.documentElement.style.setProperty('--c-success', p.success);
    localStorage.setItem(LS_PALETTE, name);
    localStorage.setItem(LS_ACCENT, p.accent);
    // Подсветка в настройках
    $all('.palette-option').forEach(o => {
      o.classList.toggle('is-active', o.dataset.palette === name);
    });
    $all('.accent-option').forEach(o => {
      o.classList.toggle('is-active', o.dataset.accent === p.accent);
    });
  }

  /* ============================================================
   * ЛЕВОЕ БОКОВОЕ МЕНЮ
   * ============================================================ */
  function toggleSidebar(forceOpen) {
    const isOpen = document.body.classList.contains('sidebar-open');
    const willOpen = forceOpen !== undefined ? forceOpen : !isOpen;
    document.body.classList.toggle('sidebar-open', willOpen);
    document.body.classList.toggle('sidebar-closed', !willOpen);
    $('#sidebarOverlay').hidden = !willOpen;
    localStorage.setItem(LS_SIDEBAR, willOpen ? 'open' : 'closed');
  }

  function renderSidebarFolders() {
    const box = $('#sideFolders');
    box.innerHTML = folders.map(f => {
      const count = words.filter(w => w.folderId === f.id).length;
      return `<button class="side-link" data-jump-folder="${f.id}">${f.icon} ${escapeHTML(f.name)} <span class="tab-count">${count}</span></button>`;
    }).join('');
    $all('[data-jump-folder]', box).forEach(b => {
      b.onclick = () => {
        jumpToFolder(b.dataset.jumpFolder);
        if (window.innerWidth <= 860) toggleSidebar(false);
      };
    });
  }

  function updateStats() {
    $('#statTotal').textContent = words.length;
    $('#statLearned').textContent = stats.learned;
    $('#statBest').textContent = stats.best;
  }

  /* ============================================================
   * renderAll — перерисовка вкладок, бокового меню и основной области
   * ============================================================ */
  function renderAll() {
    renderTabs();
    renderSidebarFolders();
    renderGroups();
    updateStats();
  }

  /* ============================================================
   * renderTabs — лента вкладок-папок (с индикатором изученности)
   * ============================================================ */
  function renderTabs() {
    const tabs = $('#tabs');
    tabs.innerHTML = '';

    const allCount = words.length;
    const allLearned = stats.learned;
    const allTab = document.createElement('button');
    allTab.className = 'tab' + (activeFolderId === 'all' ? ' is-active' : '');
    allTab.innerHTML = `<span class="tab-icon">📚</span> Все слова <span class="tab-count">${allCount}</span>` +
                       `<span class="tab-progress"><span class="tab-progress-fill" style="width:${allCount ? Math.min(100, allLearned / allCount * 100) : 0}%"></span></span>`;
    allTab.onclick = () => { jumpToFolder('all'); };
    tabs.appendChild(allTab);

    folders.forEach(f => {
      const count = words.filter(w => w.folderId === f.id).length;
      const learnedInFolder = stats.folders && stats.folders[f.id] || 0;
      const pct = count ? Math.min(100, learnedInFolder / count * 100) : 0;
      const tab = document.createElement('button');
      tab.className = 'tab' + (activeFolderId === f.id ? ' is-active' : '');
      const del = f.isSystem ? '' :
        `<button class="tab-del" title="Удалить папку" data-del="${f.id}">✕</button>`;
      tab.innerHTML = `<span class="tab-icon">${f.icon}</span> ${escapeHTML(f.name)} ` +
                      `<span class="tab-count">${count}</span> ${del}` +
                      `<span class="tab-progress"><span class="tab-progress-fill" style="width:${pct}%"></span></span>`;
      tab.onclick = (e) => {
        if (e.target.dataset.del) { e.stopPropagation(); return; }
        jumpToFolder(f.id);
      };
      const delBtn = tab.querySelector('[data-del]');
      if (delBtn) {
        delBtn.onclick = (e) => { e.stopPropagation(); deleteFolder(f.id); };
      }
      tabs.appendChild(tab);
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'tab tab-add';
    addBtn.innerHTML = '＋ Папка';
    addBtn.onclick = createFolder;
    tabs.appendChild(addBtn);
  }

  /* ============================================================
   * createFolder / deleteFolder
   * ============================================================ */
  function createFolder() {
    const name = sanitizeText(prompt('Имя новой папки:'), LIMITS.FOLDER_NAME_MAX);
    if (!name) return;
    const iconRaw = sanitizeEmoji(prompt('Эмодзи-иконка (необязательно):'));
    const icon = iconRaw || '📁';
    const f = { id: uid('f'), name, icon, isSystem: false };
    folders.push(f);
    saveState();
    activeFolderId = f.id;
    renderAll();
    toast('Папка «' + f.name + '» создана', 'success');
  }

  function deleteFolder(id) {
    const f = folders.find(x => x.id === id);
    if (!f || f.isSystem) { toast('Системную папку удалить нельзя', 'error'); return; }
    if (!confirm(`Удалить папку «${f.name}»? Слова будут перемещены в «Еда».`)) return;
    const fallback = folders.find(x => x.isSystem) || folders[0];
    words.forEach(w => { if (w.folderId === id) w.folderId = fallback.id; });
    folders = folders.filter(x => x.id !== id);
    if (activeFolderId === id) activeFolderId = 'all';
    saveState();
    renderAll();
    toast('Папка удалена', 'success');
  }

  /* ============================================================
   * sectionWords / sectionHTML / cardHTML
   * ============================================================ */
  function sectionWords(folderId) {
    let list = words.filter(w => w.folderId === folderId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(w =>
        (w.word || '').toLowerCase().includes(q) ||
        (w.translation || '').toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (a.word || '').localeCompare(b.word || ''));
  }

  function sectionHTML(folder, list) {
    if (searchQuery && list.length === 0) return '';
    if (activeFolderId !== 'all' && activeFolderId !== folder.id) return '';

    const cards = list.map(cardHTML).join('');
    const rhyme = folder.rhyme ? `
      <div class="rhyme-block">
        <div class="rhyme-title">📝 Стишок-запоминалка</div>
        <pre class="rhyme-text">${escapeHTML(folder.rhyme)}</pre>
        <button class="btn btn-ghost rhyme-speak" data-rhyme-speak="${escapeHTML(folder.rhyme)}">🔊 Прочитать</button>
      </div>
    ` : '';
    return `
      <section class="section" id="folder-${folder.id}" data-folder="${folder.id}">
        <div class="section-header">
          <span class="sec-icon">${folder.icon}</span>
          <span class="sec-title">${escapeHTML(folder.name)}</span>
          <span class="sec-count">${list.length}</span>
          ${list.length ? `<button class="btn-study" data-study-folder="${folder.id}">🎓 Повторить группу</button>` : ''}
        </div>
        ${rhyme}
        <div class="cards-grid">${cards}</div>
      </section>
    `;
  }

  function cardHTML(w) {
    return `
      <div class="card-wrapper">
        <div class="card" data-id="${w.id}">
          <div class="card-inner">
            <div class="card-face card-front">
              <div class="card-word">${escapeHTML(w.translation)}</div>
              <div class="card-hint">нажми — по-английски</div>
            </div>
            <div class="card-face card-back">
              <button class="card-speak" data-speak="${escapeHTML(w.word)}" title="Озвучить">🔊</button>
              <div class="card-word">${escapeHTML(w.word)}</div>
              <div class="card-example">«${escapeHTML(w.example || '')}»</div>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <button class="act-edit" data-edit="${w.id}" title="Редактировать">✏️ Редакт.</button>
          <button data-move="${w.id}" title="Переместить">📦</button>
          <button data-copy="${w.id}" title="Копировать">📄</button>
          <button class="act-del" data-del-word="${w.id}" title="Удалить">🗑</button>
        </div>
      </div>
    `;
  }

  /* ============================================================
   * renderGroups — основная область
   *  Если activeFolderId === 'all' и нет поиска:
   *    1) приветственный блок
   *    2) сетка всех групп (карточек-папок) — кликабельные
   *    3) последние добавленные слова
   *  Иначе — одна секция выбранной папки (как отдельная "страница")
   * ============================================================ */
  function renderGroups() {
    const main = $('#main');

    // Поиск работает везде — отдельная страница результатов
    if (searchQuery) {
      return renderSearchResults(main);
    }

    // Главная страница — "Все слова"
    if (activeFolderId === 'all') {
      return renderHomePage(main);
    }

    // Отдельная папка
    const folder = folders.find(f => f.id === activeFolderId);
    if (!folder) {
      activeFolderId = 'all';
      return renderHomePage(main);
    }
    const list = sectionWords(folder.id);
    main.innerHTML = `
      <div class="breadcrumb">
        <a href="#all" data-jump-folder="all">📚 Все слова</a>
        <span class="bc-sep">›</span>
        <span class="bc-current">${folder.icon} ${escapeHTML(folder.name)}</span>
      </div>
      ${sectionHTML(folder, list)}
    `;
    bindCardEvents(main);
  }

  /*
   * renderHomePage — главная страница:
   *  Компактный welcome (одна строка) + ВСЕ секции со ВСЕМИ карточками-перевёртышами.
   *  Главная страница должна быть заполнена карточками, как было раньше.
   */
  function renderHomePage(main) {
    const totalWords = words.length;
    const totalFolders = folders.length;
    const learnedTotal = stats.learned || 0;

    const sortedFolders = folders.slice().sort((a, b) => {
      if (a.isSystem && !b.isSystem) return -1;
      if (!a.isSystem && b.isSystem) return 1;
      if (a.isSystem && b.isSystem) return a.id.localeCompare(b.id);
      return a.name.localeCompare(b.name);
    });

    // Компактный приветственный блок (одна полоса)
    const welcome = `
      <div class="welcome-compact">
        <div class="wc-icon">📖</div>
        <div class="wc-text">
          <div class="wc-title">English Today and Tomorrow</div>
          <div class="wc-slogan">Учи сегодня — говори завтра</div>
        </div>
        <div class="wc-stats">
          <span><strong>${totalFolders}</strong> тем</span>
          <span><strong>${totalWords}</strong> слов</span>
          <span><strong>${learnedTotal}</strong> изучено</span>
        </div>
        <div class="wc-actions">
          <button class="btn btn-primary" id="welcomeStudy">🎓 Повторение</button>
          <button class="btn btn-ghost" id="welcomeAdd">＋ Слово</button>
        </div>
      </div>
    `;

    // ВСЕ секции со ВСЕМИ карточками-перевёртышами
    const sectionsWithCards = sortedFolders
      .filter(f => sectionWords(f.id).length > 0);

    const sectionsHtml = sectionsWithCards
      .map(f => sectionHTML(f, sectionWords(f.id)))
      .join('');

    main.innerHTML = welcome + sectionsHtml;

    $('#welcomeStudy').onclick = () => openStudy('all');
    $('#welcomeAdd').onclick = () => openWordModal(null);
    bindCardEvents(main);
  }

  /*
   * renderSearchResults — результаты поиска (по всем папкам)
   */
  function renderSearchResults(main) {
    const q = searchQuery.toLowerCase();
    const matchedWords = words.filter(w =>
      (w.word || '').toLowerCase().includes(q) ||
      (w.translation || '').toLowerCase().includes(q)
    ).sort((a, b) => (a.word || '').localeCompare(b.word || ''));

    if (!matchedWords.length) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>Ничего не найдено</h3>
          <p>По запросу «${escapeHTML(searchQuery)}» слов нет. Попробуйте изменить запрос.</p>
          <div class="empty-actions">
            <button class="btn btn-ghost" id="clearSearch">← К началу</button>
          </div>
        </div>
      `;
      $('#clearSearch').onclick = () => {
        $('#search').value = '';
        searchQuery = '';
        jumpToFolder('all');
      };
      return;
    }

    const byFolder = {};
    matchedWords.forEach(w => {
      if (!byFolder[w.folderId]) byFolder[w.folderId] = [];
      byFolder[w.folderId].push(w);
    });

    const sectionsHtml = Object.keys(byFolder).map(fid => {
      const f = folders.find(x => x.id === fid);
      if (!f) return '';
      return sectionHTML(f, byFolder[fid]);
    }).join('');

    main.innerHTML = `
      <div class="breadcrumb">
        <a href="#all" data-jump-folder="all">📚 Все слова</a>
        <span class="bc-sep">›</span>
        <span class="bc-current">🔍 Поиск: «${escapeHTML(searchQuery)}» (${matchedWords.length})</span>
      </div>
      ${sectionsHtml}
    `;
    bindCardEvents(main);
  }

  function bindCardEvents(main) {
    $all('.card', main).forEach(c => {
      c.onclick = (e) => {
        if (e.target.closest('button')) return;
        c.classList.toggle('is-flipped');
      };
    });
    $all('[data-speak]', main).forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); speak(b.dataset.speak); };
    });
    $all('[data-rhyme-speak]', main).forEach(b => {
      b.onclick = () => speakRhyme(b.dataset.rhymeSpeak);
    });
    $all('[data-edit]', main).forEach(b => b.onclick = () => openWordModal(b.dataset.edit));
    $all('[data-move]', main).forEach(b => b.onclick = () => openMoveModal(b.dataset.move));
    $all('[data-copy]', main).forEach(b => b.onclick = () => copyWord(b.dataset.copy));
    $all('[data-del-word]', main).forEach(b => b.onclick = () => deleteWord(b.dataset.delWord));
    $all('[data-study-folder]', main).forEach(b => b.onclick = () => openStudy(b.dataset.studyFolder));
  }

  function bindFolderCards(main) {
    $all('[data-jump-folder]', main).forEach(el => {
      el.onclick = (e) => {
        e.preventDefault();
        jumpToFolder(el.dataset.jumpFolder);
      };
    });
  }

  /*
   * speakRhyme — прочитать стишок по строкам на английском
   */
  function speakRhyme(text) {
    if (!('speechSynthesis' in window)) {
      toast('Озвучка не поддерживается', 'error');
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        const u = new SpeechSynthesisUtterance(line);
        u.lang = 'en-US';
        u.rate = 0.85;
        setTimeout(() => window.speechSynthesis.speak(u), i * 2200);
      });
      toast('🔊 Читаю стишок…', 'success');
    } catch (e) {
      console.warn('TTS error', e);
    }
  }

  /* ============================================================
   * ХЕШ-РОУТИНГ — вкладки как страницы с URL
   *   #all            → все слова (главная)
   *   #f1 ... #f12    → конкретная папка
   *   #study          → режим повторения
   *   #add            → окно добавления слова
   *   #import         → окно импорта
   * ============================================================ */
  function handleHashChange() {
    const hash = (location.hash || '#all').replace(/^#/, '');
    if (!hash || hash === 'all') {
      activeFolderId = 'all';
    } else if (hash.startsWith('f') && folders.find(f => f.id === hash)) {
      activeFolderId = hash;
    } else if (hash === 'study') {
      openStudy('all');
      return;
    } else if (hash === 'add') {
      openWordModal(null);
      return;
    } else if (hash === 'import') {
      openModal('#importModal');
      return;
    } else {
      activeFolderId = 'all';
    }
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function jumpToFolder(folderId) {
    location.hash = folderId || 'all';
    if (window.innerWidth <= 860) toggleSidebar(false);
  }

  /* ============================================================
   * copyWord / deleteWord
   * ============================================================ */
  function copyWord(id) {
    const w = words.find(x => x.id === id);
    if (!w) return;
    words.push(Object.assign({}, w, { id: uid('w') }));
    saveState();
    renderAll();
    toast('Слово скопировано', 'success');
  }

  function deleteWord(id) {
    const w = words.find(x => x.id === id);
    if (!w) return;
    if (!confirm(`Удалить слово «${w.word}»?`)) return;
    words = words.filter(x => x.id !== id);
    saveState();
    renderAll();
    toast('Слово удалено', 'success');
  }

  /* ============================================================
   * openMoveModal / confirmMove
   * ============================================================ */
  function openMoveModal(wordId) {
    moveWordId = wordId;
    const w = words.find(x => x.id === wordId);
    if (!w) return;
    $('#moveWordInfo').textContent = `Слово: ${w.word} — ${w.translation}`;
    const list = $('#moveList');
    list.innerHTML = folders.map(f => `
      <div class="move-item" data-folder="${f.id}">
        <span class="mi-icon">${f.icon}</span>
        <span class="mi-name">${escapeHTML(f.name)}</span>
        <span class="mi-action">переместить / копировать</span>
      </div>
    `).join('');
    $all('.move-item', list).forEach(item => {
      item.onclick = () => confirmMove(item.dataset.folder, false);
      item.oncontextmenu = (e) => { e.preventDefault(); confirmMove(item.dataset.folder, true); };
    });
    openModal('#moveModal');
  }

  function confirmMove(folderId, asCopy) {
    const w = words.find(x => x.id === moveWordId);
    if (!w) return;
    const f = folders.find(x => x.id === folderId);
    if (asCopy) {
      words.push(Object.assign({}, w, { id: uid('w'), folderId }));
      toast(`Скопировано в «${f.name}»`, 'success');
    } else {
      w.folderId = folderId;
      toast(`Перенесено в «${f.name}»`, 'success');
    }
    saveState();
    closeModal('#moveModal');
    renderAll();
  }

  /* ============================================================
   * openWordModal / saveWord
   * ============================================================ */
  function openWordModal(id) {
    const form = $('#wordForm');
    form.reset();
    $('#fImgUrl').value = '';
    $('#fId').value = id || '';
    $('#imgPreview').innerHTML = '';
    $('#unsplashResults').innerHTML = '<span class="muted">Здесь появятся 3 превью</span>';
    $('#wordModalTitle').textContent = id ? 'Редактировать слово' : 'Добавить слово';

    const sel = $('#fFolder');
    sel.innerHTML = folders.map(f =>
      `<option value="${f.id}">${f.icon} ${escapeHTML(f.name)}</option>`
    ).join('');

    if (id) {
      const w = words.find(x => x.id === id);
      if (w) {
        $('#fWord').value = w.word || '';
        $('#fTranslation').value = w.translation || '';
        $('#fExample').value = w.example || '';
        $('#fFolder').value = w.folderId;
        $('#fImgUrl').value = w.imageUrl || '';
        if (w.imageUrl) showImgPreview(w.imageUrl);
      }
    } else if (activeFolderId !== 'all') {
      sel.value = activeFolderId;
    }
    openModal('#wordModal');
  }

  function saveWord(e) {
    e.preventDefault();
    const id = $('#fId').value;
    // Санитизация входных данных
    const data = {
      word: sanitizeText($('#fWord').value, LIMITS.WORD_MAX),
      translation: sanitizeText($('#fTranslation').value, LIMITS.TRANSLATION_MAX),
      example: sanitizeText($('#fExample').value, LIMITS.EXAMPLE_MAX),
      folderId: sanitizeText($('#fFolder').value, 20),
      imageUrl: sanitizeURL($('#fImgUrl').value)
    };
    // Валидация: английское слово должно содержать хотя бы одну букву
    if (!data.word || !/^[A-Za-z\s\-'’]+$/.test(data.word)) {
      toast('Слово должно содержать только английские буквы', 'error');
      return;
    }
    if (!data.translation) {
      toast('Заполните перевод', 'error');
      return;
    }
    // Проверка, что папка существует
    if (!folders.find(f => f.id === data.folderId)) {
      toast('Выберите существующую папку', 'error');
      return;
    }
    // Автогенерация примера, если поле пустое
    if (!data.example) {
      data.example = generateExample(data.word);
    }
    // Автоподстановка картинки, если не задана
    if (!data.imageUrl) {
      data.imageUrl = generateImageUrl(data.word);
    }
    if (id) {
      const w = words.find(x => x.id === id);
      Object.assign(w, data);
      toast('Слово обновлено', 'success');
    } else {
      words.push(Object.assign({ id: uid('w') }, data));
      toast('Слово добавлено', 'success');
    }
    saveState();
    closeModal('#wordModal');
    renderAll();
  }

  function selectedImage(url) {
    $('#fImgUrl').value = url;
    $all('.unsplash-thumb').forEach(t => t.classList.toggle('is-selected', t.dataset.url === url));
    showImgPreview(url);
  }

  function showImgPreview(url) {
    const box = $('#imgPreview');
    box.innerHTML = '';
    const safeUrl = sanitizeURL(url);
    if (!safeUrl) {
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = 'Некорректный URL';
      box.appendChild(span);
      return;
    }
    const img = document.createElement('img');
    img.src = safeUrl;
    img.alt = 'preview';
    img.onerror = () => {
      box.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'muted';
      span.textContent = 'Не удалось загрузить';
      box.appendChild(span);
    };
    box.appendChild(img);
  }

  /* ============================================================
   * searchUnsplash
   * ============================================================ */
  async function searchUnsplash() {
    const q = $('#unsplashQuery').value.trim();
    if (!q) { toast('Введите запрос', 'error'); return; }
    const box = $('#unsplashResults');
    box.innerHTML = '<span class="muted">🔍 Ищем…</span>';
    try {
      let results = [];
      if (UNSPLASH_KEY && UNSPLASH_KEY !== 'YOUR_UNSPLASH_ACCESS_KEY') {
        const url = `${UNSPLASH_ENDPOINT}?query=${encodeURIComponent(q)}&per_page=3&client_id=${UNSPLASH_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Unsplash HTTP ' + res.status);
        const data = await res.json();
        results = (data.results || []).map(r => ({
          url: r.urls.regular,
          thumb: r.urls.thumb
        }));
      } else {
        results = [1, 2, 3].map(() => ({
          url: `https://source.unsplash.com/600x400/?${encodeURIComponent(q)}`,
          thumb: `https://source.unsplash.com/200x150/?${encodeURIComponent(q)}`
        }));
      }
      if (!results.length) { box.innerHTML = '<span class="muted">Ничего не найдено</span>'; return; }
      // Создаём элементы через DOM API, без innerHTML (защита от XSS)
      box.innerHTML = '';
      results.forEach(r => {
        const safeUrl = sanitizeURL(r.url);
        const safeThumb = sanitizeURL(r.thumb || r.url);
        if (!safeUrl || !safeThumb) return;
        const img = document.createElement('img');
        img.className = 'unsplash-thumb';
        img.src = safeThumb;
        img.alt = q;
        img.dataset.url = safeUrl;
        img.onclick = () => selectedImage(safeUrl);
        box.appendChild(img);
      });
    } catch (e) {
      box.innerHTML = '<span class="muted">Ошибка: ' + escapeHTML(e.message) + '</span>';
    }
  }

  /* ============================================================
   * Парсеры CSV/словаря
   * ============================================================ */
  function parseCSVLine(line) {
    const out = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQ) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { out.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  function parseDictionaryText(text) {
    const rows = [];
    text.split(/\r?\n/).forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      // Используем parseCSVLine — он корректно обрабатывает кавычки и запятые внутри
      const parts = parseCSVLine(line);
      if (parts.length >= 2) {
        const first = parts[0];
        const second = parts[1];
        // Автоопределение языка
        if (isRussian(first) && isEnglish(second)) {
          rows.push({ word: second, translation: first, example: parts[2] || '' });
        } else if (isEnglish(first) && isRussian(second)) {
          rows.push({ word: first, translation: second, example: parts[2] || '' });
        } else {
          // По умолчанию: первая колонка — английское слово
          rows.push({ word: first, translation: second, example: parts[2] || '' });
        }
      }
    });
    return rows;
  }

  /* ============================================================
   * ОПРЕДЕЛЕНИЕ ЯЗЫКА по символам
   * ============================================================ */
  function isRussian(s) {
    return /[а-яА-ЯёЁ]/.test(String(s || ''));
  }
  function isEnglish(s) {
    return /^[A-Za-z\s\-'’]+$/.test(String(s || '').trim()) && /[A-Za-z]/.test(String(s || ''));
  }

  /* ============================================================
   * Маппинг тем (английских и русских) к системным папкам
   * ============================================================ */
  const TOPIC_TO_SYSTEM_FOLDER = {
    // Еда
    'food': 'f1', 'еда': 'f1', 'fruit': 'f1', 'fruits': 'f1', 'meal': 'f1', 'meals': 'f1',
    'drink': 'f1', 'drinks': 'f1', 'cooking': 'f1', 'cuisine': 'f1',
    // Животные
    'animals': 'f2', 'животные': 'f2', 'animal': 'f2', 'pets': 'f2', 'wildlife': 'f2',
    // Семья
    'family': 'f3', 'семья': 'f3', 'relatives': 'f3', 'kinship': 'f3',
    // Школа
    'school': 'f4', 'школа': 'f4', 'education': 'f4', 'classroom': 'f4', 'study': 'f4',
    'learning': 'f4', 'stationery': 'f4',
    // Погода
    'weather': 'f5', 'погода': 'f5', 'climate': 'f5', 'season': 'f5', 'seasons': 'f5',
    // Спорт
    'sports': 'f6', 'спорт': 'f6', 'sport': 'f6', 'game': 'f6', 'games': 'f6',
    'football': 'f6', 'soccer': 'f6',
    // Путешествия
    'travel': 'f7', 'путешествия': 'f7', 'transport': 'f7', 'transportation': 'f7',
    'journey': 'f7', 'trip': 'f7', 'tourism': 'f7', 'airport': 'f7',
    // Эмоции
    'emotions': 'f8', 'эмоции': 'f8', 'feelings': 'f8', 'mood': 'f8', 'emotion': 'f8',
    // Дом
    'house': 'f9', 'дом': 'f9', 'home': 'f9', 'housing': 'f9', 'furniture': 'f9',
    'building': 'f9', 'room': 'f9', 'rooms': 'f9',
    // Одежда
    'clothes': 'f10', 'одежда': 'f10', 'clothing': 'f10', 'fashion': 'f10', 'wear': 'f10',
    // Природа
    'nature': 'f11', 'природа': 'f11', 'environment': 'f11', 'landscape': 'f11',
    'geography': 'f11', 'plants': 'f11',
    // Технологии
    'technology': 'f12', 'технологии': 'f12', 'tech': 'f12', 'computers': 'f12',
    'computer': 'f12', 'internet': 'f12', 'digital': 'f12', 'it': 'f12', 'electronics': 'f12'
  };

  /* Найти системную папку по теме (английской или русской) */
  function findSystemFolderByTopic(topic) {
    if (!topic) return null;
    const t = String(topic).toLowerCase().trim();
    // Точное совпадение
    if (TOPIC_TO_SYSTEM_FOLDER[t]) return TOPIC_TO_SYSTEM_FOLDER[t];
    // Частичное совпадение (тема содержит ключевое слово или наоборот)
    for (const [key, folderId] of Object.entries(TOPIC_TO_SYSTEM_FOLDER)) {
      if (t.includes(key) || key.includes(t)) return folderId;
    }
    return null;
  }

  /* ============================================================
   * generateExample — автогенерация примера употребления
   *  Если у слова нет примера, создаём простое предложение
   *  по шаблону. Шаблон выбирается детерминированно по слову,
   *  чтобы одно и то же слово всегда получало один и тот же пример.
   * ============================================================ */
  function generateExample(word) {
    if (!word) return '';
    const w = word.trim();
    const lower = w.toLowerCase();
    const templates = [
      `I know the word "${w}".`,
      `She learns "${lower}" at school.`,
      `The word "${w}" is new to me.`,
      `I read "${lower}" in a book yesterday.`,
      `My friend says "${w}" often.`,
      `We use "${lower}" every day.`,
      `Can you repeat "${w}" please?`,
      `"${w}" is an important English word.`,
      `I heard "${lower}" in the song.`,
      `The teacher wrote "${w}" on the board.`
    ];
    let hash = 0;
    for (let i = 0; i < w.length; i++) {
      hash = (hash * 31 + w.charCodeAt(i)) & 0x7fffffff;
    }
    return templates[hash % templates.length];
  }

  function iconForMode(mode, name) {
    if (mode === 'level') return '🎓';
    if (mode === 'topic') return '📚';
    if (mode === 'alpha') return '🔤';
    if (mode === 'level_topic') return '🎓';
    return '📥';
  }

  function letterOf(word) {
    return (word || '').trim().charAt(0).toUpperCase() || '#';
  }

  function findOrCreateFolder(name, mode) {
    let f = folders.find(x => x.name === name);
    if (f) return f;
    f = { id: uid('f'), name, icon: iconForMode(mode, name), isSystem: false };
    folders.push(f);
    return f;
  }

  function importWords(rawText, mode) {
    // Удаляем BOM (byte order mark), если есть
    if (rawText && rawText.charCodeAt(0) === 0xFEFF) {
      rawText = rawText.slice(1);
    }
    let parsed = [];
    let detectedDirection = '';  // для отображения пользователю

    try {
      const j = JSON.parse(rawText);
      if (Array.isArray(j)) {
        parsed = j.map(o => ({
          word: o.word || o.english || o.target || '',
          translation: o.translation || o.russian || o.gloss || '',
          example: o.example || o.sentence || '',
          level: o.level || '',
          topic: o.topic || o.topics || ''
        })).filter(x => x.word && x.translation);
        detectedDirection = 'JSON';
      }
    } catch (_) {
      const lines = rawText.split(/\r?\n/).filter(l => l.trim());
      if (!lines.length) return { imported: 0, foldersCreated: 0, toSystem: 0, direction: '' };
      const header = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      // SMARTool — словарь для англоязычных, изучающих русский:
      //   'target language lemma'         = РУССКОЕ слово (то, что учат) → translation
      //   'user language gloss'           = АНГЛИЙСКИЙ перевод (родной язык) → word
      const smartoolMap = {
        'target language lemma': 'translation',
        'user language gloss': 'word',
        'target language example sentence': 'example',
        'user language translation': 'exampleEn',
        'level': 'level',
        'topic(s)': 'topic',
        'topics': 'topic',
        'topic': 'topic'
      };
      const colIdx = header.map(h => smartoolMap[h] || null);
      const isSmartool = colIdx.some(c => c);
      if (isSmartool) {
        detectedDirection = 'SMARTool CSV';
        for (let i = 1; i < lines.length; i++) {
          const cells = parseCSVLine(lines[i]);
          const obj = { word:'', translation:'', example:'', level:'', topic:'' };
          colIdx.forEach((key, idx) => { if (key && cells[idx]) obj[key] = cells[idx]; });
          // Дополнительная проверка языка
          if (isRussian(obj.word) && isEnglish(obj.translation)) {
            const tmp = obj.word;
            obj.word = obj.translation;
            obj.translation = tmp;
          }
          if (obj.word && obj.translation) parsed.push(obj);
        }
      } else {
        detectedDirection = 'CSV/TXT';
        parsed = parseDictionaryText(rawText);
      }
    }

    if (!parsed.length) return { imported: 0, foldersCreated: 0, toSystem: 0, direction: detectedDirection };
    let imported = 0, toSystem = 0;
    const foldersBefore = folders.length;
    parsed.forEach(p => {
      // Санитизация
      let word = sanitizeText(p.word, LIMITS.WORD_MAX);
      let translation = sanitizeText(p.translation, LIMITS.TRANSLATION_MAX);
      let example = sanitizeText(p.example, LIMITS.EXAMPLE_MAX);
      const topic = p.topic || '';
      if (!word || !translation) return;

      // Финальная проверка языка: word должен быть английским, translation — русским
      if (isRussian(word) && !isRussian(translation)) {
        const tmp = word; word = translation; translation = tmp;
      }
      // Пропускаем если оба одного языка
      if (isRussian(word) && isRussian(translation)) return;
      if (!isRussian(translation) && isEnglish(word) && isEnglish(translation)) return;

      // Автогенерация примера, если его нет
      if (!example) {
        example = generateExample(word);
      }

      // Определение папки
      let folderId = null;
      let folderName = '';

      // Режим "auto" — пытаемся найти системную папку по теме
      if (mode === 'auto') {
        const systemFolderId = findSystemFolderByTopic(topic);
        if (systemFolderId) {
          folderId = systemFolderId;
          toSystem++;
        } else {
          // Если тема есть, но не совпала с системной — создаём папку по теме
          folderName = topic ? capitalize(sanitizeText(topic, 30)) : 'Импортированные';
        }
      } else if (mode === 'one') {
        folderName = 'Импортированные';
      } else if (mode === 'alpha') {
        folderName = letterOf(word);
      } else if (mode === 'level') {
        folderName = sanitizeText(p.level || 'Без уровня', 20).toUpperCase();
      } else if (mode === 'topic') {
        // Сначала пробуем системную папку
        const systemFolderId = findSystemFolderByTopic(topic);
        if (systemFolderId) {
          folderId = systemFolderId;
          toSystem++;
        } else {
          folderName = topic ? capitalize(sanitizeText(topic, 30)) : 'Без темы';
        }
      } else if (mode === 'level_topic') {
        const systemFolderId = findSystemFolderByTopic(topic);
        if (systemFolderId) {
          folderId = systemFolderId;
          toSystem++;
        } else {
          const lvl = sanitizeText(p.level || 'A1', 10).toUpperCase();
          const top = topic ? capitalize(sanitizeText(topic, 30)) : 'Разное';
          folderName = `${lvl} · ${top}`;
        }
      } else {
        folderName = 'Импортированные';
      }

      // Если папка не определена по теме — создаём/находим по имени
      if (!folderId) {
        folderName = sanitizeText(folderName, LIMITS.FOLDER_NAME_MAX);
        const folder = findOrCreateFolder(folderName, mode);
        folderId = folder.id;
      }

      // Проверка дубликата в целевой папке
      const dup = words.find(w => w.folderId === folderId &&
        (w.word || '').toLowerCase() === word.toLowerCase());
      if (dup) {
        // Если дубликат существует, обновляем пример и картинку если их нет
        if (!dup.example && example) dup.example = example;
        if (!dup.imageUrl) dup.imageUrl = generateImageUrl(word);
        return;
      }

      // Автоподстановка картинки
      const autoImg = generateImageUrl(word);
      words.push({
        id: uid('w'), word, translation, example, folderId, imageUrl: autoImg
      });
      imported++;
    });
    saveState();
    return {
      imported,
      foldersCreated: folders.length - foldersBefore,
      toSystem,
      direction: detectedDirection
    };
  }

  /* ============================================================
   * generateImageUrl — автогенерация URL картинки для слова
   *  Использует несколько источников в порядке приоритета:
   *   1. Если есть API-ключ Unsplash — реальный поиск (выполняется отдельно)
   *   2. source.unsplash.com — тематическая картинка по слову (без ключа)
   *   3. picsum.photos с seed — запасной вариант
   * ============================================================ */
  function generateImageUrl(word) {
    if (!word) return '';
    const q = encodeURIComponent(word.toLowerCase().trim());
    // Source.unsplash.com — отдаёт случайную картинку по теме (без API-ключа)
    return `https://source.unsplash.com/600x400/?${q}`;
  }

  /* ============================================================
   * autoFetchImages — массовый поиск картинок через Unsplash API
   *  для всех слов без imageUrl. Требует API-ключ.
   * ============================================================ */
  async function autoFetchImages() {
    if (!UNSPLASH_KEY || UNSPLASH_KEY === 'YOUR_UNSPLASH_ACCESS_KEY') {
      toast('Введите API-ключ Unsplash в script.js для автопоиска картинок', 'error');
      return;
    }
    const wordsWithoutImg = words.filter(w => !w.imageUrl ||
      w.imageUrl.includes('source.unsplash.com'));
    if (!wordsWithoutImg.length) {
      toast('Все слова уже имеют картинки', 'success');
      return;
    }
    if (!confirm(`Найти картинки для ${wordsWithoutImg.length} слов? Это займёт ~${Math.ceil(wordsWithoutImg.length / 30)} сек.`)) return;

    toast(`🔍 Ищу картинки для ${wordsWithoutImg.length} слов…`, 'success');
    let found = 0;
    // По 1 слову за раз, с задержкой чтобы не превысить лимит API
    for (let i = 0; i < wordsWithoutImg.length; i++) {
      const w = wordsWithoutImg[i];
      try {
        const url = `${UNSPLASH_ENDPOINT}?query=${encodeURIComponent(w.word)}&per_page=1&client_id=${UNSPLASH_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results[0]) {
            w.imageUrl = data.results[0].urls.regular;
            found++;
          }
        }
      } catch (e) {
        console.warn('Image search failed for', w.word, e);
      }
      // Задержка 200мс между запросами
      await new Promise(r => setTimeout(r, 200));
      // Обновляем прогресс каждые 10 слов
      if (i % 10 === 9) {
        saveState();
        renderGroups();
        toast(`🔍 Обработано ${i + 1}/${wordsWithoutImg.length}…`, 'success');
      }
    }
    saveState();
    renderGroups();
    toast(`✅ Найдено картинок: ${found} из ${wordsWithoutImg.length}`, 'success');
  }

  function capitalize(s) {
    s = String(s || '');
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }

  function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const mode = $('#importMode').value;
      const r = importWords(reader.result, mode);
      showImportStatus(r);
    };
    reader.onerror = () => toast('Ошибка чтения файла', 'error');
    reader.readAsText(file, 'utf-8');
  }

  async function handleImportUrl() {
    const url = $('#importUrl').value.trim();
    if (!url) { toast('Введите URL', 'error'); return; }
    const status = $('#importStatus');
    status.hidden = false;
    status.className = 'import-status';
    status.textContent = '⏳ Загрузка…';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const text = await res.text();
      const mode = $('#importMode').value;
      const r = importWords(text, mode);
      showImportStatus(r);
    } catch (e) {
      status.className = 'import-status';
      status.style.background = 'rgba(239,68,68,.1)';
      status.style.borderColor = 'var(--c-danger)';
      status.style.color = '#7f1d1d';
      status.textContent = '❌ Ошибка: ' + e.message + '. (CORS? Откройте файл локально.)';
    }
  }

  function showImportStatus(r) {
    const status = $('#importStatus');
    status.hidden = false;
    status.className = 'import-status';
    let msg = `✅ Импортировано слов: ${r.imported}.`;
    if (r.direction) msg += ` Формат: ${r.direction}.`;
    if (r.toSystem > 0) msg += ` В системные папки: ${r.toSystem}.`;
    if (r.foldersCreated > 0) msg += ` Создано новых папок: ${r.foldersCreated}.`;
    status.textContent = msg;
    if (r.imported > 0) {
      renderAll();
      setTimeout(() => closeModal('#importModal'), 2500);
    }
  }

  /* ============================================================
   * ОНБОРДИНГ
   * ============================================================ */
  function maybeShowOnboarding() {
    if (localStorage.getItem(LS_ONB)) return;
    openModal('#onboarding');
    setOnbStep(1);
  }

  let onbStep = 1;
  function setOnbStep(n) {
    onbStep = n;
    $all('.onb-step').forEach(s => s.hidden = +s.dataset.onbStep !== n);
    $all('.onb-dot').forEach((d, i) => d.classList.toggle('is-active', i + 1 === n));
    $('#onbPrev').disabled = (n === 1);
    $('#onbNext').textContent = (n === 4) ? 'Готово!' : 'Дальше →';
  }

  function onbNext() {
    if (onbStep < 4) setOnbStep(onbStep + 1);
    else finishOnboarding();
  }
  function onbPrev() { if (onbStep > 1) setOnbStep(onbStep - 1); }
  function finishOnboarding() {
    localStorage.setItem(LS_ONB, '1');
    closeModal('#onboarding');
    toast('Добро пожаловать! Переверните первую карточку 👆', 'success');
  }

  /* ============================================================
   * ВЫБОР ТЕМ ДЛЯ ПОВТОРЕНИЯ
   * ============================================================ */
  function openStudyThemesModal() {
    const grid = $('#themesGrid');
    grid.innerHTML = folders.map(f => {
      const count = words.filter(w => w.folderId === f.id).length;
      return `
        <div class="theme-chip" data-folder="${f.id}">
          <span class="tc-icon">${f.icon}</span>
          <span class="tc-name">${escapeHTML(f.name)}</span>
          <span class="tc-count">${count}</span>
          <span class="tc-check">✓</span>
        </div>
      `;
    }).join('');
    $all('.theme-chip', grid).forEach(c => {
      c.onclick = () => c.classList.toggle('is-selected');
    });
    openModal('#studyThemesModal');
  }

  function themesSelectAll() {
    $all('.theme-chip').forEach(c => c.classList.add('is-selected'));
  }
  function themesClear() {
    $all('.theme-chip').forEach(c => c.classList.remove('is-selected'));
  }

  function themesStart() {
    const selected = $all('.theme-chip.is-selected').map(c => c.dataset.folder);
    if (!selected.length) { toast('Выберите хотя бы одну тему', 'error'); return; }
    const list = words.filter(w => selected.includes(w.folderId));
    if (!list.length) { toast('В выбранных папках нет слов', 'error'); return; }
    closeModal('#studyThemesModal');
    startStudyWithList(list);
  }

  /* ============================================================
   * РЕЖИМ ПОВТОРЕНИЯ
   * ============================================================ */
  function openStudy(folderId) {
    let list;
    if (folderId === 'all' || !folderId) list = words.slice();
    else list = words.filter(w => w.folderId === folderId);
    if (!list.length) { toast('Нет слов для повторения', 'error'); return; }
    startStudyWithList(list);
  }

  function startStudyWithList(list) {
    list.sort(() => Math.random() - 0.5);
    studySession = {
      list, idx: 0, dir: 'ru-en',
      know: 0, dontKnow: 0, folderId: activeFolderId === 'all' ? null : activeFolderId
    };
    $('#studyOverlay').hidden = false;
    $('#studyResults').hidden = true;
    $('#studyActions').style.display = 'flex';
    saveProgress();
    renderFlipCard();
  }

  function renderFlipCard() {
    if (!studySession) return;
    const w = studySession.list[studySession.idx];
    if (!w) return;
    const total = studySession.list.length;
    const cur = studySession.idx + 1;
    $('#studyProgress').textContent = `${cur} / ${total}`;
    $('#studyProgressFill').style.width = (cur / total * 100) + '%';

    // По умолчанию RU→EN: на лицевой — русское слово (как на главной),
    // на обороте — английское слово (крупно, акцентным цветом) + пример
    const ruFirst = studySession.dir === 'ru-en';
    const frontWord = ruFirst ? w.translation : w.word;
    const frontLabel = ruFirst ? 'нажми — по-английски' : 'нажми — по-русски';
    const backWord = ruFirst ? w.word : w.translation;
    const backLabel = ruFirst ? 'english' : 'перевод';

    const img = w.imageUrl
      ? `<img class="flip-img" src="${escapeHTML(w.imageUrl)}" alt="">`
      : '<div class="flip-hint">нет картинки</div>';

    $('#studyStage').innerHTML = `
      <div class="flip-card" id="flipCard">
        <div class="flip-inner">
          <div class="flip-face flip-front-side">
            ${img}
            <div class="flip-word">${escapeHTML(frontWord)}</div>
            <div class="flip-hint">${frontLabel} (Пробел)</div>
          </div>
          <div class="flip-face flip-back-side">
            ${img}
            <div class="flip-back-label">${backLabel}</div>
            <div class="flip-back-word">${escapeHTML(backWord)}</div>
            <div class="flip-example">«${escapeHTML(w.example || '')}»</div>
          </div>
        </div>
      </div>
    `;
    $('#flipCard').onclick = () => $('#flipCard').classList.toggle('is-flipped');
    $('#btnNext').disabled = true;
    // Авто-озвучка английского слова при показе карточки
    setTimeout(() => speak(w.word), 400);
  }

  function nextStudyWord() {
    if (!studySession) return;
    studySession.idx++;
    if (studySession.idx >= studySession.list.length) finishStudy();
    else { renderFlipCard(); saveProgress(); }
  }

  function finishStudy() {
    $('#studyActions').style.display = 'none';
    $('#studyStage').innerHTML = '';
    const r = studySession;
    const total = r.list.length;
    const knowRate = total ? Math.round(r.know / total * 100) : 0;

    // Обновление статистики
    stats.learned += r.know;
    if (r.know > stats.best) stats.best = r.know;
    stats.lastStudy = Date.now();
    if (!stats.folders) stats.folders = {};
    if (r.folderId) {
      const cur = stats.folders[r.folderId] || 0;
      stats.folders[r.folderId] = cur + r.know;
    }
    saveStats();

    $('#resultsGrid').innerHTML = `
      <div class="result-stat"><span class="rs-num">${total}</span><span class="rs-lbl">Всего слов</span></div>
      <div class="result-stat"><span class="rs-num" style="color:var(--c-success)">${r.know}</span><span class="rs-lbl">Знаю</span></div>
      <div class="result-stat"><span class="rs-num" style="color:var(--c-danger)">${r.dontKnow}</span><span class="rs-lbl">Не знаю</span></div>
    `;
    $('#studyResults').hidden = false;
    clearProgress();
    updateStats();  // обновляем боковую панель статистики сразу
  }

  function closeStudy() {
    // Если прошли хотя бы 1 слово — сохраняем частичную статистику
    if (studySession && (studySession.know > 0 || studySession.dontKnow > 0) && studySession.idx > 0) {
      const r = studySession;
      stats.learned += r.know;
      if (r.know > stats.best) stats.best = r.know;
      stats.lastStudy = Date.now();
      saveStats();
      updateStats();
    }
    $('#studyOverlay').hidden = true;
    studySession = null;
    clearProgress();
  }

  function toggleDirection() {
    if (!studySession) return;
    studySession.dir = studySession.dir === 'ru-en' ? 'en-ru' : 'ru-en';
    $('#btnToggleDir').textContent = studySession.dir === 'ru-en' ? 'RU → EN' : 'EN → RU';
    renderFlipCard();
  }

  /* ============================================================
   * Сохранение/восстановление прогресса повторения
   * ============================================================ */
  function saveProgress() {
    if (!studySession) return;
    try {
      localStorage.setItem(LS_PROGRESS, JSON.stringify({
        list: studySession.list,
        idx: studySession.idx,
        dir: studySession.dir,
        know: studySession.know,
        dontKnow: studySession.dontKnow,
        folderId: studySession.folderId
      }));
    } catch (e) {}
  }
  function clearProgress() {
    localStorage.removeItem(LS_PROGRESS);
  }
  function maybeResumeStudy() {
    try {
      const p = localStorage.getItem(LS_PROGRESS);
      if (!p) return;
      const data = JSON.parse(p);
      if (!data.list || !data.list.length) return;
      // Только если сессия не завершена
      if (data.idx >= data.list.length) return;
      if (!confirm(`У вас незавершённое повторение (${data.idx + 1}/${data.list.length}). Продолжить?`)) {
        clearProgress();
        return;
      }
      studySession = {
        list: data.list, idx: data.idx, dir: data.dir || 'en-ru',
        know: data.know || 0, dontKnow: data.dontKnow || 0,
        folderId: data.folderId
      };
      $('#studyOverlay').hidden = false;
      $('#studyResults').hidden = true;
      $('#studyActions').style.display = 'flex';
      renderFlipCard();
    } catch (e) { console.warn('resume failed', e); }
  }

  /* ============================================================
   * МОДАЛКИ
   * ============================================================ */
  function openModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeModal(sel) {
    const m = $(sel);
    if (!m) return;
    m.hidden = true;
    document.body.style.overflow = '';
  }
  function closeAllModals() {
    $all('.modal-backdrop').forEach(m => m.hidden = true);
    document.body.style.overflow = '';
  }

  /* ============================================================
   * ГОРЯЧИЕ КЛАВИШИ
   *  /  — фокус на поиск
   *  Esc — закрыть всё
   *  Space — перевернуть карточку (в режиме повторения)
   *  S — озвучить (в режиме повторения)
   *  → — следующее слово
   * ============================================================ */
  function initHotkeys() {
    document.addEventListener('keydown', e => {
      // Пропуск, если фокус в поле ввода
      const tag = (e.target.tagName || '').toLowerCase();
      const inField = (tag === 'input' || tag === 'textarea' || tag === 'select');

      // / — фокус на поиск
      if (e.key === '/' && !inField) {
        e.preventDefault();
        $('#search').focus();
        return;
      }
      // Esc — закрыть
      if (e.key === 'Escape') {
        closeAllModals();
        if ($('#studyOverlay').hidden === false) closeStudy();
        return;
      }
      // Горячие клавиши режима повторения
      if ($('#studyOverlay').hidden === false && studySession) {
        if (e.key === ' ' && !inField) {
          e.preventDefault();
          $('#flipCard') && $('#flipCard').classList.toggle('is-flipped');
          return;
        }
        if ((e.key === 's' || e.key === 'S' || e.key === 'ы' || e.key === 'Ы') && !inField) {
          const w = studySession.list[studySession.idx];
          if (w) speak(w.word);
          return;
        }
        if (e.key === 'ArrowRight' && !inField) {
          if (!$('#btnNext').disabled) nextStudyWord();
          return;
        }
      }
    });
  }

  /* ============================================================
   * ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ
   * ============================================================ */
  function initEvents() {
    // Бургер и боковое меню
    $('#burger').onclick = () => toggleSidebar();
    $('#sidebarOverlay').onclick = () => toggleSidebar(false);
    $all('[data-scroll="top"]').forEach(b => b.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    // Боковое меню — действия (теперь через хеш-роутинг)
    $('#sideAddWord').onclick = () => { openWordModal(null); if (window.innerWidth <= 860) toggleSidebar(false); };
    $('#sideStudy').onclick = () => { openStudy('all'); if (window.innerWidth <= 860) toggleSidebar(false); };
    $('#sideStudyThemes').onclick = () => { openStudyThemesModal(); if (window.innerWidth <= 860) toggleSidebar(false); };
    $('#sideImport').onclick = () => { openModal('#importModal'); if (window.innerWidth <= 860) toggleSidebar(false); };
    $('#sideDark').onclick = toggleDark;
    $('#sideA11y').onclick = toggleA11y;
    $('#sideHelp').onclick = () => { openModal('#onboarding'); setOnbStep(1); };

    // Кнопки верхней панели — через хеш
    $('#btnStudyAll').onclick = () => openStudy('all');
    $('#btnAddWord').onclick  = () => openWordModal(null);
    $('#btnImport').onclick   = () => openModal('#importModal');
    $('#btnAbout').onclick    = () => openModal('#aboutModal');
    $('#btnSettings').onclick  = () => openModal('#settingsModal');

    // Настройки оформления
    $all('.theme-option').forEach(o => {
      o.onclick = () => {
        applyTheme(o.dataset.theme);
        toast('Тема: ' + o.dataset.name, 'success');
      };
    });
    $all('.accent-option').forEach(o => {
      o.onclick = () => {
        applyAccent(o.dataset.accent);
        toast('Акцент обновлён', 'success');
      };
    });
    $all('.palette-option').forEach(o => {
      o.onclick = () => {
        applyPalette(o.dataset.palette);
        toast('Палитра: ' + o.dataset.name, 'success');
      };
    });
    $all('.font-option').forEach(o => {
      o.onclick = () => {
        applyFont(o.dataset.font);
        toast('Шрифт: ' + o.dataset.font, 'success');
      };
    });
    $all('.size-option').forEach(o => {
      o.onclick = () => {
        applyFontSize(o.dataset.size);
        toast('Размер шрифта обновлён', 'success');
      };
    });
    $('#resetSettings').onclick = resetSettings;
    $('#btnDarkMode').onclick = toggleDark;
    $('#btnA11y').onclick = toggleA11y;
    $('#sideResetStats').onclick = () => {
      if (confirm('Сбросить всю статистику? Слова останутся, но счётчики обнулятся.')) {
        stats = { learned: 0, best: 0, lastStudy: null };
        saveStats();
        updateStats();
        toast('Статистика сброшена', 'success');
      }
    };

    // Живой поиск
    $('#search').addEventListener('input', e => {
      searchQuery = e.target.value.trim();
      renderGroups();
    });

    // Форма слова
    $('#wordForm').addEventListener('submit', saveWord);
    $('#btnUnsplashSearch').onclick = searchUnsplash;
    $('#btnImgPreview').onclick = () => showImgPreview($('#imgUrl').value.trim());
    $('#imgUrl').addEventListener('input', e => {
      $('#fImgUrl').value = e.target.value.trim();
    });

    $all('.img-tab').forEach(tab => {
      tab.onclick = () => {
        $all('.img-tab').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');
        $all('.img-pane').forEach(p => p.hidden = p.dataset.imgPane !== tab.dataset.imgTab);
      };
    });

    // Импорт
    $('#importFile').onchange = handleImportFile;
    $('#btnImportUrl').onclick = handleImportUrl;
    $('#btnAutoImages').onclick = autoFetchImages;

    // Выбор тем
    $('#themesSelectAll').onclick = themesSelectAll;
    $('#themesClear').onclick = themesClear;
    $('#themesStart').onclick = themesStart;

    // Онбординг
    $('#onbNext').onclick = onbNext;
    $('#onbPrev').onclick = onbPrev;
    $('#onbSkip').onclick = finishOnboarding;

    // Режим повторения
    $('#btnKnow').onclick = () => {
      if (!studySession) return;
      studySession.know++;
      $('#btnNext').disabled = false;
      toast('✔ Знаю', 'success');
    };
    $('#btnDontKnow').onclick = () => {
      if (!studySession) return;
      studySession.dontKnow++;
      $('#btnNext').disabled = false;
      toast('✖ Не знаю', 'error');
    };
    $('#btnNext').onclick = nextStudyWord;
    $('#btnToggleDir').onclick = toggleDirection;
    $('#btnStudySpeak').onclick = () => {
      if (studySession) speak(studySession.list[studySession.idx].word);
    };
    $('#btnCloseStudy').onclick = closeStudy;
    $('#btnRestartStudy').onclick = () => {
      const lastList = studySession.list;
      studySession = { list: lastList, idx: 0, dir: 'ru-en', know: 0, dontKnow: 0 };
      $('#studyResults').hidden = true;
      $('#studyActions').style.display = 'flex';
      renderFlipCard();
    };
    $('#btnExitStudy').onclick = closeStudy;

    // Закрытие модалок
    $all('[data-close]').forEach(b => b.onclick = () => closeAllModals());
    $all('.modal-backdrop').forEach(bd => {
      bd.onclick = e => { if (e.target === bd) closeAllModals(); };
    });

    // Год в футере
    $('#year').textContent = new Date().getFullYear();

    // Горячие клавиши
    initHotkeys();

    // Предзагрузка голосов для TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }

    // ============== PWA: регистрация Service Worker ==============
    registerServiceWorker();

    // ============== PWA: обработка установки ==============
    initInstallPrompt();

    // ============== Глубинные ссылки через ?action=... ==============
    handleUrlAction();
  }

  /* ============================================================
   * PWA: регистрация Service Worker
   * Только на https или localhost (требование браузеров).
   * При открытии через file:// SW не регистрируется.
   * ============================================================ */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // file:// протокол не поддерживает SW
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      console.info('[PWA] Service Worker требует https. Пропускаем регистрацию на', location.protocol);
      return;
    }
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.info('[PWA] Service Worker зарегистрирован:', reg.scope);
          // Проверяем наличие обновлений SW
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                toast('🔄 Доступна новая версия. Перезагрузите страницу', 'success');
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] SW registration failed:', err));
    });
  }

  /* ============================================================
   * PWA: обработка события beforeinstallprompt
   * Показывает кнопку установки 📲 в шапке и в боковом меню.
   * ============================================================ */
  let deferredInstallPrompt = null;

  function initInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
      // Предотвращаем стандартный мини-баннер
      e.preventDefault();
      deferredInstallPrompt = e;
      // Показываем кнопки установки
      $('#btnInstall').classList.remove('hidden');
      $('#sideInstall').hidden = false;
      console.info('[PWA] Готово к установке');
    });

    // Кнопка в шапке
    $('#btnInstall').onclick = triggerInstall;
    // Пункт в боковом меню
    $('#sideInstall').onclick = triggerInstall;

    // Скрыть кнопку после установки
    window.addEventListener('appinstalled', () => {
      $('#btnInstall').classList.add('hidden');
      $('#sideInstall').hidden = true;
      deferredInstallPrompt = null;
      toast('✅ Приложение установлено', 'success');
      // Отправка аналитики (если будет)
      console.info('[PWA] Установлено');
    });

    // Если уже запущено как standalone (PWA) — скрываем кнопку
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      $('#btnInstall').classList.add('hidden');
      $('#sideInstall').hidden = true;
    }
  }

  async function triggerInstall() {
    if (!deferredInstallPrompt) {
      toast('Откройте меню браузера → «Установить приложение»', 'success');
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      console.info('[PWA] Пользователь установил приложение');
    } else {
      console.info('[PWA] Пользователь отклонил установку');
    }
    deferredInstallPrompt = null;
  }

  /* ============================================================
   * Глубинные ссылки: ?action=study | add | import
   * Позволяет запускать конкретные функции из ярлыков PWA.
   * ============================================================ */
  function handleUrlAction() {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');
    if (!action) return;
    // Небольшая задержка, чтобы интерфейс успел отрисоваться
    setTimeout(() => {
      if (action === 'study') openStudy('all');
      else if (action === 'add') openWordModal(null);
      else if (action === 'import') openModal('#importModal');
    }, 500);
  }

  /* ============================================================
   * ИНИЦИАЛИЗАЦИЯ
   * ============================================================ */
  function init() {
    loadState();
    initEvents();

    // Восстановление темы
    const savedTheme = localStorage.getItem(LS_THEME) || '';
    if (savedTheme) applyTheme(savedTheme);

    // Восстановление настроек оформления (палитра — первой, потом остальные)
    const savedPalette = localStorage.getItem(LS_PALETTE);
    if (savedPalette) applyPalette(savedPalette);
    const savedAccent = localStorage.getItem(LS_ACCENT);
    if (savedAccent && !savedPalette) applyAccent(savedAccent);
    const savedFont = localStorage.getItem(LS_FONT);
    if (savedFont) applyFont(savedFont);
    const savedSize = localStorage.getItem(LS_FONTSIZE);
    if (savedSize) applyFontSize(savedSize);

    // Восстановление состояния бокового меню
    const sidebarState = localStorage.getItem(LS_SIDEBAR);
    if (window.innerWidth > 860) {
      toggleSidebar(sidebarState !== 'closed');
    } else {
      toggleSidebar(false);
    }

    // ====== Хеш-роутинг: при первом запуске и при смене # ======
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();  // первичная отрисовка на основе URL

    maybeShowOnboarding();
    if (localStorage.getItem(LS_PROGRESS)) {
      setTimeout(maybeResumeStudy, 1000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.ETT = {
    openStudy, openWordModal, importWords, renderAll,
    speak, toggleDark, toggleA11y, toggleSidebar,
    triggerInstall, sanitizeURL, sanitizeText, sanitizeEmoji
  };
})();
