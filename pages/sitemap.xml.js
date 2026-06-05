import { buildSitemapXml } from '../lib/sitemap';

export default function Sitemap() {
  return null;
}

export async function getServerSideProps({ req, res }) {
  const xml = await buildSitemapXml(req);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.write(xml);
  res.end();
  return { props: {} };
}
