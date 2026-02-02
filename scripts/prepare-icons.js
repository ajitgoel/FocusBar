const fs = require('fs');
const path = require('path');

// Read the 1024x1024 SVG
const svg1024 = fs.readFileSync(path.join(__dirname, 'icons', 'icon_1024x1024.svg'), 'utf8');
const svg512 = fs.readFileSync(path.join(__dirname, 'icons', 'icon_512x512.svg'), 'utf8');

// For electron-builder on macOS, we can use a directory of PNGs
// or create a simple workaround by copying the largest SVG as a placeholder
// The actual rendering will be done by the OS

// Create a simple .iconset folder structure for macOS
const iconsetDir = path.join(__dirname, 'icons', 'icon.iconset');

if (!fs.existsSync(iconsetDir)) {
  fs.mkdirSync(iconsetDir, { recursive: true });
}

// Copy SVG files with proper names for electron-builder to pick up
// Note: In production, you'd convert these to PNGs using a tool like sharp or canvas
// For now, we'll create placeholder files and update package.json to use a different approach

// Create size info file
const sizeInfo = {
  sizes: [
    { size: 16, file: 'icon_16x16.png' },
    { size: 32, file: 'icon_16x16@2x.png' },
    { size: 32, file: 'icon_32x32.png' },
    { size: 64, file: 'icon_32x32@2x.png' },
    { size: 128, file: 'icon_128x128.png' },
    { size: 256, file: 'icon_128x128@2x.png' },
    { size: 256, file: 'icon_256x256.png' },
    { size: 512, file: 'icon_256x256@2x.png' },
    { size: 512, file: 'icon_512x512.png' },
    { size: 1024, file: 'icon_512x512@2x.png' }
  ],
  note: 'SVG files are present but need to be converted to PNG for macOS builds'
};

fs.writeFileSync(path.join(iconsetDir, 'info.json'), JSON.stringify(sizeInfo, null, 2));

console.log('✅ Icon set structure created');
console.log('📁 Location:', iconsetDir);
console.log('');
console.log('Note: For production builds, convert SVG files to PNG at these sizes:');
sizeInfo.sizes.forEach(s => console.log(`  - ${s.size}x${s.size}: ${s.file}`));
