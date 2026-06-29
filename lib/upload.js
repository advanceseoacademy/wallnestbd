const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

/** Repo root — works from Express, NestJS, and Next.js API bundles. */
function resolveProjectRoot() {
  if (process.env.PROJECT_ROOT) {
    return path.resolve(process.env.PROJECT_ROOT);
  }
  const fromLib = path.join(__dirname, '..');
  if (
    fs.existsSync(path.join(fromLib, 'package.json')) &&
    fs.existsSync(path.join(fromLib, 'public'))
  ) {
    return fromLib;
  }
  return process.cwd();
}

const projectRoot = resolveProjectRoot();
const uploadDir = path.join(projectRoot, 'public', 'uploads', 'products');
const categoryUploadDir = path.join(projectRoot, 'public', 'uploads', 'categories');
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
