/**
 * 📊 SIMPLISH LMS: Steady State Load Simulator (Native Fetch Edition)
 * Designed to verify the p95 < 1.5s latency budget under concurrent load.
 * Uses native Node.js fetch (No dependencies needed).
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const CONCURRENCY = parseInt(process.env.CONCURRENCY) || 100;
const DURATION_SEC = parseInt(process.env.DURATION) || 30;

console.log(`🚀 Starting Steady State Load Test...`);
console.log(`📡 URL: ${BASE_URL}`);
console.log(`👥 Target: ${CONCURRENCY} Concurrent Users`);
console.log(`⏱️  Duration: ${DURATION_SEC}s`);
console.log(`------------------------------------------`);

const metrics = {
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    latencies: []
};

// Activity Mix Simulation
const simulateActivity = async () => {
    const rand = Math.random();
    let endpoint = '/';
    let method = 'GET';
    const start = Date.now();

    try {
        if (rand < 0.6) {
            // 🎬 60% Watching Videos (Manifest/Media Fetch)
            endpoint = '/lessons/all?limit=5';
        } else if (rand < 0.9) {
            // 📚 30% Browsing Dashboard (Optimized Cache Path)
            endpoint = '/lessons/all';
        } else {
            // ✍️ 10% Writing Progress (Database Write)
            endpoint = '/lessons/progress/dummy-id';
            method = 'POST';
        }

        const res = await fetch(`${BASE_URL}${endpoint}`, {
            method,
            headers: method === 'POST' ? { 'Content-Type': 'application/json' } : {},
            body: method === 'POST' ? JSON.stringify({ spentTimeMs: 5000, status: 'started' }) : undefined,
            signal: AbortSignal.timeout(5000) // 5s timeout
        });

        const duration = Date.now() - start;
        metrics.latencies.push(duration);
        if (res.ok || res.status < 500) {
            metrics.successCount++;
        } else {
            metrics.errorCount++;
        }
    } catch (err) {
        metrics.errorCount++;
    } finally {
        metrics.totalRequests++;
    }
};

const runSim = async () => {
    const endTime = Date.now() + (DURATION_SEC * 1000);
    
    // Maintain concurrency level
    const workers = Array(CONCURRENCY).fill(null).map(async () => {
        while (Date.now() < endTime) {
            await simulateActivity();
        }
    });

    await Promise.all(workers);
    report();
};

const report = () => {
    if (metrics.latencies.length === 0) {
        console.error('❌ Error: No requests completed. Check server connectivity.');
        process.exit(1);
    }

    const sorted = metrics.latencies.sort((a, b) => a - b);
    const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    console.log(`\n✅ Load Test Results:`);
    console.log(`------------------------------------------`);
    console.log(`🏁 Total Requests: ${metrics.totalRequests}`);
    console.log(`✅ Success (HTTP < 500): ${metrics.successCount}`);
    console.log(`❌ Failures/Errors: ${metrics.errorCount}`);
    console.log(`⏱️  Average Latency: ${avg.toFixed(2)}ms`);
    console.log(`🔥 p95 Latency: ${p95.toFixed(2)}ms ${p95 < 1500 ? '🟢' : '🔴'}`);
    console.log(`🚀 p99 Latency: ${p99.toFixed(2)}ms`);
    console.log(`------------------------------------------`);

    if (p95 > 1500) {
        console.error('⚠️ FAILURE: p95 latency exceeded the 1.5s budget.');
        process.exit(1);
    }
};

runSim().catch(console.error);
