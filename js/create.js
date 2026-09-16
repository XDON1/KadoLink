/* ============================================================
   CREATE PAGE — live preview + encode ke URL hash
   Fase 4c: dukung foto + audio (MP3/YouTube) + indikator tipe
   ============================================================ */
(() => {
  'use strict';

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

  const STORAGE_KEY  = 'kadoLinkData';
  const NEXT_PAGE    = 'ucapan.html';
  const DATA_VERSION = 1;

  const PLACEHOLDER = {
    recipient: 'Nama penerima',
    sender:    '— Nama kamu',
    message:   'Pesanmu akan muncul di sini.',
  };

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

  function detectAudioType(url) {
    const v = (url ?? '').trim();
    if (!v) return 'empty';
    if (extractYouTubeId(v)) return 'youtube';
    if (/\.(mp3|m4a|aac|ogg|wav|opus|flac)(\?|#|$)/i.test(v)) return 'mp3';
    if (/^https?:\/\//i.test(v)) return 'mp3'; // asumsi audio biasa
    return 'unknown';
  }

  /* ---------- Base64url ---------- */
  function b64urlEncode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn, { once: true })
      : fn();

  onReady(() => {
    const createForm = document.getElementById('createForm');
    if (!createForm) return;

    const themeOptions = Array.from(document.querySelectorAll('.theme-option'));
    const themeInput   = document.getElementById('theme');

    const recipientInput = document.getElementById('recipient');
    const senderInput    = document.getElementById('sender');
    const messageInput   = document.getElementById('message');
    const photoInput     = document.getElementById('photo');
    const audioInput     = document.getElementById('audio');
    const countdownInput = document.getElementById('countdown');

    const previewCard      = document.getElementById('previewCard');
    const previewRecipient = document.getElementById('previewRecipient');
    const previewSender    = document.getElementById('previewSender');
    const previewMessage   = document.getElementById('previewMessage');
    const previewPhoto     = document.getElementById('previewPhoto');

    const audioTypeHint  = document.getElementById('audioTypeHint');
    const audioTypeBadge = document.getElementById('audioTypeBadge');

    const submitBtn = document.getElementById('submitBtn');
    const statusEl  = document.getElementById('formStatus');

    const setText = (el, value, fallback = '') => {
      if (!el) return;
      const v = (value ?? '').toString().trim();
      el.textContent = v || fallback;
    };

    const setStatus = (msg, type = '') => {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.classList.remove('is-error', 'is-success');
      if (type) statusEl.classList.add(`is-${type}`);
    };

    /* ---------- THEME ---------- */
    function applyTheme(rawTheme) {
      const theme = THEMES.includes(rawTheme) ? rawTheme : THEMES[0];

      themeOptions.forEach((option) => {
        const isActive = option.dataset.theme === theme;
        option.classList.toggle('is-active', isActive);
        option.setAttribute('aria-pressed', String(isActive));
      });

      if (themeInput) themeInput.value = theme;

      if (previewCard) {
        THEMES.forEach((t) => previewCard.classList.remove(`preview-${t}`));
        previewCard.classList.add(`preview-${theme}`);
      }
    }

    themeOptions.forEach((option) => {
      option.addEventListener('click', () => applyTheme(option.dataset.theme));
    });

    /* ---------- LIVE PREVIEW ---------- */
    const updateRecipientPreview = () =>
      setText(previewRecipient, recipientInput?.value, PLACEHOLDER.recipient);

    const updateSenderPreview = () => {
      const v = (senderInput?.value ?? '').trim();
      setText(previewSender, v ? `— ${v}` : '', PLACEHOLDER.sender);
    };

    const updateMessagePreview = () =>
      setText(previewMessage, messageInput?.value, PLACEHOLDER.message);

    function updatePhotoPreview() {
      if (!previewPhoto) return;
      const url = (photoInput?.value ?? '').trim();
      if (!url) {
        previewPhoto.hidden = true;
        previewPhoto.removeAttribute('src');
        return;
      }
      previewPhoto.src = url;
      previewPhoto.hidden = false;
    }

    function updateAudioTypeHint() {
      if (!audioTypeHint || !audioTypeBadge) return;
      const url = (audioInput?.value ?? '').trim();
      const type = detectAudioType(url);

      audioTypeBadge.classList.remove('is-youtube', 'is-mp3', 'is-unknown');

      if (type === 'empty') {
        audioTypeHint.hidden = true;
        audioTypeBadge.textContent = '—';
        return;
      }

      audioTypeHint.hidden = false;

      if (type === 'youtube') {
        audioTypeBadge.textContent = 'YouTube';
        audioTypeBadge.classList.add('is-youtube');
      } else if (type === 'mp3') {
        audioTypeBadge.textContent = 'MP3 / Audio';
        audioTypeBadge.classList.add('is-mp3');
      } else {
        audioTypeBadge.textContent = 'Tidak dikenal';
        audioTypeBadge.classList.add('is-unknown');
      }
    }

    previewPhoto?.addEventListener('error', () => { previewPhoto.hidden = true; });

    recipientInput?.addEventListener('input', updateRecipientPreview);
    senderInput?.addEventListener('input', updateSenderPreview);
    messageInput?.addEventListener('input', updateMessagePreview);
    photoInput?.addEventListener('input', updatePhotoPreview);
    audioInput?.addEventListener('input', updateAudioTypeHint);

    /* ---------- SUBMIT ---------- */
    createForm.addEventListener('submit', (event) => {
      event.preventDefault();
      setStatus('');

      if (typeof createForm.checkValidity === 'function' && !createForm.checkValidity()) {
        createForm.reportValidity();
        setStatus('Lengkapi dulu semua kolom ya.', 'error');
        return;
      }

      const recipient = (recipientInput?.value ?? '').trim();
      const sender    = (senderInput?.value ?? '').trim();
      const message   = (messageInput?.value ?? '').trim();
      const photo     = (photoInput?.value ?? '').trim();
      const audio     = (audioInput?.value ?? '').trim();
      const countdown = (countdownInput?.value ?? '').trim();
      const theme     = THEMES.includes(themeInput?.value) ? themeInput.value : THEMES[0];

      if (!recipient || !sender || !message) {
        setStatus('Lengkapi dulu semua kolom ya.', 'error');
        return;
      }

      // Kalau user isi audio tapi URL tidak dikenali, kasih peringatan (tidak blocking)
      if (audio && detectAudioType(audio) === 'unknown') {
        setStatus('URL musik tidak dikenali. Pastikan MP3 atau YouTube.', 'error');
        return;
      }

      const payload = {
        v: DATA_VERSION,
        r: recipient,
        s: sender,
        m: message,
        t: theme,
        p: photo,
        a: audio,
        c: countdown,
        g: [],
      };

      const originalLabel = submitBtn?.textContent ?? 'Buat KadoLink';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
        submitBtn.textContent = 'Membuat';
      }
      setStatus('Menyiapkan tautan...');

      try {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch (_) {}

        const encoded = b64urlEncode(JSON.stringify(payload));
        window.location.href = `${NEXT_PAGE}#d=${encoded}`;
      } catch (err) {
        console.error('[KadoLink] Gagal membuat tautan:', err);
        setStatus('Gagal membuat tautan. Coba lagi ya.', 'error');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.classList.remove('is-loading');
          submitBtn.textContent = originalLabel;
        }
      }
    });

    /* ---------- INIT ---------- */
    applyTheme(themeInput?.value || 'romantic');
    updateRecipientPreview();
    updateSenderPreview();
    updateMessagePreview();
    updatePhotoPreview();
    updateAudioTypeHint();
  });
})();