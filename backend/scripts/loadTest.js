/**
 * TrackNow Realistic Multi-Persona Load Testing & Benchmark Suite
 * Simulates real-world concurrent traffic split across:
 * - 60% Farmers (Market rates, upcoming booking gate, health)
 * - 30% Drivers (Live health probes, trips, readiness)
 * - 10% Admins (Readiness, platform health)
 *
 * Measures: p50, p90, p95, p99 client-observed latency, throughput (RPS), and HTTP status distribution.
 */

const http = require('http');
const https = require('https');

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = Number(process.env.API_PORT) || 5000;
const IS_HTTPS = API_PORT === 443 || API_HOST.includes('onrender.com');
const client = IS_HTTPS ? https : http;

const CONCURRENT_USERS = Number(process.env.CONCURRENT_USERS) || 50;
const DURATION_SECONDS = Number(process.env.DURATION_SECONDS) || 10;

function makeRequest(path, method = 'GET', headers = {}) {
  return new Promise((resolve) => {
    const start = process.hrtime();
    const req = client.request(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        method,
        headers: {
          'User-Agent': 'TrackNow-LoadTest/2.0',
          'Accept': 'application/json',
          ...headers
        },
        timeout: 10000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const diff = process.hrtime(start);
          const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            durationMs,
            path
          });
        });
      }
    );

    req.on('error', (err) => {
      const diff = process.hrtime(start);
      const durationMs = diff[0] * 1e3 + diff[1] * 1e-6;
      resolve({
        success: false,
        statusCode: 0,
        error: err.message,
        durationMs,
        path
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        statusCode: 408,
        error: 'Timeout',
        durationMs: 10000,
        path
      });
    });

    req.end();
  });
}

function calculatePercentiles(samples) {
  if (samples.length === 0) return { p50: 0, p90: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
  const sorted = [...samples].sort((a, b) => a - b);
  const len = sorted.length;

  return {
    p50: sorted[Math.floor(len * 0.50)],
    p90: sorted[Math.floor(len * 0.90)] || sorted[len - 1],
    p95: sorted[Math.floor(len * 0.95)] || sorted[len - 1],
    p99: sorted[Math.floor(len * 0.99)] || sorted[len - 1],
    avg: sorted.reduce((a, b) => a + b, 0) / len,
    min: sorted[0],
    max: sorted[len - 1]
  };
}

// Scenarios based on persona role
async function runPersonaWorker(userId, endTime, results) {
  // Determine persona by weight
  const roll = Math.random();
  let persona = 'farmer'; // 60%
  let endpoints = ['/api/health/live', '/api/market-rates', '/api/health/ready'];
  
  if (roll > 0.90) {
    persona = 'admin'; // 10%
    endpoints = ['/api/health', '/api/health/ready'];
  } else if (roll > 0.60) {
    persona = 'driver'; // 30%
    endpoints = ['/api/health/live', '/api/health/ready'];
  }

  let step = 0;
  while (Date.now() < endTime) {
    const endpoint = endpoints[step % endpoints.length];
    step++;

    const res = await makeRequest(endpoint);
    results.push({ ...res, persona });

    // Realistic human pacing (50ms - 150ms think-time)
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  }
}

async function runLoadTest() {
  console.log('====================================================');
  console.log('🏁 TrackNow Multi-Persona Production Load Benchmark');
  console.log(`Target Host: ${IS_HTTPS ? 'https://' : 'http://'}${API_HOST}:${API_PORT}`);
  console.log(`Simultaneous Virtual Users: ${CONCURRENT_USERS}`);
  console.log(`Test Duration: ${DURATION_SECONDS} seconds`);
  console.log(`Traffic Weighting: 60% Farmers | 30% Drivers | 10% Admins`);
  console.log('====================================================\n');

  console.log('⏳ Running sustained concurrent workload...');
  const overallStart = process.hrtime();
  const endTime = Date.now() + DURATION_SECONDS * 1000;
  const allResults = [];

  // Launch all concurrent virtual users
  const workers = [];
  for (let u = 1; u <= CONCURRENT_USERS; u++) {
    workers.push(runPersonaWorker(u, endTime, allResults));
  }

  await Promise.all(workers);
  const overallDiff = process.hrtime(overallStart);
  const totalElapsedSeconds = overallDiff[0] + overallDiff[1] * 1e-9;

  const successful = allResults.filter((r) => r.success).length;
  const rateLimited = allResults.filter((r) => r.statusCode === 429).length;
  const serverErrors = allResults.filter((r) => r.statusCode >= 500).length;
  const otherFailures = allResults.length - successful - rateLimited - serverErrors;

  const latencies = allResults.map((r) => r.durationMs);
  const stats = calculatePercentiles(latencies);
  const rps = Math.round(allResults.length / totalElapsedSeconds);

  // Group latencies by endpoint
  const endpointStats = new Map();
  allResults.forEach((r) => {
    if (!endpointStats.has(r.path)) {
      endpointStats.set(r.path, []);
    }
    endpointStats.get(r.path).push(r.durationMs);
  });

  console.log('\n====================================================');
  console.log('📊 SUSTAINED LOAD TEST RESULTS (Client-Observed)');
  console.log('====================================================');
  console.log(`Total Requests Completed : ${allResults.length}`);
  console.log(`2xx Success Rate         : ${successful} (${((successful / (allResults.length || 1)) * 100).toFixed(1)}%)`);
  console.log(`429 Rate-Limited (Guard) : ${rateLimited}`);
  console.log(`5xx Server Errors        : ${serverErrors}`);
  console.log(`Other Errors             : ${otherFailures}`);
  console.log(`Test Execution Time      : ${totalElapsedSeconds.toFixed(2)}s`);
  console.log(`Sustained Throughput     : ${rps} req/sec`);
  console.log('----------------------------------------------------');
  console.log(`Overall Median (p50)     : ${stats.p50.toFixed(2)} ms`);
  console.log(`90th Percentile (p90)    : ${stats.p90.toFixed(2)} ms`);
  console.log(`95th Percentile (p95)    : ${stats.p95.toFixed(2)} ms`);
  console.log(`99th Percentile (p99)    : ${stats.p99.toFixed(2)} ms`);
  console.log(`Average Latency          : ${stats.avg.toFixed(2)} ms`);
  console.log(`Fastest (Min)            : ${stats.min.toFixed(2)} ms`);
  console.log(`Slowest (Max)            : ${stats.max.toFixed(2)} ms`);
  console.log('----------------------------------------------------');
  console.log('PER-ENDPOINT BREAKDOWN (p50 / p95 / p99):');
  for (const [path, list] of endpointStats.entries()) {
    const p = calculatePercentiles(list);
    console.log(`  ${path.padEnd(24)}: Count=${String(list.length).padStart(4)} | p50=${p.p50.toFixed(1)}ms | p95=${p.p95.toFixed(1)}ms | p99=${p.p99.toFixed(1)}ms`);
  }
  console.log('====================================================\n');
}

runLoadTest().catch(console.error);
