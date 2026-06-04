const { getIronSession } = require('iron-session');
const { sessionOptions } = require('../../../lib/session');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }
  const session = await getIronSession(req, res, sessionOptions);
  session.destroy();
  return res.redirect(307, '/admin/login');
}
