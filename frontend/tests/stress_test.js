/**
 * 🔥 SIMPLISH LMS: Stress Test Simulator (Hardened Recovery Edition)
 * Designed to find the system's absolute upper limit and verify it recovers instantly.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const STEP_USERS = 50;
const STEP_TIME_SEC = 10;
const MAX_USERS = 1000;

console.log(`🔥 Starting Hardened Stress Test (Upper Limit Search)...`);
console.log(`📡 URL: ${BASE_URL}`);
console.log(`📈 Ramp-up: +${STEP_USERS} users every ${STEP_TIME_SEC}s`);
console.log(`------------------------------------------`);

const metrics = {
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    latencies: []
};

let breakingPointFound = false;
let breakingUserCount = 0;
const globalAbort = new AbortController();

const simulateActivity = async () => {
    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/`, { 
            signal: globalAbort.signal,
            headers: { 'Connection': 'keep-alive' }
        });
        const duration = Date.now() - start;
        metrics.latencies.push(duration);
        if (res.ok) metrics.successCount++;
        else metrics.errorCount++;
        
        // Breaking condition: p95 > 3.0s or unexpected errors
        if (duration > 3000) {
            breakingPointFound = true;
        }
    } catch (err) {
        if (err.name !== 'AbortError') metrics.errorCount++;
    } finally {
        metrics.totalRequests++;
    }
};

const runStress = async () => {
    let currentUserCount = 0;
    const workers = [];

    const rampInterval = setInterval(async () => {
        if (breakingPointFound || currentUserCount >= MAX_USERS) {
            clearInterval(rampInterval);
            breakingUserCount = currentUserCount;
            console.log(`🛑 Breaking Point Reached at ${breakingUserCount} users! Aborting all traffic...`);
            globalAbort.abort(); // Terminate all flight requests instantly
            await stopAndCheckRecovery();
            return;
        }

        currentUserCount += STEP_USERS;
        console.log(`📈 Climbing: ${currentUserCount} concurrent users... (p95: ${getP95()}ms)`);
        
        for (let i = 0; i < STEP_USERS; i++) {
            const worker = (async () => {
                while (!breakingPointFound) {
                    await simulateActivity();
                    await new Promise(r => setTimeout(r, 50)); // Jitter to prevent local sync bursts
                }
            })();
            workers.push(worker);
        }
    }, STEP_TIME_SEC * 1000);
};

const getP95 = () => {
    if (metrics.latencies.length === 0) return 0;
    const sorted = metrics.latencies.slice(-500).sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)] || 0;
};

const stopAndCheckRecovery = async () => {
    console.log(`🔋 All traffic Aborted. Starting Recovery Phase (30s Budget)...`);
    const recoveryStart = Date.now();
    
    // Recovery Pulse
    const checkPulse = async () => {
        const start = Date.now();
        try {
            // Pulse hits the root health check (200 OK)
            const pulseRes = await fetch('http://localhost:5000/', { signal: AbortSignal.timeout(2000) });
            const pulseLatency = Date.now() - start;
            
            if (pulseRes.ok && pulseLatency < 500) {
                const recoveryTime = (Date.now() - recoveryStart) / 1000;
                console.log(`✅ System Recovered: ${pulseLatency}ms latency reached in ${recoveryTime.toFixed(2)}s. ${recoveryTime < 30 ? '🟢' : '🔴'}`);
                process.exit(recoveryTime < 30 ? 0 : 1);
            } else {
                console.log(`⏳ Monitoring Recovery: Pulse response ${pulseLatency}ms (Target < 500ms)`);
            }
        } catch (e) {
            console.log(`⏳ Monitoring Recovery: Pulse failed (${e.message})`);
        }
        
        if (Date.now() - recoveryStart > 60000) {
            console.error('❌ FAILURE: System failed to recover within 60s.');
            process.exit(1);
        }
        setTimeout(checkPulse, 2000); // Pulse every 2s
    };

    checkPulse();
};

runStress().catch(console.error);
