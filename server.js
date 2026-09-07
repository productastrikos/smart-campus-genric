/**
 * Alias for app.js, kept so a host (or a person) that was pointed at
 * "server.js" as the startup file still works. CommonJS on purpose —
 * shared-hosting Node runtimes load the entry with require(), which cannot
 * load an ES module. See app.js for the implementation and the reasoning.
 */
'use strict';
module.exports = require('./app.js');
