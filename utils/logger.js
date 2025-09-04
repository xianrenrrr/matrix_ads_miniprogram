// Lightweight logger gated by config.dev.showLog
const config = require('./config');

function log(...args) {
  if (config.dev && config.dev.showLog) {
    console.log(...args);
  }
}

function warn(...args) {
  if (config.dev && config.dev.showLog) {
    console.warn(...args);
  }
}

function error(...args) {
  // Always print errors, but gate verbose objects
  if (config.dev && config.dev.showLog) {
    console.error(...args);
  } else if (args && args.length > 0) {
    console.error('[ERR]', args[0]);
  }
}

module.exports = { log, warn, error };

