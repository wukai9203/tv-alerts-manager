import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceFile = path.join(__dirname, '../src/public/icons/icon.png');
const outputFile = path.join(__dirname, '../src/public/icons/icon.svg');

async function convertToSvg() {
  try {
    // Read the image using sharp
    const image = await sharp(sourceFile);

    // Get image metadata
    const metadata = await image.metadata();

    // Create SVG with the image embedded as base64
    const svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}" viewBox="0 0 ${metadata.width} ${metadata.height}">
  <image width="${metadata.width}" height="${metadata.height}" href="${sourceFile}" />
</svg>`;

    // Write the SVG file
    fs.writeFileSync(outputFile, svgContent);
    console.log(`Converted ${sourceFile} to SVG at ${outputFile}`);
  } catch (error) {
    console.error('Error converting to SVG:', error);
    process.exit(1);
  }
}

convertToSvg(); 