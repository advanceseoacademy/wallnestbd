import { getSessionFromPair } from '../../../lib/session';
import { renderAdminPageForNext } from '../../../lib/renderView';
import { resolveAdminRoute } from '../../../lib/adminRoutes';

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

    const pathRaw = String(req.query.path || req.query.slug || 'dashboard').trim();
    const slugParts = pathRaw.split('/').filter(Boolean);
    const resolved = resolveAdminRoute(slugParts, req.query);

    if (!resolved) {
      return res.status(404).json({ error: 'Page not found' });
    }
    if (resolved.redirect) {
      return res.status(404).json({ error: 'Page not found' });
    }

    const rendered = await renderAdminPageForNext(resolved.view, {
      ...resolved.data,
      admin: session.admin,
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      page: resolved.navPage,
      adminPath: resolved.path,
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
