import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorReconstructionSystemPrompt,
  normaliseOpenAIBase,
  snippetFor,
} from '../../../netlify/functions/_shared/source-library-runtime.mjs';

test('Source Library normalises Hugging Face OpenAI-compatible bases', () => {
  assert.equal(normaliseOpenAIBase('https://router.huggingface.co/v1'), 'https://router.huggingface.co');
  assert.equal(normaliseOpenAIBase('https://router.huggingface.co/'), 'https://router.huggingface.co');
});

test('Source Library snippets centre a matching term without returning an entire large source', () => {
  const text = `${'before '.repeat(120)}sigillum ${'after '.repeat(120)}`;
  const snippet = snippetFor(text, 'sigillum', 80);
  assert.match(snippet, /sigillum/);
  assert.ok(snippet.length < text.length);
});

test('Ox Alpha Author Lens prompt permits first-person reconstruction while preserving evidence boundaries', () => {
  const prompt = authorReconstructionSystemPrompt({ title: 'Example Book', authorName: 'Example Author' });
  assert.match(prompt, /Ox Alpha/);
  assert.match(prompt, /first person/);
  assert.match(prompt, /labelled simulation/);
  assert.match(prompt, /Do not invent biography/);
  assert.match(prompt, /\[S1\]/);
  assert.match(prompt, /Example Author/);
});
