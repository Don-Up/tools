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

test('captures description lines between /** and first tag', () => {
  const input = `/**
 * 导出代码弹窗:展示 generateJsx(snapshot) 输出,提供复制按钮。
 * 打开时一次性锁快照,关闭后再开会刷新。
 */`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, [
    '导出代码弹窗:展示 generateJsx(snapshot) 输出,提供复制按钮。',
    '打开时一次性锁快照,关闭后再开会刷新。'
  ]);
  assert.equal(result.params.length, 0);
});

test('strips leading * and " *" prefixes from each line', () => {
  const input = '/**\n* line A\n * line B\n*line C\n*/';
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, ['line A', 'line B', 'line C']);
});

test('preserves empty lines as empty-string entries for paragraph breaks', () => {
  const input = `/**
 * paragraph one
 *
 * paragraph two
 */`;
  const result = parseJsDoc(input);
  assert.deepEqual(result.description, ['paragraph one', '', 'paragraph two']);
});