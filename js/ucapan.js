/* ============================================================
   UCAPAN PAGE
   - Baca data dari URL hash → fallback localStorage
   - Render kartu + tema + foto + musik + confetti + copy link
   - Copy link: clipboard API → execCommand → modal fallback
   - Audio: loading/error state yang jelas
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

  function readHashData() {
    const match = window.location.hash.match(/[#&]d=([^&]+)/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(b64urlDecode(match[1]));
      return parsed && parsed.r ? parsed : null;
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

  function normalizeData(d) {
    if (!d) return null;
    return {
      v: d.v ?? 0,
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

    /* ---------- Sumber data ---------- */
    let fromHash = true;
    let data = normalizeData(readHashData());

    if (!data) {
      fromHash = false;
      data = normalizeData(readStorageData());
    }

    if (!data || !data.r) {
      window.location.replace(FALLBACK_REDIRECT);
      return;
    }

    if (!fromHash) {
      try {
        const encoded = b64urlEncode(JSON.stringify(data));
        history.replaceState(null, '', `#d=${encoded}`);
      } catch (_) {}
    }

    /* ---------- Tema ---------- */
    const theme = THEMES.includes(data.t) ? data.t : THEMES[0];
    card.classList.remove(...THEMES.map((t) => `tema-${t}`));
    card.classList.add(`tema-${theme}`);

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
    setText('sender',    `— ${data.s}`);

    document.title = `Untuk ${data.r} — KadoLink`;

    /* ---------- Foto ---------- */
    const photoEl = document.getElementById('greetingPhoto');
    if (photoEl && data.p) {
      photoEl.addEventListener('error', () => { photoEl.hidden = true; });
      photoEl.addEventListener('load',  () => { photoEl.hidden = false; });
      photoEl.src = data.p;
    }

    /* ============================================================
       MUSIK — versi robust dengan error state jelas
       ============================================================ */
    const audioEl   = document.getElementById('greetingAudio');
    const musicBtn  = document.getElementById('musicBtn');
    const musicIcon = musicBtn?.querySelector('.music-icon');
    const musicLbl  = musicBtn?.querySelector('.music-label');

    const setMusicLabel = (icon, label) => {
      if (musicIcon) musicIcon.textContent = icon;
      if (musicLbl)  musicLbl.textContent  = label;
    };

    if (audioEl && musicBtn && data.a) {
      musicBtn.hidden = false;

      // Set src setelah event listener terpasang (hindari race condition)
      audioEl.src = data.a;
      audioEl.load();

      // ---- State machine tombol ----
      const setBtnState = (state) => {
        musicBtn.classList.toggle('is-loading', state === 'loading');
        musicBtn.classList.toggle('is-playing', state === 'playing');
        musicBtn.classList.toggle('is-error',   state === 'error');

        if (state === 'loading') setMusicLabel('…', 'Memuat');
        else if (state === 'playing') setMusicLabel('❚❚', 'Jeda musik');
        else if (state === 'error')   setMusicLabel('⚠', 'Musik gagal diputar');
        else                          setMusicLabel('▶', 'Putar musik');
      };

      setBtnState('idle');

      // ---- Klik tombol ----
      musicBtn.addEventListener('click', async () => {
        if (musicBtn.classList.contains('is-error')) {
          // Coba reload kalau sebelumnya error
          setBtnState('loading');
          audioEl.load();
          return;
        }

        if (audioEl.paused) {
          setBtnState('loading');
          try {
            await audioEl.play();
          } catch (err) {
            console.warn('[KadoLink] play() gagal:', err?.name, err?.message);
            setBtnState('error');
          }
        } else {
          audioEl.pause();
        }
      });

      // ---- Event audio ----
      audioEl.addEventListener('loadstart', () => {
        if (audioEl.paused) setBtnState('loading');
      });

      audioEl.addEventListener('canplay', () => {
        if (audioEl.paused) setBtnState('idle');
      });

      audioEl.addEventListener('playing', () => setBtnState('playing'));
      audioEl.addEventListener('pause',   () => {
        if (!musicBtn.classList.contains('is-error')) setBtnState('idle');
      });

      audioEl.addEventListener('waiting', () => {
        if (!audioEl.paused) setBtnState('loading');
      });

      audioEl.addEventListener('ended', () => {
        if (!audioEl.loop) setBtnState('idle');
      });

      audioEl.addEventListener('error', () => {
        const code = audioEl.error?.code;
        const reason = {
          1: 'ABORTED',
          2: 'NETWORK',
          3: 'DECODE',
          4: 'SRC_NOT_SUPPORTED',
        }[code] || 'UNKNOWN';
        console.warn(`[KadoLink] Audio error (${reason}):`, data.a);
        setBtnState('error');
      });

      // Kalau setelah 8 detik belum bisa play → anggap error
      setTimeout(() => {
        if (audioEl.readyState === 0 && !musicBtn.classList.contains('is-playing')) {
          // readyState 0 = HAVE_NOTHING → resource tidak ke-load
          if (!musicBtn.classList.contains('is-error')) {
            console.warn('[KadoLink] Audio timeout — resource tidak merespons:', data.a);
            setBtnState('error');
          }
        }
      }, 8000);
    }

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
        piece.style.left = `${Math.random() * 100}%`;
        piece.style.background = palette[i % palette.length];
        piece.style.width  = `${6 + Math.random() * 6}px`;
        piece.style.height = `${8 + Math.random() * 8}px`;
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.setProperty('--dx',  `${(Math.random() - 0.5) * 240}px`);
        piece.style.setProperty('--rot', `${(Math.random() * 720 - 360)}deg`);
        piece.style.animationDuration = `${2.4 + Math.random() * 1.8}s`;
        piece.style.animationDelay    = `${Math.random() * 0.6}s`;
        layer.appendChild(piece);
      }

      setTimeout(() => layer.remove(), 5000);
    }

    setTimeout(spawnConfetti, 1400);

    /* ============================================================
       COPY LINK — clipboard API → execCommand → modal fallback
       ============================================================ */
    const copyBtn    = document.getElementById('copyBtn');
    const copyStatus = document.getElementById('copyStatus');

    const copyModal       = document.getElementById('copyModal');
    const copyModalInput  = document.getElementById('copyModalInput');
    const copyModalSelect = document.getElementById('copyModalSelectAll');

    const setCopyStatus = (msg) => {
      if (!copyStatus) return;
      copyStatus.textContent = msg;
      clearTimeout(setCopyStatus._t);
      setCopyStatus._t = setTimeout(() => { copyStatus.textContent = ''; }, 2600);
    };

    function openCopyModal(url) {
      if (!copyModal || !copyModalInput) {
        // Kalau modal tidak ada di HTML → fallback prompt
        window.prompt('Salin tautan ini:', url);
        return;
      }
      copyModalInput.value = url;
      copyModal.hidden = false;
      document.body.style.overflow = 'hidden';

      // Auto-select setelah render
      requestAnimationFrame(() => {
        copyModalInput.focus();
        copyModalInput.select();
      });
    }

    function closeCopyModal() {
      if (!copyModal) return;
      copyModal.hidden = true;
      document.body.style.overflow = '';
    }

    // Tutup modal via backdrop atau tombol close
    copyModal?.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', closeCopyModal);
    });

    // ESC untuk tutup modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && copyModal && !copyModal.hidden) {
        closeCopyModal();
      }
    });

    // Tombol "Pilih semua" di modal
    copyModalSelect?.addEventListener('click', () => {
      if (!copyModalInput) return;
      copyModalInput.focus();
      copyModalInput.select();

      // Coba copy lagi dari modal
      try {
        if (navigator.clipboard?.writeText) {
          navigator.clipboard.writeText(copyModalInput.value).then(
            () => setCopyStatus('Tautan disalin ✓'),
            () => setCopyStatus('Tekan Ctrl+C untuk menyalin')
          );
        } else if (document.execCommand('copy')) {
          setCopyStatus('Tautan disalin ✓');
        } else {
          setCopyStatus('Tekan Ctrl+C untuk menyalin');
        }
      } catch (_) {
        setCopyStatus('Tekan Ctrl+C untuk menyalin');
      }
    });

    // Coba urutan: clipboard API → execCommand → modal
    async function copyToClipboard(url) {
      // 1. Modern API (butuh secure context: https / localhost)
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(url);
          return true;
        } catch (err) {
          console.warn('[KadoLink] clipboard API gagal:', err?.name);
        }
      }

      // 2. Legacy execCommand (deprecated, tapi masih jalan di banyak browser)
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, url.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) return true;
      } catch (err) {
        console.warn('[KadoLink] execCommand gagal:', err?.message);
      }

      // 3. Modal fallback — selalu berhasil (user copy manual)
      return false;
    }

    copyBtn?.addEventListener('click', async () => {
      const url = window.location.href;
      const ok = await copyToClipboard(url);

      if (ok) {
        setCopyStatus('Tautan disalin ✓');
      } else {
        setCopyStatus('');
        openCopyModal(url);
      }
    });
  });
})();