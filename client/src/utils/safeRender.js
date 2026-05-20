import DOMPurify from 'dompurify';

// Strict sanitization — strips ALL HTML
export const safeText = (text) => {
  if (text == null) return '';
  if (typeof text === 'object') {
    try { text = JSON.stringify(text); } catch { text = ''; }
  }
  const str = String(text);
  // Remove all HTML tags and dangerous chars
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

// Strip control characters but keep newlines for code display
export const safeCode = (code) => {
  if (code == null) return '';
  return String(code).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
};

// Validate URL before using in href
export const safeUrl = (url) => {
  if (typeof url !== 'string') return '#';
  const trimmed = url.trim().toLowerCase();
  // Block javascript:, data:, vbscript: schemes
  if (trimmed.startsWith('javascript:') ||
      trimmed.startsWith('data:') ||
      trimmed.startsWith('vbscript:')) {
    return '#';
  }
  // Only allow http(s) and relative URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return url;
  }
  return '#';
};
