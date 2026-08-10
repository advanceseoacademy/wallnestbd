import { renderPageForNext } from '../../../lib/renderView';
import { getSiteUrl, seoNoIndex } from '../../../lib/seo';

export async function getServerSideProps({ req, res, query }) {
  try {
    const reqLike = {
      headers: {
        host: req.headers.host || '',
        'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
      },
      cookies: req.cookies || {},
    };
    const baseUrl = getSiteUrl(reqLike);
    const seo = seoNoIndex('অর্ডার ধন্যবাদ — WallNest BD');
    const prefillOrder =
      typeof query.order === 'string' ? query.order.trim() : '';
    const rendered = await renderPageForNext('offer/motion-sensor-thank-you', {
      prefillOrder,
      seo,
      siteUrl: baseUrl,
    });
    return { props: { ...rendered, seo, siteUrl: baseUrl } };
  } catch (err) {
    console.error('[offer/motion-sensor-light/thank-you]', err);
    res.statusCode = 500;
    return { props: { bodyHtml: '<p>পেজ লোড হয়নি</p>', seo: null } };
  }
}

export default function MotionSensorThankYouPage() {
  return null;
}
