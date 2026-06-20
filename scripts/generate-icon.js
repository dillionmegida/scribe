#!/usr/bin/env node
/**
 * Generates icon.png (1024x1024) from assets/icon.svg
 * then converts to icon.icns for macOS via iconutil.
 *
 * Requires: sharp   (npm install --save-dev sharp)
 * macOS only for .icns generation (uses built-in iconutil)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');
const icnsPath = path.join(assetsDir, 'icon.icns');
const iconsetDir = path.join(assetsDir, 'icon.iconset');

const sizes = [16, 32, 64, 128, 256, 512, 1024];

async function main() {
  console.log('→ Rendering SVG → PNG 1024x1024...');
  await sharp(svgPath)
    .resize(1024, 1024)
    .png()
    .toFile(pngPath);
  console.log('  ✓ assets/icon.png');

  if (process.platform !== 'darwin') {
    console.log('  ℹ Skipping .icns generation (macOS only)');
    return;
  }

  console.log('→ Building icon.iconset...');
  fs.mkdirSync(iconsetDir, { recursive: true });

  for (const size of sizes) {
    const outFile = path.join(iconsetDir, `icon_${size}x${size}.png`);
    await sharp(svgPath).resize(size, size).png().toFile(outFile);

    if (size <= 512) {
      const out2x = path.join(iconsetDir, `icon_${size}x${size}@2x.png`);
      await sharp(svgPath).resize(size * 2, size * 2).png().toFile(out2x);
    }
  }

  console.log('→ Converting iconset → icon.icns via iconutil...');
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
  fs.rmSync(iconsetDir, { recursive: true, force: true });
  console.log('  ✓ assets/icon.icns');
  console.log('\nDone! Icon assets generated in /assets/');
}

main().catch(err => { console.error(err); process.exit(1); });
