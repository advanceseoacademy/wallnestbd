import { getSessionFromPair } from '../../../lib/session';
import { renderAdminPageForNext } from '../../../lib/renderView';

const VIEW_MAP = {
  dashboard: 'admin/dashboard',
  orders: 'admin/orders',
  products: 'admin/products',
  categories: 'admin/categories',
  payments: 'admin/payments',
  settings: 'admin/settings',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { session } = await getSessionFromPair(req, res);
    if (!session.admin) {
      return res.status(401).json({ error: 'Admin login required' });
    }

    const slug = String(req.query.slug || 'dashboard').trim();
    const viewKey = VIEW_MAP[slug];
    if (!viewKey) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const rendered = await renderAdminPageForNext(viewKey, {
      page: slug,
      admin: session.admin,
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      page: slug,
      mainHtml: rendered.mainHtml,
      sidebarHtml: rendered.sidebarHtml,
      scriptSrcs: rendered.scriptSrcs,
      inlineScripts: rendered.inlineScripts || '',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Render failed' });
  }
}
