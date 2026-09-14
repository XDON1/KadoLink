/* ============================================================
   UCAPAN PAGE
   - Baca data dari URL hash (prioritas) → fallback localStorage
   - Render kartu + copy tautan portable + confetti
   ============================================================ */
(() => {
  'use strict';

  const STORAGE_KEY       = 'kadoLinkData';
  const FALLBACK_REDIRECT = 'create.html';

  const THEMES = [
    'romantic',
    'birthday',
    'cute',
    'sunset',
    'ocean',
    'forest',
    'elegant',
    'midnight',
  ];

  const THEME_COLORS = {
    romantic: '#ffe4ec',
    birthday: '#fff1c9',
    cute:     '#e3f5ec',
    sunset:   '#ffe0c2',
    ocean:    '#c9ecf5',
    forest:   '#d8ebd0',
    elegant:  '#35303d',
    midnight: '#1a1f3a',
  };

  const THEME_CONFETTI = {
    romantic: ['#ffb8d1', '#f3d5e8', '#ffd6b8', '#c9b6ff'],
    birthday: ['#ffd67a', '#ffb37a', '#fff1c9', '#ff9ec2'],
    cute:     ['#a8e6c8', '#ffc1d9', '#c9f0ff', '#e8ffd6'],
    sunset:   ['#ffb37a', '#ff8a8a', '#ffd6a8', '#ff7a9a'],
    ocean:    ['#8ad3ea', '#a8d8ea', '#c9ecf5', '#7ab8d4'],
    forest:   ['#a8d89c', '#d8ebd0', '#c4e2b8', '#8fc482'],
    elegant:  ['#b0a4c4', '#cfc4dd', '#e6dff0', '#8a7fa0'],
    midnight: ['#8a80c4', '#b8b0d0', '#d8d2ec', '#a49ad8'],
  };

  /* ---------- Base64url helpers ---------- */
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(b64url) {
    const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4 ? '='.repeat(4 - (b64.length % 4)) : '';
    const bin = atob(b64 + pad);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- Ambil data dari hash atau localStorage ---------- */
  function readHashData() {
    const match = window.location.hash.match(/[#&]d=([^&]+)/);
    if (!match) return null;
    try {
      const json = b64urlDecode(match[1]);
      const parsed = JSON.parse(json);
      return parsed || null;
    } catch (err) {
      console.warn('[KadoLink] Hash rusak:', err);
      return null;
    }
  }

  function readStorageData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && (parsed.r || parsed.recipient) ? parsed : null;
    } catch (err) {
      console.warn('[KadoLink] localStorage rusak:', err);
      return null;
    }
  }

  // Normalisasi format lama (recipient/sender/...) → format baru (r/s/m/...)
  function normalizeData(d) {
    if (!d) return null;
    return {
      v: d.v ?? 1,
      r: d.r ?? d.recipient ?? '',
      s: d.s ?? d.sender    ?? '',
      m: d.m ?? d.message   ?? '',
      t: d.t ?? d.theme     ?? THEMES[0],
      p: d.p ?? '',
      a: d.a ?? '',
      g: Array.isArray(d.g) ? d.g : [],
    };
  }

  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const card = document.getElementById('greetingCard');
    if (!card) return;

    /* ---------- Sumber data: hash → fallback localStorage ---------- */
    let fromHash = true;
    let data = normalizeData(readHashData());

    if (!data) {
      fromHash = false;
      data = normalizeData(readStorageData());
    }

    if (!data || !data.r || !data.s || !data.m) {
      window.location.replace(FALLBACK_REDIRECT);
      return;
    }

    // Kalau data dari localStorage tapi URL belum punya hash → tambahkan
    // supaya tombol "Salin tautan" menghasilkan URL yang portable
    if (!fromHash) {
      try {
        const encoded = b64urlEncode(JSON.stringify(data));
        history.replaceState(null, '', '#d=' + encoded);
      } catch (err) {
        console.warn('[KadoLink] Gagal menambahkan hash portable:', err);
      }
    }

    /* ---------- Tema ---------- */
    const theme = THEMES.includes(data.t) ? data.t : THEMES[0];
    card.classList.remove(...THEMES.map((t) => 'tema-' + t));
    card.classList.add('tema-' + theme);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme && THEME_COLORS[theme]) {
      metaTheme.setAttribute('content', THEME_COLORS[theme]);
    }

    /* ---------- Teks ---------- */
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    setText('recipient', data.r);
    setText('message',   data.m);
    setText('sender',    '— ' + data.s);

    document.title = 'Untuk ' + data.r + ' — KadoLink';

    /* ---------- Confetti ---------- */
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function spawnConfetti() {
      if (reducedMotion) return;

      const layer = document.createElement('div');
      layer.className = 'confetti-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);

      const palette = THEME_CONFETTI[theme] || THEME_CONFETTI.romantic;
      const total = window.innerWidth < 480 ? 28 : 48;

      for (let i = 0; i < total; i++) {
        const piece = document.createElement('span');
        piece.className = 'confetti-piece';
        piece.style.left = (Math.random() * 100) + '%';
        piece.style.background = palette[i % palette.length];
        piece.style.width  = (6 + Math.random() * 6) + 'px';
        piece.style.height = (8 + Math.random() * 8) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.setProperty('--dx',  ((Math.random() - 0.5) * 240) + 'px');
        piece.style.setProperty('--rot', ((Math.random() * 720 - 360)) + 'deg');
        piece.style.animationDuration = (2.4 + Math.random() * 1.8) + 's';
        piece.style.animationDelay    = (Math.random() * 0.6) + 's';
        layer.appendChild(piece);
      }

      setTimeout(() => layer.remove(), 5000);
    }

    setTimeout(spawnConfetti, 1400);

    /* ---------- Copy link ---------- */
    const copyBtn    = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');

    const setCopyStatus = (msg) => {
      if (!copyStatus) return;
      copyStatus.textContent = msg;
      clearTimeout(setCopyStatus._t);
      setCopyStatus._t = setTimeout(() => { copyStatus.textContent = ''; }, 2200);
    };

    copyBtn?.addEventListener('click', async () => {
      const url = window.location.href; // sudah termasuk hash berisi data
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const ta = document.createElement('textarea');
          ta.value = url;
          ta.style.position = 'fixed';
          ta.style.opacity  = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        }
        setCopyStatus('Tautan disalin ✓');
      } catch (err) {
        console.error('[KadoLink] Gagal menyalin:', err);
        setCopyStatus('Gagal menyalin. Salin manual dari address bar.');
      }
    });
  });
})();