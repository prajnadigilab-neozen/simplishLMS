/**
 * ⚡ SIMPLISH LMS: Spike Test Simulator (500 User Surge)
 * Designed to verify the 500-user viral spike resilience.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api/v1';
const PEAK_CONCURRENCY = 500;
const RAMP_TIME_SEC = 30; // Quick surge
const STEADY_TIME_SEC = 60; // Hold peak

console.log(`⚡ Starting 500-User Spike Test (WhatsApp Viral Simulation)...`);
console.log(`📡 URL: ${BASE_URL}`);
console.log(`📈 Ramp-up: 0 -> ${PEAK_CONCURRENCY} in ${RAMP_TIME_SEC}s`);
console.log(`------------------------------------------`);

const metrics = {
    totalRequests: 0,
    successCount: 0,
    errorCount: 0,
    latencies: []
};

const simulateActivity = async () => {
    const start = Date.now();
    try {
        const res = await fetch(`${BASE_URL}/`, { signal: AbortSignal.timeout(5000) });
        const duration = Date.now() - start;
        metrics.latencies.push(duration);
        if (res.ok) metrics.successCount++;
        else metrics.errorCount++;
    } catch (err) { metrics.errorCount++; }
    finally { metrics.totalRequests++; }
};

const runSpike = async () => {
    const start = Date.now();
    const peakStartTime = start + (RAMP_TIME_SEC * 1000);
    const endTime = peakStartTime + (STEADY_TIME_SEC * 1000);
    
    let activeUsers = 0;
    const workers = [];

    // Ramp up
    const rampInterval = setInterval(() => {
        const elapsed = (Date.now() - start) / 1000;
        const targetUsers = Math.min(PEAK_CONCURRENCY, Math.floor((elapsed / RAMP_TIME_SEC) * PEAK_CONCURRENCY));
        
        while (activeUsers < targetUsers) {
            activeUsers++;
            const worker = (async () => {
                while (Date.now() < endTime) {
                    await simulateActivity();
                }
            })();
            workers.push(worker);
        }

        if (Date.now() >= peakStartTime) {
            clearInterval(rampInterval);
            console.log(`🔥 Peak Reached: ${PEAK_CONCURRENCY} concurrent users. Holding for ${STEADY_TIME_SEC}s...`);
        }
    }, 100);

    // Wait for end of steady state
    await new Promise(r => setTimeout(r, (RAMP_TIME_SEC + STEADY_TIME_SEC) * 1000));
    await Promise.all(workers);
    report();
};

const report = () => {
    const sorted = metrics.latencies.sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    console.log(`\n⚡ Spike Test Final Report:`);
    console.log(`------------------------------------------`);
    console.log(`🏁 Total Requests: ${metrics.totalRequests}`);
    console.log(`✅ Success: ${metrics.successCount}`);
    console.log(`❌ Failures: ${metrics.errorCount}`);
    console.log(`🔥 p95 Latency: ${p95.toFixed(2)}ms ${p95 < 1500 ? '🟢' : '🔴'}`);
    console.log(`📈 RPS: ${(metrics.totalRequests / (RAMP_TIME_SEC + STEADY_TIME_SEC)).toFixed(2)} req/sec`);
    console.log(`------------------------------------------`);
};

runSpike().catch(console.error);
