/**
 * Base URL for public client-app links (registration, driver rental).
 * Prefer FRONTEND_CLIENT_URL; otherwise infer from CORS_ORIGIN (e.g. tracknow-client.netlify.app).
 */
function parseCorsOrigins() {
  return (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

function pickClientOriginFromCors(origins) {
  if (!origins.length) return null;

  const explicitClient = origins.find((o) => /client/i.test(o));
  if (explicitClient) return explicitClient;

  const notAdmin = origins.find(
    (o) => !/admin/i.test(o) && !/:5174$/.test(o) && !/:5174\//.test(o)
  );
  return notAdmin || null;
}

// Client app stays on Netlify when API is on Vercel — set FRONTEND_CLIENT_URL in Vercel env
const PRODUCTION_CLIENT_DEFAULT = 'https://tracknow-client.netlify.app';

function isProductionRuntime() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NETLIFY === 'true' ||
    process.env.VERCEL === '1' ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
  );
}

function getClientPortalBase() {
  const explicit = process.env.FRONTEND_CLIENT_URL || process.env.CLIENT_PORTAL_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  const fromCors = pickClientOriginFromCors(parseCorsOrigins());
  if (fromCors) return fromCors;

  if (isProductionRuntime()) return PRODUCTION_CLIENT_DEFAULT;

  return 'http://localhost:5173';
}

module.exports = { getClientPortalBase };
