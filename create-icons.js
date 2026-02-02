#!/usr/bin/env node

/**
 * Icon Generator Script
 * 
 * This script generates the necessary icon files for the macOS app.
 * Run this after installing dependencies:
 *   node create-icons.js
 * 
 * Note: For production, you should create a proper .icns file using:
 * - Icon Set Creator (App Store)
 * - iconutil command line tool
 * - Or any icon design tool
 */

const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple colored circle PNG as placeholder
function createPlaceholderIcon(size, filename, color = '#2196F3') {
  // SVG to PNG conversion would require sharp or canvas
  // For now, create an SVG file that can be converted
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${color};stop-opacity:0.8" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.2)}" fill="url(#grad)"/>
  <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" 
        fill="white" font-family="-apple-system, BlinkMacSystemFont, sans-serif" 
        font-size="${Math.floor(size * 0.5)}" font-weight="600">15</text>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, filename.replace('.png', '.svg')), svg);
  console.log(`✓ Created ${filename} (SVG format)`);
}

console.log('🎨 Creating icon templates...\n');

// Create icons in various sizes
const sizes = [16, 32, 64, 128, 256, 512, 1024];

sizes.forEach(size => {
  createPlaceholderIcon(size, `icon_${size}x${size}.png`);
  if (size <= 512) {
    createPlaceholderIcon(size * 2, `icon_${size}x${size}@2x.png`);
  }
});

// Create template icon for menu bar (black/white)
const templateSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="22" height="22" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="11" r="9" fill="black" fill-opacity="0.85"/>
  <text x="11" y="15" text-anchor="middle" fill="white" font-family="-apple-system, sans-serif" font-size="10" font-weight="600">15</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'iconTemplate.svg'), templateSvg);
console.log('✓ Created iconTemplate.svg');

console.log('\n📦 Next steps:');
console.log('1. Install dependencies: npm install');
console.log('2. Convert SVGs to PNGs (optional for dev)');
console.log('3. For release build, create a proper .icns file:');
console.log('   - Use Icon Set Creator app from App Store');
console.log('   - Or use iconutil command:');
console.log('     iconutil -c icns icons/icon.iconset');
console.log('\n🔧 The app will work with SVG icons during development!');
