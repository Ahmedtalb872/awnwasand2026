
const { Jimp } = require('jimp');
const path = require('path');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 256, 384, 512];
const inputFile = path.join(__dirname, '../public/ABC.jpg');
const outputDir = path.join(__dirname, '../public/icons');

if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
    try {
        console.log(`Reading image from ${inputFile}...`);
        const image = await Jimp.read(inputFile);

        // Ensure square aspect ratio
        const size = Math.min(image.bitmap.width, image.bitmap.height);
        image.crop(
            (image.bitmap.width - size) / 2,
            (image.bitmap.height - size) / 2,
            size,
            size
        );

        for (const s of sizes) {
            console.log(`Generating ${s}x${s} icon...`);
            const resized = image.clone().resize(s, s);
            await resized.writeAsync(path.join(outputDir, `icon-${s}.png`));
        }
        console.log('All icons generated successfully!');
    } catch (error) {
        console.error('Error generating icons:', error);
        process.exit(1);
    }
}

generateIcons();
