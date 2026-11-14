(() => {
  'use strict';
  const form = document.querySelector('#listing-form');
  if (!form) return;
  const draftKey = 'pre-realtor-inquiry-v1';
  const review = document.querySelector('#listing-review');
  const feedback = document.querySelector('#listing-feedback');
  const error = document.querySelector('#listing-errors');
  const fields = ['agentName', 'brokerage', 'agentEmail', 'agentPhone', 'propertyAddress', 'propertyTown', 'saleStage', 'repairList', 'targetDate', 'datePurpose', 'accessNotes'];
  const ongoing = () => form.elements.saleStage.value === 'Future listings / ongoing relationship';
  const values = () => Object.fromEntries(fields.map(key => [key, form.elements[key].value.trim()]));
  const prepareInquiry = window.PRE_INQUIRIES.connect({
    type: 'realtor',
    review,
    details: values,
    honeypot: form.elements.website,
  });
  function message(text) { feedback.textContent = text; }
  function updatePropertyRequirement() {
    for (const key of ['propertyAddress', 'propertyTown']) {
      form.elements[key].required = !ongoing();
      if (ongoing()) form.elements[key].removeAttribute('aria-invalid');
    }
  }
  function saveDraft() {
    try { sessionStorage.setItem(draftKey, JSON.stringify(values())); } catch (_) { /* Draft storage is optional. */ }
  }
  function rows() {
    const d = values();
    return [
      ['Inquiry type', 'Realtor / residential property'], ['Agent', d.agentName], ['Brokerage', d.brokerage || 'Not provided'],
      ['Email', d.agentEmail], ['Phone', d.agentPhone || 'Not provided'], ['Property', d.propertyAddress || 'Future listings'],
      ['Town', d.propertyTown || 'To discuss'], ['Sale stage', d.saleStage], ['Repair list', d.repairList],
      ['Target date', d.targetDate || 'To discuss'], ['Date for', d.datePurpose], ['Access & coordination', d.accessNotes || 'To discuss']
    ];
  }
  function briefText() {
    return 'POWER RANGER ELECTRIC — REALTOR INQUIRY\n\n' + rows().map(([key, value]) => `${key}: ${value}`).join('\n\n') + '\n\nPrepared with the dedicated realtor inquiry. Saving or copying this brief does not send it or confirm an appointment.';
  }
  function renderReview() {
    const list = document.createElement('dl');
    rows().forEach(([key, value]) => {
      const row = document.createElement('div');
      const label = document.createElement('dt'); label.textContent = key;
      const detail = document.createElement('dd'); detail.textContent = value;
      row.append(label, detail); list.append(row);
    });
    document.querySelector('#listing-summary').replaceChildren(list);
    form.hidden = true; review.hidden = false; review.focus();
    prepareInquiry();
  }
  function showForm() { review.hidden = true; form.hidden = false; }
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey) || 'null');
    if (draft && typeof draft === 'object') fields.forEach(key => {
      if (typeof draft[key] === 'string') form.elements[key].value = draft[key].slice(0, form.elements[key].maxLength > 0 ? form.elements[key].maxLength : 2500);
    });
  } catch (_) { /* Ignore unavailable storage and malformed drafts. */ }
  updatePropertyRequirement();
  form.addEventListener('input', event => { event.target.removeAttribute('aria-invalid'); saveDraft(); });
  form.addEventListener('change', () => { updatePropertyRequirement(); saveDraft(); });
  form.addEventListener('submit', event => {
    event.preventDefault(); updatePropertyRequirement();
    let firstInvalid;
    for (const field of fields.map(name => form.elements[name])) {
      const valid = (!field.required || Boolean(field.value.trim())) && field.checkValidity();
      field.setAttribute('aria-invalid', String(!valid));
      if (!valid && !firstInvalid) firstInvalid = field;
    }
    if (firstInvalid) { error.textContent = 'Please check the highlighted fields. Include your name, valid email, repair details, and the property address and town when discussing a specific home.'; firstInvalid.focus(); return; }
    error.textContent = ''; message(''); saveDraft(); renderReview();
  });
  document.querySelector('#listing-edit').addEventListener('click', () => { showForm(); message(''); form.elements.agentName.focus(); });
  function clearDraft() {
    try { sessionStorage.removeItem(draftKey); } catch (_) { /* Nothing to clear. */ }
    form.reset(); updatePropertyRequirement(); showForm(); error.textContent = '';
    form.querySelectorAll('[aria-invalid]').forEach(field => field.removeAttribute('aria-invalid'));
    document.querySelector('#listing-summary').replaceChildren();
    message('Your realtor inquiry draft has been cleared.');
  }
  document.querySelector('#listing-clear').addEventListener('click', clearDraft);
  document.querySelector('#clear-draft').addEventListener('click', clearDraft);
  document.querySelector('#listing-download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([briefText()], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'power-ranger-electric-realtor-inquiry.txt';
    document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Realtor inquiry downloaded.');
  });
  document.querySelector('#listing-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(briefText()); message('Realtor inquiry copied.'); }
    catch (_) { message('Copy is unavailable in this browser. Download your inquiry instead.'); }
  });
})();
