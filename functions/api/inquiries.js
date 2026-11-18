const serviceNames = {
  lighting: 'Lighting & outlets',
  panels: 'Circuits & panel upgrades',
  ev: 'Home EV chargers',
  repairs: 'Troubleshooting & repairs',
  unsure: 'Not sure yet',
};
const timingOptions = [
  'Just exploring', 'Within the next month', 'In the next few months', 'I have a specific date in mind',
];
const futureListings = 'Future listings / ongoing relationship';
const saleStages = ['Before listing', 'Inspection repairs', 'Preparing for closing', futureListings];
const datePurposes = ['Not specified', 'Listing / photographs', 'Inspection response', 'Closing', 'Other target'];
const addressPattern = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxBodyBytes = 32 * 1024;

function json(value, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

function mailEnabled(env) {
  return Boolean(env.RESEND_API_KEY) && Boolean(env.TURNSTILE_SITE_KEY) === Boolean(env.TURNSTILE_SECRET_KEY);
}

export function onRequestGet({ env }) {
  const enabled = mailEnabled(env);
  return json({ enabled, siteKey: enabled ? env.TURNSTILE_SITE_KEY || '' : '' });
}

async function readBody(request) {
  if (!request.body || Number(request.headers.get('Content-Length')) > maxBodyBytes) {
    throw new RangeError('Invalid body size');
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(body + decoder.decode());
      size += value.byteLength;
      if (size > maxBodyBytes) throw new RangeError('Body too large');
      body += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function readFields(details, limits, required) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const fields = {};
  for (const [name, limit] of Object.entries(limits)) {
    const value = details[name] ?? '';
    if (typeof value !== 'string' || value.length > limit) return null;
    fields[name] = value.trim();
    if (required.includes(name) && !fields[name]) return null;
  }
  return fields;
}

function homeownerEmail(details) {
  const project = readFields(details, { service: 20, name: 100, town: 100, email: 160, description: 2500, timing: 40 },
    ['service', 'name', 'town', 'email', 'description', 'timing']);
  if (!project || !Object.hasOwn(serviceNames, project.service)
    || !timingOptions.includes(project.timing) || !addressPattern.test(project.email)) return null;
  return {
    to: ['inquiries@prelectricnj.com'],
    subject: 'Website inquiry | Homeowner',
    reply_to: project.email,
    text: [
      'Homeowner inquiry from the Power Ranger Electric website',
      '',
      `Service: ${serviceNames[project.service]}`,
      `Name: ${project.name}`,
      `Town: ${project.town}`,
      `Email: ${project.email}`,
      `Timing: ${project.timing}`,
      '',
      'Project details',
      project.description,
    ].join('\n'),
  };
}

function realtorEmail(details) {
  const listing = readFields(details, {
    agentName: 100, brokerage: 160, agentEmail: 160, agentPhone: 50, propertyAddress: 200,
    propertyTown: 100, saleStage: 60, repairList: 2500, targetDate: 10, datePurpose: 30, accessNotes: 1200,
  }, ['agentName', 'agentEmail', 'saleStage', 'repairList', 'datePurpose']);
  if (!listing || !addressPattern.test(listing.agentEmail) || !saleStages.includes(listing.saleStage)
    || !datePurposes.includes(listing.datePurpose)) return null;
  if (listing.saleStage !== futureListings && (!listing.propertyAddress || !listing.propertyTown)) return null;
  if (listing.targetDate && !/^\d{4}-\d{2}-\d{2}$/.test(listing.targetDate)) return null;
  return {
    to: ['realtor@prelectricnj.com'],
    subject: 'Website inquiry | Realtor',
    reply_to: listing.agentEmail,
    text: [
      'Realtor inquiry from the Power Ranger Electric website',
      '',
      `Agent: ${listing.agentName}`,
      `Brokerage: ${listing.brokerage || 'Not provided'}`,
      `Email: ${listing.agentEmail}`,
      `Phone: ${listing.agentPhone || 'Not provided'}`,
      `Property: ${listing.propertyAddress || 'Future listings'}`,
      `Town: ${listing.propertyTown || 'To discuss'}`,
      `Sale stage: ${listing.saleStage}`,
      `Target date: ${listing.targetDate || 'To discuss'}`,
      `Date for: ${listing.datePurpose}`,
      '',
      'Repair list',
      listing.repairList,
      '',
      'Access & coordination',
      listing.accessNotes || 'To discuss',
    ].join('\n'),
  };
}

async function verifyTurnstile({ token, type, hostname, secret }) {
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error('Verification service unavailable');
  const result = await response.json();
  return result.success === true && result.action === type && result.hostname === hostname;
}

export async function onRequestPost({ request, env }) {
  const { hostname, origin } = new URL(request.url);
  if (request.headers.get('Origin') !== origin) return json({ error: 'not_allowed' }, 403);
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') return json({ error: 'invalid' }, 415);
  if (!mailEnabled(env)) return json({ error: 'unavailable' }, 503);

  let input;
  try {
    input = await readBody(request);
  } catch (error) {
    return json({ error: 'invalid' }, error instanceof RangeError ? 413 : 400);
  }
  if (!input || !['homeowner', 'realtor'].includes(input.type) || input.website !== ''
    || typeof input.requestId !== 'string' || !requestIdPattern.test(input.requestId)) {
    return json({ error: 'invalid' }, 400);
  }
  const email = input.type === 'homeowner' ? homeownerEmail(input.details) : realtorEmail(input.details);
  if (!email) return json({ error: 'invalid' }, 400);

  try {
    if (env.TURNSTILE_SECRET_KEY && !await verifyTurnstile({
      token: input.token, type: input.type, hostname, secret: env.TURNSTILE_SECRET_KEY,
    })) return json({ error: 'verification' }, 403);

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `pre-website/${input.type}/${input.requestId}`,
      },
      body: JSON.stringify({ from: 'Power Ranger Electric Website <website@send.prelectricnj.com>', ...email }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.warn('Inquiry email rejected by Resend', response.status);
      return json({ error: 'delivery' }, 502);
    }
    const result = await response.json();
    if (typeof result?.id === 'string' && result.id) return json({ sent: true });
  } catch {
    console.warn('Inquiry delivery service unavailable');
  }
  return json({ error: 'delivery' }, 502);
}
