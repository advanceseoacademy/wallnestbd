const { getIronSession } = require('iron-session');
const { sessionOptions } = require('./session');
const { upload, uploadCategory } = require('./upload');
const { processProductUpload, processCategoryUpload } = require('./optimizeImage');

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

async function requireAdminSession(req, res) {
  const session = await getIronSession(req, res, sessionOptions);
  if (!session?.admin) {
    const err = new Error('Admin login required');
    err.status = 401;
    throw err;
  }
  return session;
}

async function handleProductImageUpload(req, res) {
  await requireAdminSession(req, res);
  await runMiddleware(req, res, upload.single('image'));
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const result = await processProductUpload(req.file.path);
  return res.status(200).json({ ok: true, ...result });
}

async function handleCategoryHeroUpload(req, res) {
  await requireAdminSession(req, res);
  await runMiddleware(req, res, uploadCategory.single('image'));
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const result = await processCategoryUpload(req.file.path);
  return res.status(200).json({ ok: true, ...result });
}

function apiErrorMessage(data, fallback) {
  if (!data || typeof data !== 'object') return fallback;
  const msg = data.error || data.message;
  if (Array.isArray(msg)) return msg.join(', ');
  if (typeof msg === 'string' && msg && msg !== 'Bad Request') return msg;
  if (typeof data.message === 'string' && data.message) return data.message;
  return fallback;
}

module.exports = {
  handleProductImageUpload,
  handleCategoryHeroUpload,
  apiErrorMessage,
};
