const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'products');
const categoryUploadDir = path.join(__dirname, '..', 'public', 'uploads', 'categories');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(categoryUploadDir, { recursive: true });

function makeStorage(dest) {
  return multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dest),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)
      ? ext
      : '.jpg';
    cb(null, `${uuidv4()}${safe}`);
  },
  });
}

const imageFilter = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files allowed'));
  }
  cb(null, true);
};

const upload = multer({
  storage: makeStorage(uploadDir),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadCategory = multer({
  storage: makeStorage(categoryUploadDir),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: imageFilter,
});

module.exports = { upload, uploadCategory, uploadDir, categoryUploadDir };
