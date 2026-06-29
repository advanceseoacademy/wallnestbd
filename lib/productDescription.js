/** Sanitize admin product description HTML for safe storefront display. */
const ALLOWED_TAGS =
  /^(h1|h2|h3|p|br|strong|b|em|i|u|a|ul|ol|li|span)$/i;

function stripHtmlToPlainText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<\/h[1-6]>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeHref(href) {
  const value = String(href || '').trim();
  if (!value) return '#';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  if (value.startsWith('#')) return value;
  if (value.startsWith('mailto:')) return value;
  return '#';
}

function sanitizeProductHtml(input) {
  if (!input) return '';
  let html = String(input).trim();
  if (!html) return '';

  html = html
    .replace(/<(script|style|iframe|object|embed|form|svg)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|svg)[^>]*\/?>/gi, '')
    .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  html = html.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (match, tagName, attrs) => {
    const tag = String(tagName || '').toLowerCase();
    if (!ALLOWED_TAGS.test(tag)) return '';
    if (match.startsWith('</')) return `</${tag}>`;
    if (tag === 'br') return '<br>';

    if (tag === 'a') {
      const hrefMatch = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = sanitizeHref(hrefMatch?.[2] || hrefMatch?.[3] || hrefMatch?.[4] || '');
      return `<a href="${href.replace(/"/g, '&quot;')}" rel="noopener noreferrer" target="_blank">`;
    }

    return `<${tag}>`;
  });

  return html.trim();
}

module.exports = {
  sanitizeProductHtml,
  stripHtmlToPlainText,
};
