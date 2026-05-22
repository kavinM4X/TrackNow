const { app, initApp } = require('../app');

let initDone = false;
let initError = null;

async function ensureInit() {
  if (initDone) return;
  if (initError) throw initError;
  try {
    await initApp();
    initDone = true;
  } catch (err) {
    initError = err;
    throw err;
  }
}

/** Vercel Node runtime — use Express directly (not serverless-http / Lambda events). */
module.exports = async (req, res) => {
  try {
    await ensureInit();
    app(req, res);
  } catch (err) {
    console.error('Vercel API init error:', err);
    if (res.headersSent) return;
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Server initialization failed',
        message: err.message,
        hint: !process.env.MONGODB_URI
          ? 'Add MONGODB_URI in Vercel → Project → Settings → Environment Variables'
          : 'Check MongoDB Atlas Network Access (allow 0.0.0.0/0) and JWT_SECRET'
      })
    );
  }
};
