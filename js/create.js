/* ============================================================
   CREATE PAGE — live preview + encode ke URL hash
   Fase 4: dukung foto (p) + audio (a)
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

    const previewCard      = document.getElementById('previewCard');
    const previewRecipient = document.getElementById('previewRecipient');
    const previewSender    = document.getElementById('previewSender');
    const previewMessage   = document.getElementById('previewMessage');
    const previewPhoto     = document.getElementById('previewPhoto');

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

    previewPhoto?.addEventListener('error', () => {
      previewPhoto.hidden = true;
    });

    recipientInput?.addEventListener('input', updateRecipientPreview);
    senderInput?.addEventListener('input', updateSenderPreview);
    messageInput?.addEventListener('input', updateMessagePreview);
    photoInput?.addEventListener('input', updatePhotoPreview);

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
      const theme     = THEMES.includes(themeInput?.value) ? themeInput.value : THEMES[0];

      if (!recipient || !sender || !message) {
        setStatus('Lengkapi dulu semua kolom ya.', 'error');
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
  });
})();