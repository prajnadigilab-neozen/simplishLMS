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

// Override process.exit to capture silent exit calls
const originalExit = process.exit;
process.exit = function(code) {
    const err = new Error(`process.exit(${code}) was called!`);
    logEmergency(err);
    originalExit.apply(this, arguments);
};

process.on('unhandledRejection', (reason) => {
    logEmergency(reason instanceof Error ? reason : new Error(String(reason)));
    process.exit(1);
});

logEmergency('--- Hostinger wrapper starting boot sequence ---');

try {
    logEmergency('Delegating to backend/server.js...');
    require('./backend/server.js');
    logEmergency('backend/server.js loaded successfully.');
} catch (err) {
    logEmergency(err);
    process.exit(1);
}
