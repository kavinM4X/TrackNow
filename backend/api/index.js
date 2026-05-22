const serverless = require('serverless-http');
const { app, initApp } = require('../app');

let handler;

module.exports = async (req, res) => {
  await initApp();
  if (!handler) {
    handler = serverless(app);
  }
  return handler(req, res);
};
