const {
  handleProductImageUpload,
} = require('../../../lib/adminUploadApi');

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    return await handleProductImageUpload(req, res);
  } catch (err) {
    const status = err.status || 400;
    return res.status(status).json({
      error: err.message || 'Image upload failed',
    });
  }
}
