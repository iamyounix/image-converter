const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { promisify } = require('util');
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const ProgressBar = require('cli-progress');
const readline = require('readline');

const supportedFormats = ['.bmp', '.gif', '.jpg', '.jpeg', '.png', '.tiff'];

// Function to convert images
async function convertImage(inputPath, outputDir, format) {
    const outputPath = path.join(outputDir, `${path.basename(inputPath, path.extname(inputPath))}${format}`);
    try {
        await sharp(inputPath).toFile(outputPath);
        return outputPath;
    } catch (error) {
        console.error(`Failed to convert ${inputPath}: ${error.message}`);
        return null;
    }
}

// Function to collect image files
async function collectImageFiles(input) {
    const files = [];
    try {
        const inputStat = await stat(input);
        
        if (inputStat.isDirectory()) {
            const dirFiles = await readdir(input);
            for (const file of dirFiles) {
                const filePath = path.join(input, file);
                const fileStat = await stat(filePath);
                if (fileStat.isFile() && supportedFormats.includes(path.extname(file).toLowerCase())) {
                    files.push(filePath);
                }
            }
        } else if (inputStat.isFile() && supportedFormats.includes(path.extname(input).toLowerCase())) {
            files.push(input);
        }
    } catch (error) {
        console.error(`Error collecting files: ${error.message}`);
    }

    return files;
}

// Function to display format options and get user selection
async function chooseFormat() {
    console.log('Please choose a format to convert to:');
    supportedFormats.forEach((format, index) => {
        console.log(`${index + 1}. ${format.slice(1)}`); // Remove the dot for display
    });

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('Enter the number of the desired format: ', (answer) => {
            const index = parseInt(answer) - 1;
            if (index >= 0 && index < supportedFormats.length) {
                rl.close();
                resolve(supportedFormats[index]);
            } else {
                console.log('Invalid choice, please run the script again.');
                rl.close();
                resolve(null);
            }
        });
    });
}

// Main function
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.log('Usage: node convertImages.js <directory|file>');
        return;
    }

    const input = args[0];

    // Get the output format from user
    const outputFormat = await chooseFormat();
    if (!outputFormat) return;

    try {
        const imageFiles = await collectImageFiles(input);
        const outputDir = path.join(path.dirname(input), 'converted_images');

        if (!fs.existsSync(outputDir)) {
            await mkdir(outputDir, { recursive: true });
        }

        const bar = new ProgressBar.SingleBar({
            format: 'Converting | {bar} | {percentage}% || {value}/{total} Files',
            barCompleteChar: '\u2588',
            barIncompleteChar: '\u2591',
            hideCursor: true
        }, ProgressBar.Presets.shades_classic);

        bar.start(imageFiles.length, 0);

        let successCount = 0;
        const failedFiles = [];

        for (const file of imageFiles) {
            const result = await convertImage(file, outputDir, outputFormat);
            if (result) {
                successCount++;
            } else {
                failedFiles.push(file);
            }
            bar.increment();
        }

        bar.stop();
        console.log('All files processed successfully!');
        console.log(`${successCount} files converted successfully.`);
        if (failedFiles.length > 0) {
            console.log('Failed to convert the following files:');
            failedFiles.forEach(f => console.log(`- ${f}`));
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
