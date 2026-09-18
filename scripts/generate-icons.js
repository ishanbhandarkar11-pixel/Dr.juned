import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgIcon = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B132B"/>
      <stop offset="50%" stop-color="#1C2541"/>
      <stop offset="100%" stop-color="#0B132B"/>
    </linearGradient>
    <linearGradient id="bottleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="milkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#E0F2FE"/>
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners for squircle / icon -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="#38BDF8" stroke-width="4" stroke-opacity="0.3"/>
  
  <!-- Center Glow -->
  <circle cx="256" cy="260" r="140" fill="#38BDF8" opacity="0.12"/>
  
  <!-- Milk Can / Bottle Illustration -->
  <g transform="translate(146, 100)">
    <!-- Bottle Cap / Lid -->
    <rect x="70" y="20" width="80" height="24" rx="8" fill="#38BDF8"/>
    <!-- Bottle Neck -->
    <path d="M 85 44 L 85 85 L 30 145 L 30 280 A 25 25 0 0 0 55 305 L 165 305 A 25 25 0 0 0 190 280 L 190 145 L 135 85 L 135 44 Z" fill="url(#bottleGrad)"/>
    
    <!-- Milk Fill inside bottle -->
    <path d="M 38 165 C 70 155, 150 175, 182 165 L 182 276 A 18 18 0 0 1 164 294 L 56 294 A 18 18 0 0 1 38 276 Z" fill="url(#milkGrad)"/>
    
    <!-- Milk Drop Graphic inside -->
    <path d="M 110 200 C 110 200, 85 235, 85 250 A 25 25 0 0 0 135 250 C 135 235, 110 200, 110 200 Z" fill="#0284C7"/>
  </g>
  
  <!-- Decorative stars / sparkle -->
  <circle cx="360" cy="140" r="8" fill="#FACC15"/>
  <circle cx="150" cy="380" r="6" fill="#38BDF8"/>
</svg>
`;

async function generate() {
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgIcon);

  // 1. icon-512.png
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'icon-512.png'));
  console.log('Created icon-512.png');

  // 2. icon-192.png
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'icon-192.png'));
  console.log('Created icon-192.png');

  // 3. apple-touch-icon.png (180x180)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('Created apple-touch-icon.png');

  // 4. favicon.svg
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon.trim());
  console.log('Created icon.svg');
}

generate().catch(console.error);
