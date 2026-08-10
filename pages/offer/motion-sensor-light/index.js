import { renderPageForNext } from '../../../lib/renderView';
import { getMotionSensorOfferPageData } from '../../../lib/storeData';
import { getSiteUrl, seoForMotionSensorOffer } from '../../../lib/seo';

export async function getServerSideProps({ req, res }) {
  try {
    const reqLike = {
      headers: {
        host: req.headers.host || '',
        'x-forwarded-proto': req.headers['x-forwarded-proto'] || 'http',
      },
      cookies: req.cookies || {},
    };
    const data = await getMotionSensorOfferPageData(reqLike);
    const baseUrl = getSiteUrl(reqLike);
    const seo = seoForMotionSensorOffer(baseUrl, data.product);
    const rendered = await renderPageForNext('offer/motion-sensor-light', {
      ...data,
      seo,
      siteUrl: baseUrl,
    });
    return { props: { ...rendered, seo, siteUrl: baseUrl } };
  } catch (err) {
    console.error('[offer/motion-sensor-light]', err);
    res.statusCode = 500;
    return { props: { bodyHtml: '<p>পেজ লোড হয়নি</p>', seo: null } };
  }
}

export default function MotionSensorOfferPage() {
  return null;
}
