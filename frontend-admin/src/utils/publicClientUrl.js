/** Client app base for public links (registration, driver portal). Baked in at build time. */
const PRODUCTION_CLIENT = 'https://tracknow-client.netlify.app';

export function getClientAppBase() {
  const fromEnv = import.meta.env.VITE_CLIENT_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (import.meta.env.PROD) return PRODUCTION_CLIENT;
  return 'http://localhost:5173';
}

/** Replace localhost API links with the configured client app URL. */
export function fixLocalhostClientLink(url) {
  if (!url) return url;
  const base = getClientAppBase();
  try {
    const u = new URL(url);
    if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
      return `${base}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    return url;
  }
  return url;
}

export function buildRegisterUrl(token) {
  return `${getClientAppBase()}/register/${token}`;
}

export function buildDriverRentalUrl(token) {
  return `${getClientAppBase()}/driver/rental/${token}`;
}

export function normalizeInvitePayload(data) {
  if (!data?.hasLink) return data;
  const registerUrl = data.token
    ? buildRegisterUrl(data.token)
    : fixLocalhostClientLink(data.registerUrl);
  return { ...data, registerUrl };
}

export function normalizeVehicleRentalSession(session) {
  if (!session) return session;
  const driverUrl = session.token
    ? buildDriverRentalUrl(session.token)
    : fixLocalhostClientLink(session.driverUrl);
  return { ...session, driverUrl };
}
