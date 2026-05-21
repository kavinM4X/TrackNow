/**
 * Regenerate favicons from f_app_icon.svg (project root; copy from truck_3tires.svg).
 * Run: node scripts/generate-app-icons.js
 */
const path = require('path');
const fs = require('fs');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    try {
      sharp = require(path.join(__dirname, '..', 'backend', 'node_modules', 'sharp'));
    } catch {
      console.error('Install sharp: cd backend && npm install sharp');
      process.exit(1);
    }
  }

  const root = path.join(__dirname, '..');
  const src = path.join(root, 'f_app_icon.svg');
  if (!fs.existsSync(src)) {
    console.error('Missing f_app_icon.svg at project root (use truck_3tires.svg)');
    process.exit(1);
  }

  const apps = ['frontend-client', 'frontend-admin'];
  const sizes = [16, 32, 48, 192, 512];

  for (const app of apps) {
    const pub = path.join(root, app, 'public');
    const assets = path.join(root, app, 'src', 'assets');
    fs.copyFileSync(src, path.join(pub, 'app-icon.svg'));
    fs.copyFileSync(src, path.join(assets, 'app-icon.svg'));

    for (const size of sizes) {
      const out = path.join(pub, `favicon-${size}.png`);
      await sharp(src).resize(size, size).png().toFile(out);
      console.log('Wrote', out);
    }

    const trackIcon = path.join(pub, 'tracknow-icon.png');
    await sharp(src).resize(192, 192).png().toFile(trackIcon);
    fs.copyFileSync(trackIcon, path.join(assets, 'tracknow-icon.png'));
    console.log('Wrote', trackIcon);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
