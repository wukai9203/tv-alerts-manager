import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 48, 128];
const sourceFile = path.join(__dirname, '../src/public/icons/icon.svg');
const outputDir = path.join(__dirname, '../src/icons');

async function generateIcons() {
  try {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate icons for each size
    for (const size of sizes) {
      const outputFile = path.join(outputDir, `icon${size}.png`);
      await sharp(sourceFile)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 33, g: 150, b: 243, alpha: 1 } // #2196F3
        })
        .png()
        .toFile(outputFile);
      console.log(`Generated ${size}x${size} icon at ${outputFile}`);
    }
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons(); 