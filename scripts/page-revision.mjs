import { createHash } from 'node:crypto';

// Hash the shipped HTML, excluding the marker itself, so stamping is stable.
// This also catches HTML-only releases, which do not change the asset token.
export function stampPageRevision(html) {
  const source = html.replace(/\s*<meta\s+name="ain-page-revision"\s+content="[^"]*"\s*\/?\s*>/g, '');
  const revision = createHash('sha256').update(source).digest('hex').slice(0, 16);
  return source.replace('</head>', `<meta name="ain-page-revision" content="${revision}"></head>`);
}
