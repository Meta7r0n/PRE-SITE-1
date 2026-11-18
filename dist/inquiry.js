(() => {
  'use strict';
  const endpoint = '/api/inquiries';
  const unavailable = 'Online sending is unavailable. You can copy or download your brief.';
  const initialStatus = 'Ready? Send this over and I’ll get back to you by email.';
  const sentStatus = 'Thanks for getting in touch. Your message has been sent, and I’ll reply by email.';
  const verificationError = 'Please complete the verification before sending your inquiry.';
  const deliveryError = 'We couldn’t confirm that your inquiry was sent. Try again or save a copy of your brief.';
  let settingsRequest;
  let turnstileRequest;

  function settings() {
    settingsRequest ??= fetch(endpoint, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000) })
      .then(response => response.ok ? response.json() : null)
      .catch(() => null);
    return settingsRequest;
  }

  function loadTurnstile() {
    turnstileRequest ??= new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => reject(new Error('Verification timed out')), 10000);
      function finish(error, turnstile) {
        clearTimeout(timeout);
        if (error) reject(error);
        else resolve(turnstile);
      }
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = () => {
        if (window.turnstile) window.turnstile.ready(() => finish(null, window.turnstile));
        else finish(new Error('Verification unavailable'));
      };
      script.onerror = () => finish(new Error('Verification unavailable'));
      document.head.append(script);
    });
    return turnstileRequest;
  }

  async function fingerprint(details) {
    const input = new TextEncoder().encode(JSON.stringify(details));
    const digest = await crypto.subtle.digest('SHA-256', input);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function connect({ type, review, details, honeypot }) {
    const button = review.querySelector('[data-inquiry-send]');
    const note = review.querySelector('[data-inquiry-status]');
    const challenge = review.querySelector('[data-inquiry-challenge]');
    const storageKey = `pre-inquiry-attempt-${type}`;
    let settingsForPage;
    let reviewed;
    let lastAttempt;
    let widget;
    let token = '';
    let sending = false;
    try { lastAttempt = JSON.parse(sessionStorage.getItem(storageKey)); } catch { /* Storage may be unavailable. */ }

    function updateButton() {
      button.hidden = !reviewed || Boolean(reviewed.attempt.sent);
      button.disabled = sending || Boolean(settingsForPage?.siteKey && !token);
      button.textContent = sending ? 'Sending…' : 'Send inquiry';
      challenge.hidden = !reviewed || !settingsForPage?.siteKey || reviewed.attempt.sent;
    }

    function remember(attempt) {
      lastAttempt = attempt;
      try { sessionStorage.setItem(storageKey, JSON.stringify(attempt)); } catch { /* Retries in this page still work. */ }
    }

    async function prepare() {
      const data = details();
      const serialized = JSON.stringify(data);
      if (reviewed?.serialized === serialized) return;
      reviewed = null;
      updateButton();
      note.textContent = 'Checking inquiry delivery…';
      try {
        const currentSettings = await settings();
        if (serialized !== JSON.stringify(details())) return;
        if (currentSettings?.enabled !== true) {
          note.textContent = unavailable;
          return;
        }
        const signature = await fingerprint(data);
        if (serialized !== JSON.stringify(details())) return;
        const recent = lastAttempt?.signature === signature && Date.now() - lastAttempt.createdAt < 86400000;
        const attempt = recent ? lastAttempt : { signature, id: crypto.randomUUID(), createdAt: Date.now(), sent: false };
        reviewed = { serialized, data, attempt };
        settingsForPage = currentSettings;
        note.textContent = attempt.sent ? sentStatus : initialStatus;
        updateButton();
        if (!settingsForPage.siteKey || attempt.sent || widget !== undefined) return;

        const turnstile = await loadTurnstile();
        if (widget !== undefined || !reviewed || reviewed.attempt.sent) return;
        widget = turnstile.render(challenge, {
          sitekey: settingsForPage.siteKey,
          action: type,
          appearance: 'interaction-only',
          size: 'flexible',
          'response-field': false,
          callback(proof) {
            token = proof;
            if (note.textContent === verificationError) note.textContent = initialStatus;
            updateButton();
          },
          'error-callback'() {
            token = '';
            if (!sending && !reviewed?.attempt.sent) note.textContent = verificationError;
            updateButton();
          },
          'expired-callback'() {
            token = '';
            updateButton();
          },
        });
      } catch {
        if (serialized === JSON.stringify(details())) note.textContent = unavailable;
      }
    }

    button.addEventListener('click', async () => {
      if (sending || !reviewed || reviewed.attempt.sent || button.disabled) return;
      const { data, attempt } = reviewed;
      sending = true;
      remember(attempt);
      note.textContent = 'Sending your inquiry…';
      updateButton();
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, details: data, requestId: attempt.id, website: honeypot.value, token }),
          redirect: 'error',
          signal: AbortSignal.timeout(18000),
        });
        const result = await response.json();
        attempt.sent = response.ok && result.sent === true;
        if (attempt.sent) remember(attempt);
        if (reviewed?.attempt === attempt) {
          if (attempt.sent) note.textContent = sentStatus;
          else if (result.error === 'verification') note.textContent = verificationError;
          else if (result.error === 'invalid') note.textContent = 'Please check your contact and project details before sending again.';
          else note.textContent = deliveryError;
        }
      } catch {
        if (reviewed?.attempt === attempt) note.textContent = deliveryError;
      } finally {
        sending = false;
        if (widget !== undefined) {
          token = '';
          window.turnstile.reset(widget);
        }
        updateButton();
      }
    });

    return prepare;
  }

  window.PRE_INQUIRIES = { connect };
})();
