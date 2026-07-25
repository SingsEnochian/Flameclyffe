'use strict';

const { AtomicChatError } = require('./atomic-chat');

const MAX_MESSAGES = 64;
const MAX_MESSAGE_CHARS = 100000;

function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new AtomicChatError('messages must be a non-empty array.', {
      code: 'ATOMIC_CHAT_MESSAGES_REQUIRED',
    });
  }
  if (messages.length > MAX_MESSAGES) {
    throw new AtomicChatError(`messages may contain at most ${MAX_MESSAGES} entries.`, {
      code: 'ATOMIC_CHAT_MESSAGE_LIMIT',
    });
  }
  return messages.map((message, index) => {
    const role = String(message?.role || '').trim();
    const content = typeof message?.content === 'string' ? message.content : '';
    if (!role || !content) {
      throw new AtomicChatError(`message ${index} requires role and text content.`, {
        code: 'ATOMIC_CHAT_INVALID_MESSAGE',
      });
    }
    if (content.length > MAX_MESSAGE_CHARS) {
      throw new AtomicChatError(`message ${index} exceeds ${MAX_MESSAGE_CHARS} characters.`, {
        code: 'ATOMIC_CHAT_MESSAGE_TOO_LARGE',
      });
    }
    return { role, content };
  });
}

module.exports = {
  MAX_MESSAGES,
  MAX_MESSAGE_CHARS,
  sanitizeMessages,
};
