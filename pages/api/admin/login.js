const { getIronSession } = require('iron-session');
const { sessionOptions } = require('../../../lib/session');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const session = await getIronSession(req, res, sessionOptions);

  if (process.env.NODE_ENV === 'production') {
    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
      return res.redirect(307, '/admin/login?error=cfg');
    }
  }

  const user =
    process.env.ADMIN_USERNAME || (process.env.NODE_ENV === 'production' ? '' : 'admin');
  const pass =
    process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'wallnest123');

  const username = req.body?.username;
  const password = req.body?.password;

  if (username === user && password === pass) {
    session.admin = { username: user };
    await session.save();
    return res.redirect(307, '/admin/dashboard');
  }

  return res.redirect(307, '/admin/login?error=1');
}

export const config = {
  api: {
    bodyParser: true,
  },
};
