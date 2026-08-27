export const OFFER_MS_CSS_ID = 'wn-offer-motion-sensor-css';
export const OFFER_MS_CSS_HREF = '/css/offer-motion-sensor.css?v=7';

/** Inject offer landing CSS — EJS head is stripped by Next body-only render. */
export function ensureOfferMotionSensorStylesheet() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(OFFER_MS_CSS_ID)) return;
  const link = document.createElement('link');
  link.id = OFFER_MS_CSS_ID;
  link.rel = 'stylesheet';
  link.href = OFFER_MS_CSS_HREF;
  document.head.appendChild(link);
}
