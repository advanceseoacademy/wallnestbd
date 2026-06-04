function requireAdmin(req, res, next) {
  if (req.session?.admin) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Admin login required' });
  }
  return res.redirect('/admin/login');
}

module.exports = { requireAdmin };
