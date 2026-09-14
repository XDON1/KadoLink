/* ============================================================
   UCAPAN PAGE
   - Baca data dari URL hash → fallback localStorage
   - Render kartu + tema + foto + musik (MP3 / YouTube)
   - YouTube: IFrame API + oEmbed title + pill now-playing
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

  /* ---------- Base64url ---------- */
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

  /* ---------- Deteksi YouTube ---------- */
  const YT_PATTERNS = [
    /(?:youtube\.com\/watch\?[^#]*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /(?:music\.youtube\.com\/watch\?[^#]*v=)([a-zA-Z0-9_-]{11})/,
  ];

  function extractYouTubeId(url) {
    if (!url) return null;
    for (let i = 0; i < YT_PATTERNS.length; i++) {
      const m = url.match(YT_PATTERNS[i]);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  /* ---------- YouTube IFrame API loader ---------- */
  let ytApiPromise = null;
  function loadYouTubeApi() {
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) { resolve(window.YT); return; }

      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = function () {
        if (typeof prev === 'function') prev();
        resolve(window.YT);
      };

      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('Gagal memuat YouTube IFrame API'));
      document.head.appendChild(tag);

      // Timeout pengaman
      setTimeout(() => reject(new Error('YouTube IFrame API timeout')), 10000);
    });

    return ytApiPromise;
  }

  /* ---------- YouTube oEmbed (fetch judul) ---------- */
  async function fetchYouTubeTitle(videoUrl) {
    try {
      const endpoint = 'https://www.youtube.com/oembed?url=' +
        encodeURIComponent(videoUrl) + '&format=json';
      const res = await fetch(endpoint, { mode: 'cors' });
      if (!res.ok) return null;
      const data = await res.json();
      return data && typeof data.title === 'string' ? data.title : null;
    } catch (err) {
      console.warn('[KadoLink] oEmbed gagal:', err?.message);
      return null;
    }
  }

  /* ---------- Data helpers ---------- */
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
       MUSIK
       ============================================================ */
    const audioEl   = document.getElementById('greetingAudio');
    const musicBtn  = document.getElementById('musicBtn');   // MP3 pill lama
    const musicIcon = musicBtn?.querySelector('.music-icon');
    const musicLbl  = musicBtn?.querySelector('.music-label');

    const ytPill        = document.getElementById('musicPillYt');
    const ytPillGlyph   = ytPill?.querySelector('.music-pill-icon-glyph');
    const ytPillEyebrow = document.getElementById('musicPillEyebrow');
    const ytPillTitle   = document.getElementById('musicPillTitle');

    const ytId = data.a ? extractYouTubeId(data.a) : null;

    /* ============================================================
       JALUR A — YouTube pill
       ============================================================ */
    if (ytId && ytPill) {
      ytPill.hidden = false;
      if (musicBtn) musicBtn.hidden = true;

      // ---- State helpers ----
      const setGlyph = (icon, char) => {
        if (!ytPillGlyph) return;
        ytPillGlyph.setAttribute('data-icon', icon);
        ytPillGlyph.textContent = char;
      };

      const setState = (state) => {
        ytPill.classList.toggle('is-loading', state === 'loading');
        ytPill.classList.toggle('is-playing', state === 'playing');
        ytPill.classList.toggle('is-error',   state === 'error');

        if (state === 'loading') {
          setGlyph('loading', '◌');
          if (ytPillEyebrow) ytPillEyebrow.textContent = 'Memuat…';
        } else if (state === 'playing') {
          setGlyph('pause', '❚❚');
          if (ytPillEyebrow) ytPillEyebrow.textContent = 'Sedang diputar';
        } else if (state === 'error') {
          setGlyph('error', '⚠');
          if (ytPillEyebrow) ytPillEyebrow.textContent = 'Gagal memutar';
        } else {
          setGlyph('play', '▶');
          if (ytPillEyebrow) ytPillEyebrow.textContent = 'Musik YouTube';
        }
      };

      // ---- Fetch judul via oEmbed (jalan paralel, tidak blocking) ----
      fetchYouTubeTitle(data.a).then((title) => {
        if (ytPillTitle && title) {
          ytPillTitle.textContent = title;
          // Setelah render, cek overflow untuk marquee
          requestAnimationFrame(() => updateMarquee(ytPill, ytPillTitle));
        } else if (ytPillTitle) {
          ytPillTitle.textContent = 'Musik YouTube';
        }
      });

      // ---- Load API + buat player ----
      setState('loading');

      let player = null;

      loadYouTubeApi()
        .then((YT) => {
          return new Promise((resolve) => {
            player = new YT.Player('ytPlayerTarget', {
              videoId: ytId,
              playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                fs: 0,
                modestbranding: 1,
                playsinline: 1,
                rel: 0,
                origin: window.location.origin,
              },
              events: {
                onReady: () => {
                  setState('idle');
                  resolve(player);
                },
                onStateChange: (event) => {
                  const s = event.data;
                  if (s === YT.PlayerState.PLAYING)      setState('playing');
                  else if (s === YT.PlayerState.PAUSED)  setState('idle');
                  else if (s === YT.PlayerState.BUFFERING) setState('loading');
                  else if (s === YT.PlayerState.ENDED)   setState('idle');
                },
                onError: (event) => {
                  const reasons = {
                    2:   'ID video tidak valid',
                    5:   'Video tidak bisa di-embed (HTML5)',
                    100: 'Video tidak ditemukan / privat',
                    101: 'Pemilik melarang embed',
                    150: 'Pemilik melarang embed',
                  };
                  console.warn('[KadoLink] YouTube error:', reasons[event.data] || event.data);
                  setState('error');
                  if (ytPillEyebrow) {
                    ytPillEyebrow.textContent = reasons[event.data] || 'Video tidak bisa diputar';
                  }
                },
              },
            });
          });
        })
        .catch((err) => {
          console.warn('[KadoLink] YouTube API gagal dimuat:', err?.message);
          setState('error');
        });

      // ---- Klik pill: play/pause ----
      ytPill.addEventListener('click', () => {
        if (!player || typeof player.playVideo !== 'function') return;

        if (ytPill.classList.contains('is-error')) {
          // Kalau error karena network sementara, coba play ulang
          try { player.playVideo(); } catch (_) {}
          return;
        }

        try {
          const state = typeof player.getPlayerState === 'function'
            ? player.getPlayerState()
            : -1;

          // 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING, 5 = CUED
          if (state === 1 || state === 3) {
            player.pauseVideo();
          } else {
            player.playVideo();
          }
        } catch (err) {
          console.warn('[KadoLink] Kontrol YouTube gagal:', err?.message);
          setState('error');
        }
      });

    /* ============================================================
       JALUR B — MP3 (regresi, tidak berubah)
       ============================================================ */
    } else if (audioEl && musicBtn && data.a) {
      musicBtn.hidden = false;
      audioEl.src = data.a;
      audioEl.load();

      const setMusicLabel = (icon, label) => {
        if (musicIcon) musicIcon.textContent = icon;
        if (musicLbl)  musicLbl.textContent  = label;
      };

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

      musicBtn.addEventListener('click', async () => {
        if (musicBtn.classList.contains('is-error')) {
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

      audioEl.addEventListener('loadstart', () => {
        if (audioEl.paused) setBtnState('loading');
      });
      audioEl.addEventListener('canplay', () => {
        if (audioEl.paused) setBtnState('idle');
      });
      audioEl.addEventListener('playing', () => setBtnState('playing'));
      audioEl.addEventListener('pause', () => {
        if (!musicBtn.classList.contains('is-error')) setBtnState('idle');
      });
      audioEl.addEventListener('waiting', () => {
        if (!audioEl.paused) setBtnState('loading');
      });
      audioEl.addEventListener('error', () => {
        const code = audioEl.error?.code;
        const reason = {
          1: 'ABORTED', 2: 'NETWORK', 3: 'DECODE', 4: 'SRC_NOT_SUPPORTED',
        }[code] || 'UNKNOWN';
        console.warn(`[KadoLink] Audio error (${reason}):`, data.a);
        setBtnState('error');
      });

      setTimeout(() => {
        if (audioEl.readyState === 0 && !musicBtn.classList.contains('is-playing')) {
          if (!musicBtn.classList.contains('is-error')) {
            console.warn('[KadoLink] Audio timeout:', data.a);
            setBtnState('error');
          }
        }
      }, 8000);
    }

    /* ============================================================
       MARQUEE — cek overflow judul, aktifkan animasi kalau perlu
       ============================================================ */
    function updateMarquee(pillEl, titleEl) {
      if (!pillEl || !titleEl) return;

      const container = titleEl.parentElement; // .music-pill-title
      if (!container) return;

      const containerW = container.clientWidth;
      const textW = titleEl.scrollWidth;

      if (textW > containerW + 4) {
        const distance = textW - containerW + 24; // + buffer
        const duration = Math.max(8, Math.min(24, distance / 30)); // px/detik
        pillEl.classList.add('is-overflow');
        pillEl.style.setProperty('--marquee-distance', `${distance}px`);
        pillEl.style.setProperty('--marquee-duration', `${duration}s`);
      } else {
        pillEl.classList.remove('is-overflow');
        pillEl.style.removeProperty('--marquee-distance');
        pillEl.style.removeProperty('--marquee-duration');
      }
    }

    // Recalc saat resize
    let resizeT = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        if (ytPill && ytPillTitle && !ytPill.hidden) {
          updateMarquee(ytPill, ytPillTitle);
        }
      }, 150);
    });

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
       COPY LINK
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
        window.prompt('Salin tautan ini:', url);
        return;
      }
      copyModalInput.value = url;
      copyModal.hidden = false;
      document.body.style.overflow = 'hidden';
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

    copyModal?.querySelectorAll('[data-close-modal]').forEach((el) => {
      el.addEventListener('click', closeCopyModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && copyModal && !copyModal.hidden) closeCopyModal();
    });

    copyModalSelect?.addEventListener('click', () => {
      if (!copyModalInput) return;
      copyModalInput.focus();
      copyModalInput.select();

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

    async function copyToClipboard(url) {
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(url);
          return true;
        } catch (err) {
          console.warn('[KadoLink] clipboard API gagal:', err?.name);
        }
      }

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