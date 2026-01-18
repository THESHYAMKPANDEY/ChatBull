// Jest setup file
global.self = global;
global.window = global;
global.XMLHttpRequest = require('event-target-shim').EventTarget; // Polyfill if needed
