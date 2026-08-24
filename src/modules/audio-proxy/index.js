const AudioProxyService = require('./audio-proxy.service');
const AudioProxyController = require('./audio-proxy.controller');
const { createAudioProxyHandler } = require('./audio-proxy.routes');

module.exports = {
  AudioProxyService,
  AudioProxyController,
  createAudioProxyHandler
};
