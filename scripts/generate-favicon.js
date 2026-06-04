const path = require('path');

async function main() {
  const sharp = require('sharp');
  const src = path.join(__dirname, '..', 'public', 'images', 'wallnestbd-logo.png');
  const outDir = path.join(__dirname, '..', 'public', 'images');
  const bg = { r: 255, g: 255, b: 255, alpha: 1 };

  const sizes = [
    ['favicon-32.png', 32],
    ['favicon-180.png', 180],
    ['favicon-192.png', 192],
  ];

  for (const [name, size] of sizes) {
    await sharp(src)
      .resize(size, size, { fit: 'contain', background: bg })
      .png()
      .toFile(path.join(outDir, name));
    console.log('✓', name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
