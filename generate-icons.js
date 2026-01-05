/**
 * Icon Generator Script
 * Generates PNG and ICO files from SVG for Electron builds
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
const svgPath = path.join(assetsDir, 'icon.svg');
const pngPath = path.join(assetsDir, 'icon.png');
const icoPath = path.join(assetsDir, 'icon.ico');

async function generateIcons() {
  console.log('Generating icons from SVG...');

  // Read SVG
  const svgBuffer = fs.readFileSync(svgPath);

  // Generate 512x512 PNG
  console.log('Creating 512x512 PNG...');
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(pngPath);
  console.log(`Created: ${pngPath}`);

  // Generate multiple sizes for ICO
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngBuffers = [];

  for (const size of sizes) {
    const buffer = await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toBuffer();
    pngBuffers.push({ size, buffer });
  }

  // Create ICO file manually (ICO format)
  // ICO header: 6 bytes
  // Entry for each image: 16 bytes each
  // Image data follows

  const icoBuffer = createIco(pngBuffers);
  fs.writeFileSync(icoPath, icoBuffer);
  console.log(`Created: ${icoPath}`);

  console.log('Icon generation complete!');
}

/**
 * Create an ICO file from PNG buffers
 * ICO format: https://en.wikipedia.org/wiki/ICO_(file_format)
 */
function createIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const numImages = images.length;

  // Calculate total size
  let dataOffset = headerSize + (entrySize * numImages);
  const entries = [];
  const imageDataList = [];

  for (const { size, buffer } of images) {
    entries.push({
      width: size >= 256 ? 0 : size, // 0 means 256
      height: size >= 256 ? 0 : size,
      colorCount: 0,
      reserved: 0,
      colorPlanes: 1,
      bitsPerPixel: 32,
      dataSize: buffer.length,
      dataOffset: dataOffset
    });
    imageDataList.push(buffer);
    dataOffset += buffer.length;
  }

  // Build ICO buffer
  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);

  // ICO header
  ico.writeUInt16LE(0, 0);        // Reserved, must be 0
  ico.writeUInt16LE(1, 2);        // Type: 1 for ICO
  ico.writeUInt16LE(numImages, 4); // Number of images

  // ICO directory entries
  let offset = headerSize;
  for (const entry of entries) {
    ico.writeUInt8(entry.width, offset);
    ico.writeUInt8(entry.height, offset + 1);
    ico.writeUInt8(entry.colorCount, offset + 2);
    ico.writeUInt8(entry.reserved, offset + 3);
    ico.writeUInt16LE(entry.colorPlanes, offset + 4);
    ico.writeUInt16LE(entry.bitsPerPixel, offset + 6);
    ico.writeUInt32LE(entry.dataSize, offset + 8);
    ico.writeUInt32LE(entry.dataOffset, offset + 12);
    offset += entrySize;
  }

  // Image data (PNG format is allowed in ICO files for Vista+)
  for (const buffer of imageDataList) {
    buffer.copy(ico, offset);
    offset += buffer.length;
  }

  return ico;
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
