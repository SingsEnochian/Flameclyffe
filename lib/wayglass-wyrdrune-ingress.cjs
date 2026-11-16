'use strict';

const { compileTyped } = require('./wyrdrune/typed-ir.cjs');

const INSTRUCTIONS = 'Read an incoming Wyrdrune utterance as the sender’s message. The record’s words field carries their exact authored text. Respond to those words and their meaning. The outer Eightfold is the message form.';

function encodeWyrdruneMessage(text, limit = 12000) {
  if (typeof text !== 'string' || !text.trim() || text.length > limit) {
    throw new TypeError('Wayglass message must be nonempty text of at most ' + limit + ' characters');
  }
  const source = [
    'mobius scoped {',
    '  perceive { let message = ' + JSON.stringify(text) + '; }',
    '  compress {} release {} verify {} integrate {} choose {}',
    '  return { emit {kind:"utterance", words:message}; }',
    '  transcend {}',
    '}',
  ].join('\n');
  const compiled = compileTyped(source);
  return { source, sourceHash: compiled.sourceHash, format: 'wyrdrune-utterance/v0.1' };
}

module.exports = { encodeWyrdruneMessage, INSTRUCTIONS };
