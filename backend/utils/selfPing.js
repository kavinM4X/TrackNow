const https = require('https');
const http = require('http');

/**
 * Self-Healing Keep-Alive Ping Utility for Render Free Tier.
 * Render automatically injects RENDER_EXTERNAL_URL into environment variables.
 * Pings the public URL every 9 minutes to reset Render's 15-minute inactivity timer.
 */
function startSelfPing() {
  // Render automatically sets RENDER_EXTERNAL_URL or PUBLIC_API_URL
  const externalUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_API_URL || 'https://tracknow-backend-api.onrender.com';

  const PING_INTERVAL_MS = 9 * 60 * 1000; // 9 minutes
  const healthUrl = `${externalUrl.replace(/\/$/, '')}/api/health`;

  console.log(`[SELF-PING] Activated. Pinging ${healthUrl} every 9 minutes.`);

  setInterval(() => {
    const client = healthUrl.startsWith('https') ? https : http;

    client.get(healthUrl, (res) => {
      if (res.statusCode === 200) {
        console.log(`[SELF-PING] Success: Render 15m sleep timer reset (${new Date().toLocaleTimeString('en-IN')})`);
      } else {
        console.log(`[SELF-PING] Warning: Received status ${res.statusCode}`);
      }
    }).on('error', (err) => {
      console.error(`[SELF-PING] Error: ${err.message}`);
    });
  }, PING_INTERVAL_MS);
}

module.exports = { startSelfPing };
