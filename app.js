// app.js (Root entry file wrapper for Hostinger Passenger / cPanel Node.js Web App)
const fs = require('fs');
const path = require('path');

// Emergency file logger to capture any silent crashes
function logEmergency(info) {
    try {
        const logPath = path.join(__dirname, 'debug-crash.txt');
        const timestamp = new Date().toISOString();
        const formatted = `[${timestamp}] ${info.stack || info}\n`;
        fs.appendFileSync(logPath, formatted);
    } catch (e) {
        // Fallback if writing fails
    }
}

// Register global exception handlers
process.on('uncaughtException', (err) => {
    logEmergency(err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logEmergency(reason instanceof Error ? reason : new Error(String(reason)));
    process.exit(1);
});

logEmergency('--- Hostinger wrapper starting boot sequence ---');

try {
    let currentCommit = '';
    try {
        const gitHeadPath = path.join(__dirname, '.git/refs/heads/main');
        if (fs.existsSync(gitHeadPath)) {
            currentCommit = fs.readFileSync(gitHeadPath, 'utf8').trim();
        }
    } catch (e) {
        logEmergency('Failed to read git head: ' + e.message);
    }

    const distPath = path.join(__dirname, 'dist');
    const builtCommitPath = path.join(distPath, '.built-commit');
    let builtCommit = '';
    if (fs.existsSync(builtCommitPath)) {
        builtCommit = fs.readFileSync(builtCommitPath, 'utf8').trim();
    }

    // Build if dist is missing OR if we have a new commit
    if (!fs.existsSync(distPath) || !currentCommit || currentCommit !== builtCommit) {
        logEmergency(`New build triggered. currentCommit=${currentCommit}, builtCommit=${builtCommit}`);
        const { spawnSync } = require('child_process');
        const viteJs = path.join(__dirname, 'node_modules/vite/bin/vite.js');
        const frontendDir = path.join(__dirname, 'frontend');
        
        logEmergency(`Spawning Vite build from ${frontendDir} using Node path: ${process.execPath}...`);
        const buildResult = spawnSync(process.execPath, [viteJs, 'build'], {
            cwd: frontendDir,
            stdio: 'pipe',
            encoding: 'utf8'
        });

        if (buildResult.error || buildResult.status !== 0) {
            const stdoutStr = buildResult.stdout ? `\n--- VITE BUILD STDOUT ---\n${buildResult.stdout}` : '';
            const stderrStr = buildResult.stderr ? `\n--- VITE BUILD STDERR ---\n${buildResult.stderr}` : '';
            throw buildResult.error || new Error(`Vite build exited with status ${buildResult.status}.${stdoutStr}${stderrStr}`);
        }
        
        logEmergency('Vite build completed successfully.');
        
        // Touch tmp/restart.txt to trigger Passenger restart
        const tmpDir = path.join(__dirname, 'tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tmpDir, 'restart.txt'), String(Date.now()));

        if (currentCommit) {
            if (!fs.existsSync(distPath)) {
                fs.mkdirSync(distPath, { recursive: true });
            }
            fs.writeFileSync(builtCommitPath, currentCommit);
        }
    }

    logEmergency('Delegating to backend/server.js...');
    require('./backend/server.js');
    logEmergency('backend/server.js loaded successfully.');
} catch (err) {
    logEmergency(err);
    process.exit(1);
}
