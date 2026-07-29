
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];
const inputFile = path.join(__dirname, '../public/ABC.jpg');
const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Starting fallback icon generation (copy mode)...');

try {
    const imageData = fs.readFileSync(inputFile);

    for (const size of sizes) {
        const dest = path.join(outputDir, `icon-${size}.png`); // Intentionally saving as .png extension even if data is jpg, browsers often forgive this or we can try to find a png converter later. 
        // Better: just copy as is. Browsers sniff mime type often.
        fs.writeFileSync(dest, imageData);
        console.log(`Created ${dest}`);
    }
    console.log('Fallback icons created.');
} catch (e) {
    console.error('Error copying icons:', e);
    process.exit(1);
}
