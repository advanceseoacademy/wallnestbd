const { getIronSession } = require('iron-session');
const crypto = require('crypto');

const sessionOptions = {
  password:
    process.env.SESSION_SECRET ||
    'wallnest-dev-secret-min-32-characters-long',
  cookieName: 'wn_session',
  cookieOptions: {
    secure:
      process.env.COOKIE_SECURE === 'true' ||
      (process.env.NODE_ENV === 'production' &&
        (process.env.BASE_URL || '').startsWith('https://')),
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  },
};

async function ensureCartSessionId(session) {
  if (!session.cartSessionId) {
    session.cartSessionId = crypto.randomUUID();
    await session.save();
  }
  return session.cartSessionId;
}

/** Express-style req for existing lib (cart, account, API) */
function toReq(session, sessionId) {
  return {
    session,
    sessionID: sessionId,
  };
}

async function getSessionFromPair(req, res) {
  const session = await getIronSession(req, res, sessionOptions);
  const sessionId = await ensureCartSessionId(session);
  return { session, sessionId, req: toReq(session, sessionId) };
}

async function getSessionFromCookies(cookieStore) {
  const session = await getIronSession(cookieStore, sessionOptions);
  const sessionId = await ensureCartSessionId(session);
  return { session, sessionId, req: toReq(session, sessionId) };
}

module.exports = {
  sessionOptions,
  getSessionFromPair,
  getSessionFromCookies,
  toReq,
};
