const serverless = require('serverless-http');
const { app, initApp } = require('../../app');

let handler;

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  await initApp();
  if (!handler) {
    handler = serverless(app);
  }
  return handler(event, context);
};
