/**
 * One-off: remove near-white background from logo PNG (transparent alpha).
 */
const path = require('path');

async function main() {
  const sharp = require('sharp');
  const file = path.join(__dirname, '..', 'public', 'images', 'wallnestbd-logo.png');
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const min = Math.min(r, g, b);
      const max = Math.max(r, g, b);
      const diff = max - min;

      if (min >= 248 && diff <= 8) {
        data[i + 3] = 0;
      } else if (min >= 235 && diff <= 12) {
        const t = (min - 235) / 13;
        data[i + 3] = Math.round(data[i + 3] * (1 - t));
      }
    }
  }

  const fs = require('fs');
  const out = file.replace(/\.png$/i, '.tmp.png');
  await sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  try {
    fs.unlinkSync(file);
  } catch (_) {}
  fs.renameSync(out, file);

  console.log('✓ Transparent logo saved:', file);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
