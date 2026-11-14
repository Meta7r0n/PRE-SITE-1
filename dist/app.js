(() => {
  'use strict';
  const config = window.PRE_CONFIG || { previewMode: true };
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const icon = id => `<svg class="icon" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const services = {
    lighting: { title: 'Lighting & outlets', label: 'Lighting & outlets', icon: 'light', short: 'Fixture replacements, new lighting, dimmers, switches, and outlets for everyday use.', copy: 'Make lighting and power more useful in the rooms and outdoor areas you use every day.', details: ['Interior and exterior lighting improvements', 'Fixture, switch, and dimmer replacements', 'Outlet additions and replacements'] },
    panels: { title: 'Circuits & panel upgrades', label: 'Circuits & panel upgrades', icon: 'panel', short: 'Dedicated circuits, added capacity, and electrical planning for residential improvements.', copy: 'Start with the electrical system you have, then plan the changes needed for your home project.', details: ['Dedicated circuits for household equipment', 'Panel and service upgrade planning', 'Electrical changes for residential improvements'] },
    ev: { title: 'Home EV chargers', label: 'Home EV chargers', icon: 'ev', short: 'Home charger installation planned around your vehicle, parking location, and electrical capacity.', copy: 'Plan a home charging installation around your property, charger requirements, and existing electrical system.', details: ['Charger location and parking layout', 'Electrical capacity and dedicated circuit planning', 'Installation route and equipment requirements'] },
    repairs: { title: 'Troubleshooting & repairs', label: 'Troubleshooting & repairs', icon: 'tool', short: 'A methodical approach to electrical issues, with a clear explanation of the proposed repair.', copy: 'Describe the issue you’re noticing, then work through the existing setup to establish the cause and proposed repair.', details: ['Outlet, circuit, and lighting troubleshooting', 'Assessment of recurring electrical issues', 'An explanation of findings and proposed repairs'] },
    unsure: { title: 'Not sure yet', label: 'Not sure yet', icon: 'bolt', short: 'Describe the work you have in mind.', copy: 'You don’t need technical terminology to get started. Describe the change you would like to make.', details: ['Describe the issue or improvement', 'Share your town and general timing', 'Discuss the appropriate next step'] }
  };
  const residentialServices = ['lighting', 'panels', 'ev', 'repairs'];
  const plannerServices = [...residentialServices, 'unsure'];
  const storageKey = 'pre-project-draft-v1';
  const planner = $('#planner');
  const form = $('#project-form');
  const prepareInquiry = window.PRE_INQUIRIES.connect({
    type: 'homeowner',
    review: $('[data-step="3"]', form),
    details: draftData,
    honeypot: form.elements.website,
  });
  let lastFocus = null;
  let currentStep = 1;
  let selectedService = '';
  let toastTimer;

  function toast(message) {
    const activeDialog = $('dialog[open]');
    if (activeDialog) {
      let feedback = $('.dialog-feedback', activeDialog);
      if (!feedback) {
        feedback = document.createElement('p');
        feedback.className = 'dialog-feedback';
        feedback.setAttribute('role', 'status');
        const parent = activeDialog === planner ? $('[data-step="3"]', planner) : activeDialog;
        parent.append(feedback);
      }
      feedback.textContent = message;
      return;
    }
    const element = $('#toast');
    clearTimeout(toastTimer);
    element.textContent = message;
    element.classList.add('visible');
    toastTimer = setTimeout(() => element.classList.remove('visible'), 4500);
  }

  function renderServices() {
    const grid = $('#service-grid');
    if (!grid) return;
    grid.replaceChildren();
    residentialServices.forEach((id, index) => {
      const service = services[id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'service-card';
      card.dataset.service = id;
      card.setAttribute('aria-label', `Explore ${service.label.toLowerCase()}`);
      card.innerHTML = `<span class="service-card__top"><svg class="service-card__icon" aria-hidden="true"><use href="#i-${service.icon}"/></svg><span class="service-card__number">0${index + 1}</span></span><h3>${service.title}</h3><p>${service.short}</p><span class="service-card__link">View service details ${icon('arrow')}</span>`;
      grid.append(card);
    });
  }

  function openDialog(dialog) {
    lastFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }

  function closeDialog(dialog, restore = true) {
    dialog.close();
    if (!$$('dialog[open]').length) document.body.classList.remove('modal-open');
    if (restore && lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }

  function showService(id) {
    const service = services[id];
    $('#service-dialog-title').textContent = service.title;
    $('#service-dialog-copy').textContent = service.copy;
    $('#service-dialog-icon use').setAttribute('href', `#i-${service.icon}`);
    $('#service-dialog-list').replaceChildren(...service.details.map(detail => {
      const li = document.createElement('li'); li.textContent = detail; return li;
    }));
    $('#plan-this-service').dataset.project = id;
    openDialog($('#service-dialog'));
  }

  function renderProjectPhotos() {
    const photos = Array.isArray(config.projectPhotos) ? config.projectPhotos : [];
    const gallery = $('#project-gallery');
    if (!gallery) return;
    gallery.replaceChildren();
    photos.filter(photo => photo && photo.src && photo.alt).forEach(photo => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = photo.src; image.alt = photo.alt; image.loading = 'lazy';
      const caption = document.createElement('figcaption');
      const title = document.createElement('strong'); title.textContent = photo.title || 'Residential project';
      const description = document.createElement('p'); description.textContent = photo.description || '';
      caption.append(title, description); figure.append(image, caption); gallery.append(figure);
    });
    const hasPhotos = Boolean(gallery.children.length);
    $('#work').hidden = !hasPhotos;
    $$('.work-nav-link').forEach(link => { link.hidden = !hasPhotos; });
  }

  function renderProjectOptions() {
    const options = $('#project-options');
    plannerServices.forEach(id => {
      const label = document.createElement('label');
      label.className = 'project-option';
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'service'; input.value = id;
      const glyph = document.createElement('span'); glyph.innerHTML = icon(services[id].icon);
      const text = document.createElement('span'); text.textContent = services[id].label;
      label.append(input, glyph, text); options.append(label);
    });
  }

  function selectService(id) {
    if (!plannerServices.includes(id)) return;
    selectedService = id;
    const input = form.elements.service;
    input.value = id;
    $('#service-error').textContent = '';

  }

  function draftData() {
    return {
      service: selectedService,
      name: form.elements.name.value.trim(),
      town: form.elements.town.value.trim(),
      email: form.elements.email.value.trim(),
      description: form.elements.description.value.trim(),
      timing: form.elements.timing.value
    };
  }

  function saveDraft() {
    try { sessionStorage.setItem(storageKey, JSON.stringify(draftData())); } catch (_) { /* Planner still works when browser storage is unavailable. */ }
  }

  function restoreDraft() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (!saved || typeof saved !== 'object') return;
      for (const name of ['name', 'town', 'email', 'description', 'timing']) {
        if (typeof saved[name] === 'string') form.elements[name].value = saved[name].slice(0, name === 'description' ? 2500 : 160);
      }
      selectService(saved.service === 'realtor' ? 'repairs' : saved.service);
    } catch (_) { /* Ignore invalid or unavailable stored drafts. */ }
  }

  function showStep(step, moveFocus = true) {
    currentStep = step;
    $$('[data-step]', form).forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
    const headings = ['Choose a service.', 'Project details.', 'Review your notes.'];
    const labels = ['STEP 01 / SERVICE', 'STEP 02 / DETAILS', 'STEP 03 / REVIEW'];
    $('#planner-title').innerHTML = headings[step - 1];
    $('#planner-step-label').textContent = labels[step - 1];
    $$('.planner-progress span').forEach((bar, index) => bar.classList.toggle('active', index < step));
    planner.scrollTop = 0;
    if (moveFocus) {
      const target = step === 1 ? $('input[name="service"]:checked', form) || $('input[name="service"]', form) : step === 2 ? form.elements.name : $('#project-summary');
      target.focus({ preventScroll: true });
    }
  }

  function openPlanner(service) {
    if (service) selectService(service);
    $$('.dialog-feedback', planner).forEach(feedback => feedback.remove());
    if ($('#service-dialog').open) closeDialog($('#service-dialog'), false);
    setMenu(false);
    showStep(1, false);
    $('#service-error').textContent = '';
    $('#details-error').textContent = '';
    openDialog(planner);
    showStep(1);
  }

  function validateDetails() {
    const required = ['name', 'town', 'email', 'description'];
    let firstInvalid;
    required.forEach(name => {
      const input = form.elements[name];
      const valid = Boolean(input.value.trim()) && input.checkValidity();
      input.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = input;
    });
    if (firstInvalid) {
      $('#details-error').textContent = firstInvalid.name === 'email' ? 'Please enter a valid email address.' : 'Please fill in your name, town, email, and a short project description.';
      firstInvalid.focus(); return false;
    }
    $('#details-error').textContent = ''; return true;
  }

  function briefText() {
    const d = draftData();
    return `POWER RANGER ELECTRIC — PROJECT BRIEF\n\nService: ${services[d.service]?.label || 'Not specified'}\nName: ${d.name}\nTown: ${d.town}\nEmail: ${d.email}\nTiming: ${d.timing}\n\nProject details:\n${d.description}\n\nPrepared with the Power Ranger Electric project planner.`;
  }

  function renderSummary() {
    const d = draftData();
    const rows = [['Service', services[d.service]?.label || 'Not specified'], ['Name', d.name], ['Town', d.town], ['Email', d.email], ['Timing', d.timing], ['Project', d.description]];
    const dl = document.createElement('dl');
    rows.forEach(([label, value]) => {
      const row = document.createElement('div');
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = value;
      row.append(dt, dd); dl.append(row);
    });
    $('#project-summary').replaceChildren(dl);
  }

  function setMenu(open) {
    const menu = $('#mobile-menu');
    const toggle = $('.menu-toggle');
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  }

  $('#service-grid')?.addEventListener('click', event => {
    const card = event.target.closest('[data-service]'); if (card) showService(card.dataset.service);
  });
  $$('[data-plan]').forEach(button => button.addEventListener('click', () => openPlanner(button.dataset.plan)));
  $('#plan-this-service').addEventListener('click', event => openPlanner(event.currentTarget.dataset.project));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => closeDialog(document.getElementById(button.dataset.close))));
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('cancel', () => {
      if (dialog === planner) saveDraft();
      document.body.classList.remove('modal-open');
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDialog(dialog);
    });
  });
  form.addEventListener('change', event => {
    if (event.target.name === 'service') selectService(event.target.value);
    saveDraft();
  });
  form.addEventListener('input', event => {
    if (event.target.hasAttribute('aria-invalid')) event.target.removeAttribute('aria-invalid');
    saveDraft();
  });
  form.addEventListener('submit', event => { event.preventDefault(); if (currentStep === 2) $('#review-project').click(); });
  $('#step-one-next').addEventListener('click', () => {
    if (!selectedService) {
      $('#service-error').textContent = 'Choose a service, or select “Not sure yet.”';
      $('input[name="service"]', form).focus(); return;
    }
    saveDraft(); showStep(2);
  });
  $('#review-project').addEventListener('click', () => {
    if (!validateDetails()) return;
    saveDraft(); renderSummary(); showStep(3);
    prepareInquiry();
  });
  $$('[data-back]').forEach(button => button.addEventListener('click', () => showStep(Number(button.dataset.back))));
  $('#download-brief').addEventListener('click', () => {
    const blob = new Blob([briefText()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'power-ranger-electric-project-brief.txt';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Your project brief has been downloaded.');
  });
  $('#copy-brief').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(briefText()); toast('Project brief copied.'); }
    catch (_) {
      const input = document.createElement('textarea'); input.value = briefText(); input.style.position = 'absolute'; input.style.opacity = '0';
      planner.append(input); input.select();
      try { if (!document.execCommand('copy')) throw Error('Copy unavailable'); toast('Project brief copied.'); }
      catch (_) { toast('Copy is unavailable in this browser. Download the brief instead.'); }
      input.remove(); $('#copy-brief').focus();
    }
  });
  $('.menu-toggle').addEventListener('click', () => setMenu($('#mobile-menu').hidden));
  $$('#mobile-menu a').forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setMenu(false); });
  window.matchMedia('(min-width: 701px)').addEventListener('change', event => { if (event.matches) setMenu(false); });
  $('#privacy-button').addEventListener('click', () => openDialog($('#privacy-dialog')));
  $('#clear-draft').addEventListener('click', () => {
    try { sessionStorage.removeItem(storageKey); sessionStorage.removeItem('pre-realtor-inquiry-v1'); } catch (_) { /* Nothing to remove. */ }
    form.reset(); selectedService = '';
    form.elements.description.placeholder = 'Tell us a little about your space and what you have in mind.';
    $$('[aria-invalid]', form).forEach(input => input.removeAttribute('aria-invalid'));
    $('#service-error').textContent = ''; $('#details-error').textContent = '';
    toast('Your inquiry drafts have been cleared.');
  });
  $$('.faq-list details').forEach(details => details.addEventListener('toggle', () => {
    if (details.open) $$('.faq-list details').forEach(other => { if (other !== details) other.open = false; });
  }));

  if (!config.previewMode) {
    ['preview-banner', 'preview-note'].forEach(id => { document.getElementById(id).hidden = true; });
  }
  const licenseNumber = String(config.electricalLicenseNumber || '').trim();
  $$('[data-license-number]').forEach(element => { element.textContent = licenseNumber; });
  $$('[data-license-number-row]').forEach(element => { element.hidden = !licenseNumber; });
  $$('[data-license-preview-note]').forEach(element => { element.hidden = Boolean(licenseNumber) || !config.previewMode; });
  if (licenseNumber) {
    $('#electrical-license-line').textContent = `NJ Electrical Contractor License #${licenseNumber}`;
    $('#electrical-license-line').hidden = false;
  }
  const aboutPermit = $('#about-permit-row');
  if (aboutPermit && config.businessPermitNumber) {
    $('#about-permit-value').textContent = config.businessPermitNumber;
    aboutPermit.hidden = false;
  }
  if (config.businessPermitNumber) {
    $('#permit-line').textContent = `NJ Business Permit #${config.businessPermitNumber}`;
    $('#permit-line').hidden = false;
  }
  const contact = $('#direct-contact');
  const contactEmail = ($('#listing-form') && config.realtorEmail) || config.email;
  if (contactEmail) {
    const link = document.createElement('a'); link.href = `mailto:${contactEmail}`; link.textContent = contactEmail; contact.append(link);
  }
  if (config.phone) {
    const link = document.createElement('a'); link.href = `tel:${config.phone.replace(/[^\d+]/g, '')}`; link.textContent = config.phone; contact.append(link);
  }
  contact.hidden = !contact.children.length;
  $('#year').textContent = new Date().getFullYear();
  renderServices(); renderProjectOptions(); restoreDraft(); renderProjectPhotos();
})();
