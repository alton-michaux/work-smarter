// Reads Django's CSRF cookie (set via GET /auth/csrf/) so mutating requests
// can echo it back as the X-CSRFToken header — required once auth moved from
// Bearer tokens to httpOnly cookies, since CsrfViewMiddleware is now active
// for cookie-authenticated requests.
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'X-CSRFToken': token } : {};
}
