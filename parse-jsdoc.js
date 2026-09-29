class InvalidFormatError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InvalidFormatError';
  }
}

function parseJsDoc(text) {
  const trimmed = (text ?? '').trim();
  if (!trimmed.startsWith('/**') || !trimmed.endsWith('*/')) {
    throw new InvalidFormatError('Text is not a JSDoc comment');
  }
  return {
    description: [],
    params: [],
    returns: null,
    links: []
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseJsDoc, InvalidFormatError };
}
if (typeof window !== 'undefined') {
  window.ParseJsDoc = { parseJsDoc, InvalidFormatError };
}