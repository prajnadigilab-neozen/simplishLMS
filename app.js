// app.js (Root entry file wrapper for Hostinger Passenger / cPanel Node.js Web App)
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Hostinger Boot] Starting application wrapper...');

let currentCommit = '';
try {
    const gitHeadPath = path.join(__dirname, '.git/refs/heads/main');
    if (fs.existsSync(gitHeadPath)) {
        currentCommit = fs.readFileSync(gitHeadPath, 'utf8').trim();
    }
} catch (e) {
    console.error('[Hostinger Boot] Failed to read git head:', e);
}

const distPath = path.join(__dirname, 'dist');
const builtCommitPath = path.join(distPath, '.built-commit');
let builtCommit = '';
if (fs.existsSync(builtCommitPath)) {
    builtCommit = fs.readFileSync(builtCommitPath, 'utf8').trim();
}

// Build if dist is missing OR if we have a new commit
if (!fs.existsSync(distPath) || !currentCommit || currentCommit !== builtCommit) {
    console.log('[Hostinger Boot] New commit or missing dist folder detected. Running build...');
    try {
        execSync('npm run build', { stdio: 'inherit' });
        console.log('[Hostinger Boot] Build completed successfully.');
        if (currentCommit) {
            if (!fs.existsSync(distPath)) {
                fs.mkdirSync(distPath, { recursive: true });
            }
            fs.writeFileSync(builtCommitPath, currentCommit);
        }
    } catch (error) {
        console.error('[Hostinger Boot] Build failed:', error);
        if (!fs.existsSync(distPath)) {
            process.exit(1);
        }
    }
}

require('./backend/server.js');
