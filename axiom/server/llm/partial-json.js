// Tolerant JSON prefix parser.
//
// Structured generations arrive as a stream of text deltas that only become
// valid JSON on the final chunk. To render a lesson while it is still being
// written we need the best-effort value of an *incomplete* document, including
// the half-written string the model is in the middle of emitting.

const OBJ = 1;
const ARR = 2;
const CONTROL_CHARS = /[\u0000-\u001f]/g;

/** Parse a (possibly truncated) JSON document. Returns undefined if hopeless. */
export function parsePartialJson(src) {
  if (typeof src !== 'string') return undefined;
  const text = src.trim();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    /* fall through to repair */
  }
  for (const candidate of repairCandidates(text)) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try the next, more conservative, repair */
    }
  }
  return undefined;
}

function closers(types) {
  let out = '';
  for (let i = types.length - 1; i >= 0; i--) out += types[i] === OBJ ? '}' : ']';
  return out;
}

/** Remove a trailing comma / dangling `"key":` so the prefix can be closed. */
function stripDangling(input) {
  let out = input.replace(/[\s,]+$/, '');
  if (out.endsWith(':')) {
    out = out.slice(0, -1).replace(/\s+$/, '');
    if (out.endsWith('"')) {
      let k = out.length - 2;
      while (k >= 0) {
        if (out[k] === '"') {
          let backslashes = 0;
          let m = k - 1;
          while (m >= 0 && out[m] === '\\') {
            backslashes++;
            m--;
          }
          if (backslashes % 2 === 0) break;
        }
        k--;
      }
      out = out.slice(0, Math.max(0, k)).replace(/[\s,]+$/, '');
    }
  }
  return out;
}

/** Produce repair candidates for a truncated document, most informative first. */
function repairCandidates(s) {
  const stack = [];
  const top = () => stack[stack.length - 1];
  let inString = false;
  let escaped = false;
  let stringIsKey = false;
  let cut = 0;
  let cutTypes = [];
  const markSafe = (idx) => {
    cut = idx;
    cutTypes = stack.map((f) => f.type);
  };

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        i++;
        continue;
      }
      if (c === '\\') {
        escaped = true;
        i++;
        continue;
      }
      if (c === '"') {
        inString = false;
        i++;
        const f = top();
        if (f && f.type === OBJ && f.phase === 'key') {
          f.phase = 'afterKey';
        } else {
          if (f) f.phase = 'afterValue';
          markSafe(i);
        }
        continue;
      }
      i++;
      continue;
    }

    if (c === '"') {
      const f = top();
      stringIsKey = Boolean(f && f.type === OBJ && f.phase === 'key');
      inString = true;
      escaped = false;
      i++;
      continue;
    }
    if (c === '{' || c === '[') {
      stack.push({ type: c === '{' ? OBJ : ARR, phase: c === '{' ? 'key' : 'value' });
      i++;
      markSafe(i);
      continue;
    }
    if (c === '}' || c === ']') {
      stack.pop();
      i++;
      const f = top();
      if (f) f.phase = 'afterValue';
      markSafe(i);
      continue;
    }
    if (c === ':') {
      const f = top();
      if (f) f.phase = 'value';
      i++;
      continue;
    }
    if (c === ',') {
      const f = top();
      if (f) f.phase = f.type === OBJ ? 'key' : 'value';
      i++;
      markSafe(i);
      continue;
    }
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      i++;
      continue;
    }

    // bare literal: number | true | false | null
    let j = i;
    while (j < s.length && !',}]: \n\t\r'.includes(s[j])) j++;
    if (j < s.length) {
      const f = top();
      if (f) f.phase = 'afterValue';
      markSafe(j);
    }
    i = j;
  }

  const candidates = [];

  if (inString && !stringIsKey) {
    // Keep the half-written string value — this is what makes live rendering work.
    let body = s;
    if (escaped) body = body.slice(0, -1);
    const openQuote = body.lastIndexOf('"');
    const head = body.slice(0, openQuote + 1);
    // Raw control characters are illegal inside JSON strings; escape any that
    // slipped through so the repaired document still parses.
    const tail = body
      .slice(openQuote + 1)
      .replace(CONTROL_CHARS, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
    candidates.push(head + tail + '"' + closers(stack.map((f) => f.type)));
  }

  candidates.push(stripDangling(s.slice(0, cut)) + closers(cutTypes));
  return candidates;
}

/**
 * Extract the value of a top-level string field from a partial document without
 * requiring the rest of the document to be parseable. Used to stream one field.
 */
export function partialStringField(src, field) {
  const obj = parsePartialJson(src);
  if (obj && typeof obj === 'object' && typeof obj[field] === 'string') return obj[field];
  return '';
}
