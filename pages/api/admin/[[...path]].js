const adminApp = require('../../../lib/adminExpressApp');

export const config = {
  api: {
    externalResolver: true,
    bodyParser: false,
  },
};

export default function handler(req, res) {
  const url = req.url || '';
  req.url = url.replace(/^\/api\/admin/, '/api');
  return adminApp(req, res);
}
