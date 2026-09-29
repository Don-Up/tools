class InvalidFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidFormatError';
  }
}

const PREFIX_PATTERN = /^\s*\*{1,2}\s?/;

function stripPrefix(line) {
  return line.replace(PREFIX_PATTERN, '');
}

function splitBody(text) {
  const inner = text.replace(/^\s*\/\*\*\s*/, '').replace(/\s*\*\/\s*$/, '');
  if (inner === '') return [];
  return inner.split('\n').map(stripPrefix);
}

function parseJsDoc(text) {
  const trimmed = (text ?? '').trim();
  if (!trimmed.startsWith('/**') || !trimmed.endsWith('*/')) {
    throw new InvalidFormatError('Text is not a JSDoc comment');
  }
  const lines = splitBody(trimmed);
  const data = {
    description: [],
    params: [],
    returns: null,
    links: []
  };
  for (const line of lines) {
    if (line.startsWith('@')) break;       // tag handling in later tasks
    data.description.push(line);
  }
  return data;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseJsDoc, InvalidFormatError };
}
if (typeof window !== 'undefined') {
  window.ParseJsDoc = { parseJsDoc, InvalidFormatError };
}