const { spawn } = require('child_process');
const path = require('path');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

const backendDir = path.join(__dirname, '..');

console.log('Starting backend test server on port 5002...');
const env = { 
    ...process.env, 
    PORT: '5002', 
    NODE_ENV: 'development',
    RAZORPAY_KEY_ID: 'rzp_test_your_key_id'
};

const server = spawn('node', ['server.js'], { 
    cwd: backendDir,
    env: env
});

let serverReady = false;
let testsStarted = false;

server.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Server] ${output.trim()}`);
    if (output.includes('active on port 5002') || output.includes('Worker') && output.includes('active')) {
        serverReady = true;
        triggerTests();
    }
});

server.stderr.on('data', (data) => {
    console.error(`[Server Error] ${data.toString().trim()}`);
});

server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
});

function triggerTests() {
    if (testsStarted) return;
    testsStarted = true;
    
    console.log('\nServer is ready! Spawning tests...');
    
    const testProc = spawn('node', [path.join(__dirname, 'refund_runner.js')], {
        env: { ...process.env, TEST_PORT: '5002' }
    });

    testProc.stdout.on('data', (data) => {
        process.stdout.write(data.toString());
    });

    testProc.stderr.on('data', (data) => {
        process.stderr.write(data.toString());
    });

    testProc.on('close', (code) => {
        console.log(`\nTests finished with exit code ${code}`);
        console.log('Stopping server...');
        server.kill();
        process.exit(code);
    });
}

// Fallback safety timeout (35 seconds) in case output detection fails
setTimeout(() => {
    if (!testsStarted) {
        console.log('\nReadiness log signature not found within timeout. Forcing test execution...');
        triggerTests();
    }
}, 35000);
