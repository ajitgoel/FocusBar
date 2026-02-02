// icon-generator.js - Generate extension icons
// Run this in a browser console or Node.js environment to generate icons

function generateIcon(size) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Background circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#2196F3';
  ctx.fill();
  
  // Inner circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 6, 0, Math.PI * 2);
  ctx.fillStyle = 'white';
  ctx.fill();
  
  // Clock hands
  ctx.strokeStyle = '#2196F3';
  ctx.lineWidth = Math.max(2, size / 16);
  ctx.lineCap = 'round';
  
  // Hour hand (pointing to 3 o'clock)
  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.lineTo(size/2 + size/5, size/2);
  ctx.stroke();
  
  // Minute hand (pointing to 12 o'clock)
  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.lineTo(size/2, size/2 - size/4);
  ctx.stroke();
  
  // Center dot
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/16, 0, Math.PI * 2);
  ctx.fillStyle = '#2196F3';
  ctx.fill();
  
  return canvas.toDataURL('image/png');
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateIcon };
}
