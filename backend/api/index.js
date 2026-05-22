/** Vercel serverless entry — Express handles requests; DB init runs in app middleware */
module.exports = require('../app').app;
