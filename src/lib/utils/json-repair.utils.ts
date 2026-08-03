export function repairJson(raw: string): string {
  let text = raw;

  // Decode HTML entities.
  text = text.replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(parseInt(code, 10)));
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');

  // Extract the outermost { … } span.
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace <= firstBrace) return text;
  text = text.slice(firstBrace, lastBrace + 1);

  // Process line-by-line: strip garbage, fix missing colons, drop junk lines.
  const lines = text.split('\n');
  const cleaned: string[] = [];

  for (const line of lines) {
    let l = stripGarbageTokens(line);

    // Fix missing `:` — a key string followed directly by a value string.
    l = l.replace(/("(?:[^"\\]|\\.)*")\s+(")/g, '$1: $2');

    // Fix missing `:` — key followed by `[` or `{` with no colon.
    l = l.replace(/("(?:[^"\\]|\\.)*")\s+([[{])/g, '$1: $2');

    if (/^\s*,?\s*$/.test(l)) continue;

    cleaned.push(l);
  }

  let result = cleaned.join('\n');

  // Remove trailing commas before ] or } (common after garbage lines are dropped).
  result = result.replace(/,(\s*[}\]])/g, '$1');

  return result;
}

function stripGarbageTokens(line: string): string {
  const parts: string[] = [];
  let i = 0;

  while (i < line.length) {
    const ch = line[i];
    if (ch === undefined) break;

    if (ch === '"') {
      let str = '"';
      i++;
      while (i < line.length) {
        const c = line[i];
        if (c === undefined) break;
        if (c === '\\' && i + 1 < line.length) {
          const next = line[i + 1] ?? '';
          str += c + next;
          i += 2;
          continue;
        }
        str += c;
        i++;
        if (c === '"') break;
      }
      parts.push(str);
      continue;
    }

    if ('{}[]:,'.includes(ch)) {
      parts.push(ch);
      i++;
      continue;
    }

    if (/\s/.test(ch)) {
      parts.push(ch);
      i++;
      continue;
    }

    const rest = line.slice(i);

    const litMatch = /^(?:true|false|null)(?=[,\]\}\s]|$)/.exec(rest);
    if (litMatch) {
      parts.push(litMatch[0]);
      i += litMatch[0].length;
      continue;
    }

    const numMatch = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?(?=[,\]\}\s]|$)/.exec(rest);
    if (numMatch) {
      parts.push(numMatch[0]);
      i += numMatch[0].length;
      continue;
    }

    i++;
  }

  return parts.join('');
}
