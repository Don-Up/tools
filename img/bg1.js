// renamePngFiles.js
const fs = require('fs');
const path = require('path');

// Get current directory
const directory = process.argv[2] || '.';

// Read all files in the directory
fs.readdir(directory, (err, files) => {
    if (err) {
        console.error('Error reading directory:', err);
        return;
    }

    // Filter out directories and non-PNG files
    const pngFiles = files.filter(file => {
        const fullPath = path.join(directory, file);
        return fs.statSync(fullPath).isFile() && path.extname(file).toLowerCase() === '.png';
    });

    // Sort files to ensure consistent ordering
    pngFiles.sort();

    // Find the highest bg number already used
    let maxUsedIndex = -1;
    const bgFiles = pngFiles.filter(file => /^bg\d+\.png$/.test(file));
    bgFiles.forEach(file => {
        const match = file.match(/^bg(\d+)\.png$/);
        if (match) {
            const index = parseInt(match[1]);
            if (index > maxUsedIndex) {
                maxUsedIndex = index;
            }
        }
    });

    // Separate already named bg files from other PNG files
    const otherPngFiles = pngFiles.filter(file => !/^bg\d+\.png$/.test(file));

    // Rename non-bg PNG files with new sequential numbers
    let nextIndex = maxUsedIndex + 1;
    otherPngFiles.forEach((file) => {
        const oldPath = path.join(directory, file);
        const newName = `bg${nextIndex}.png`;
        const newPath = path.join(directory, newName);
        nextIndex++;

        fs.rename(oldPath, newPath, (err) => {
            if (err) {
                console.error(`Error renaming ${file}:`, err);
            } else {
                console.log(`Renamed ${file} to ${newName}`);
            }
        });
    });

    // Ensure bg0.png exists (rename the lowest numbered bg file to bg0 if needed)
    if (bgFiles.length > 0 && !pngFiles.includes('bg0.png')) {
        // Find the file with the lowest bg number
        let lowestFile = null;
        let lowestNumber = Infinity;

        bgFiles.forEach(file => {
            const match = file.match(/^bg(\d+)\.png$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num < lowestNumber) {
                    lowestNumber = num;
                    lowestFile = file;
                }
            }
        });

        // Rename it to bg0.png
        if (lowestFile && lowestNumber > 0) {
            const oldPath = path.join(directory, lowestFile);
            const newPath = path.join(directory, 'bg0.png');

            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error(`Error renaming ${lowestFile} to bg0.png:`, err);
                } else {
                    console.log(`Renamed ${lowestFile} to bg0.png`);
                }
            });
        }
    } else if (otherPngFiles.length === 0 && bgFiles.length > 0 && !pngFiles.includes('bg0.png')) {
        // Special case: all files are bg files but none is bg0.png
        // Find the lowest numbered one and rename it
        let lowestFile = null;
        let lowestNumber = Infinity;

        bgFiles.forEach(file => {
            const match = file.match(/^bg(\d+)\.png$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num < lowestNumber) {
                    lowestNumber = num;
                    lowestFile = file;
                }
            }
        });

        if (lowestFile && lowestNumber > 0) {
            const oldPath = path.join(directory, lowestFile);
            const newPath = path.join(directory, 'bg0.png');

            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error(`Error renaming ${lowestFile} to bg0.png:`, err);
                } else {
                    console.log(`Renamed ${lowestFile} to bg0.png`);

                    // Rename the rest to maintain sequence
                    const remainingFiles = bgFiles.filter(f => f !== lowestFile);
                    remainingFiles.forEach(file => {
                        const match = file.match(/^bg(\d+)\.png$/);
                        if (match) {
                            const oldNum = parseInt(match[1]);
                            const newNum = oldNum > lowestNumber ? oldNum - 1 : oldNum;
                            const newName = `bg${newNum}.png`;

                            if (newName !== file) {
                                const oldPath = path.join(directory, file);
                                const newPath = path.join(directory, newName);

                                fs.rename(oldPath, newPath, (err) => {
                                    if (err) {
                                        console.error(`Error renaming ${file}:`, err);
                                    } else {
                                        console.log(`Renamed ${file} to ${newName}`);
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }
    }
});
