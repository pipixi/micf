import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, 'dist');

// Files and directories to copy
const INCLUDES = [
    'css',
    'js',
    'assets',
    'certs',
    'index.html',
    'manifest.json',
    'package.json',
    'server.js',
    'sw.js',
    'LICENSE', // If exists
    'README.md'
];

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();

    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else if (exists) { // Is file
        fs.copyFileSync(src, dest);
    }
}

function build() {
    console.log('🏗️  Starting build...');

    // 1. Clean dist
    if (fs.existsSync(DIST_DIR)) {
        console.log('🧹 Cleaning dist directory...');
        fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR);

    // 2. Copy files
    console.log('📂 Copying files...');
    INCLUDES.forEach(item => {
        const srcPath = path.join(__dirname, item);
        const destPath = path.join(DIST_DIR, item);

        if (fs.existsSync(srcPath)) {
            copyRecursiveSync(srcPath, destPath);
            console.log(`   ✅ Copied ${item}`);
        } else {
            // Optional logic: Ignore certificates if they don't exist
            if (item !== 'certs') {
                console.warn(`   ⚠️  Warning: ${item} not found.`);
            }
        }
    });

    // 3. Optional: Install production dependencies in dist (Instruction only)
    console.log('\n🎉 Build complete! The "dist" folder is ready for deployment.');
    console.log('👉 To run in production:');
    console.log('   cd dist');
    console.log('   npm install --production');
    console.log('   npm start');
}

build();
