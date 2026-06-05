export const ACCOUNT_CSS_ID = 'wn-user-dashboard-css';
export const ACCOUNT_CSS_HREF = '/css/user-dashboard.css?v=23';

/** Inject account dashboard CSS — _document only runs on first load, not client nav. */
export function ensureAccountStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(ACCOUNT_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = ACCOUNT_CSS_ID;
  link.rel = 'stylesheet';
  link.href = ACCOUNT_CSS_HREF;
  document.head.appendChild(link);
}
