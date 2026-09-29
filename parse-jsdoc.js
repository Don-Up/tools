(function () {
  class InvalidFormatError extends Error {
    constructor(message) {
      super(message);
      this.name = 'InvalidFormatError';
    }
  }

  const PREFIX_PATTERN = /^\s*\*{1,2}\s?/;
  const PARAM_HEAD = /^@param\s+(\S+)\s*(.*)$/;
  const IDENT = /^[A-Za-z_$][\w$]*$/;

  function stripPrefix(line) {
    return line.replace(PREFIX_PATTERN, '').replace(/\s+$/, '').replace(/^\s+/, '');
  }

  function splitBody(text) {
    const inner = text.replace(/^\s*\/\*\*\s*/, '').replace(/\s*\*\/\s*$/, '');
    if (inner === '') return [];
    return inner.split('\n').map(stripPrefix);
  }

  function extractTitle(declaration) {
    if (!declaration) return null;
    const lines = declaration.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return null;
    const lastLine = lines[lines.length - 1];
    const tokens = lastLine.split(/\s+/).reverse();
    for (const t of tokens) {
      if (IDENT.test(t)) return t;
    }
    return null;
  }

  function parseJsDoc(text) {
    const trimmed = (text ?? '').trim();

    // Split JSDoc body from trailing declaration (e.g. "export function Foo")
    const closeIdx = trimmed.lastIndexOf('*/');
    let jsdocPart = trimmed;
    let declaration = '';
    if (closeIdx >= 0 && closeIdx < trimmed.length - 2) {
      jsdocPart = trimmed.slice(0, closeIdx + 2);
      declaration = trimmed.slice(closeIdx + 2).trim();
    }

    if (!jsdocPart.startsWith('/**') || !jsdocPart.endsWith('*/')) {
      throw new InvalidFormatError('Text is not a JSDoc comment');
    }
    const lines = splitBody(jsdocPart);
    const data = {
      title: extractTitle(declaration),
      description: [],
      params: [],
      returns: null,
      links: []
    };
    let section = 'desc'; // 'desc' | 'param' | 'example' | 'returns' | 'link' | 'unknown'
    let currentParam = null;

    for (const line of lines) {
      // Tag dispatch: each tag may switch section
      if (line.startsWith('@param ')) {
        const head = line.match(PARAM_HEAD);
        currentParam = { name: head[1], desc: head[2], example: null };
        data.params.push(currentParam);
        section = 'param';
        continue;
      }
      if (line === '@returns' || line.startsWith('@returns ')) {
        data.returns = line === '@returns' ? '' : line.slice('@returns '.length);
        section = 'returns';
        currentParam = null;
        continue;
      }
      if (line.startsWith('@link')) {
        section = 'link';
        currentParam = null;
        continue;
      }
      if (line.startsWith('@')) {
        const tag = line.match(/^\S+/)[0];
        console.warn(`parseJsDoc: skipping unknown tag ${tag}`);
        section = 'unknown';
        currentParam = null;
        continue;
      }

      // Body lines per active section
      if (section === 'param') {
        const stripped = line.replace(/^\s*/, '');
        if (stripped.startsWith('例如:') || stripped.startsWith('例如：')) {
          const colonIdx = stripped.indexOf(':');
          currentParam.example = stripped.slice(colonIdx + 1).replace(/^\s*/, '');
          section = 'example';
          continue;
        }
        currentParam.desc = currentParam.desc ? `${currentParam.desc}\n${line}` : line;
        continue;
      }
      if (section === 'example') {
        currentParam.example = `${currentParam.example}\n${line}`;
        continue;
      }
      if (section === 'returns') {
        data.returns = data.returns ? `${data.returns}\n${line}` : line;
        continue;
      }
      if (section === 'link') {
        const m = line.match(/^\s*(\d+)\.\s*(.+)$/);
        if (m) {
          const rest = m[2];
          const colonIdx = rest.indexOf(':');
          if (colonIdx >= 0) {
            data.links.push({
              name: rest.slice(0, colonIdx).trim(),
              desc: rest.slice(colonIdx + 1).trim()
            });
          } else {
            data.links.push({ name: rest.trim(), desc: '' });
          }
        }
        continue;
      }
      if (section === 'unknown') {
        continue; // skip body until next @
      }
      // section === 'desc' (default)
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
})();