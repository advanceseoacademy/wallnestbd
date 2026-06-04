function requireUser(req, res, next) {
  if (req.session?.user?.id) return next();
  const apiRequest =
    req.originalUrl.startsWith('/api/') ||
    (req.get('accept') || '').includes('application/json');
  if (apiRequest) {
    return res.status(401).json({ error: 'লগইন প্রয়োজন' });
  }
  const returnTo = encodeURIComponent(req.originalUrl || '/account');
  return res.redirect(`/?login=1&next=${returnTo}`);
}

module.exports = { requireUser };
