const test = require('node:test');
const assert = require('node:assert/strict');
const { parseJsDoc, InvalidFormatError } = require('../parse-jsdoc.js');

test('rejects text missing /** prefix', () => {
  assert.throws(
    () => parseJsDoc('not a jsdoc'),
    (err) => err instanceof InvalidFormatError
  );
});

test('rejects text missing */ suffix', () => {
  assert.throws(
    () => parseJsDoc('/**\n * body\n'),
    (err) => err instanceof InvalidFormatError
  );
});

test('accepts minimal valid JSDoc with empty body', () => {
  const result = parseJsDoc('/**\n */');
  assert.deepEqual(result, {
    description: [],
    params: [],
    returns: null,
    links: []
  });
});