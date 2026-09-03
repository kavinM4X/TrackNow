/**
 * TrackNow Concurrent Load Testing & Benchmark Suite
 * Simulates 100 simultaneous concurrent users hitting the API concurrently.
 * Calculates exact p50, p95, p99 latency, error rates, and actual throughput.
 */

const http = require('http');
const https = require('https');

const API_HOST = process.env.API_HOST || 'localhost';
const API_PORT = Number(process.env.API_PORT) || 5000;
const IS_HTTPS = API_PORT === 443 || API_HOST.includes('onrender.com');
const client = IS_HTTPS ? https : http;
const CONCURRENT_USERS = Number(process.env.CONCURRENT_USERS) || 100;
const REQUESTS_PER_USER = Number(process.env.REQUESTS_PER_USER) || 10;
const TOTAL_REQUESTS = CONCURRENT_USERS * REQUESTS_PER_USER;

const ENDPOINTS = [
  '/api/health',
  '/api/market-rates',
  '/api/metrics'
];

function makeRequest(path) {
  return new Promise((resolve) => {
    const start = process.hrtime();
    const req = client.get(
      {
        hostname: API_HOST,
        port: API_PORT,
        path,
        headers: {
          'User-Agent': 'TrackNow-Benchmark-Runner/1.0',
          'Accept': 'application/json'
        },
        timeout: 10000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          const diff = process.hrtime(start);
          const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6);
          resolve({
            success: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            durationMs
          });
        });
      }
    );

    req.on('error', (err) => {
      const diff = process.hrtime(start);
      const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6);
      resolve({
        success: false,
        statusCode: 0,
        error: err.message,
        durationMs
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        statusCode: 408,
        error: 'Timeout',
        durationMs: 10000
      });
    });
  });
}

function calculatePercentiles(samples) {
  if (samples.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0, min: 0, max: 0 };
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

async function runVirtualUser(userId, results) {
  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const endpoint = ENDPOINTS[i % ENDPOINTS.length];
    const res = await makeRequest(endpoint);
    results.push(res);
    // Slight human think-time pacing (10ms - 50ms)
    await new Promise((r) => setTimeout(r, 10 + Math.random() * 30));
  }
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('🏁 TrackNow Multi-User Concurrency Load Test');
  console.log(`Target: http://${API_HOST}:${API_PORT}`);
  console.log(`Simultaneous Concurrent Users: ${CONCURRENT_USERS}`);
  console.log(`Requests per User: ${REQUESTS_PER_USER}`);
  console.log(`Total Planned Requests: ${TOTAL_REQUESTS}`);
  console.log('====================================================\n');

  console.log('⏳ Running concurrent workload...');
  const overallStart = process.hrtime();
  const allResults = [];

  // Launch all concurrent virtual users in parallel
  const workers = [];
  for (let u = 1; u <= CONCURRENT_USERS; u++) {
    workers.push(runVirtualUser(u, allResults));
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

  console.log('\n====================================================');
  console.log('📊 BENCHMARK LOAD TEST RESULTS');
  console.log('====================================================');
  console.log(`Total Completed Requests : ${allResults.length}`);
  console.log(`200 OK Success           : ${successful} (${((successful / allResults.length) * 100).toFixed(1)}%)`);
  console.log(`429 Rate Limited (Guard) : ${rateLimited}`);
  console.log(`5xx Server Errors        : ${serverErrors}`);
  if (otherFailures > 0) {
    console.log(`Sample Connection Error  : ${allResults.find(r => r.error)?.error || 'Unknown'}`);
  }
  console.log(`Total Elapsed Time       : ${totalElapsedSeconds.toFixed(2)}s`);
  console.log(`Actual Throughput (RPS)  : ${rps} req/sec`);
  console.log('----------------------------------------------------');
  console.log(`Median Latency (p50)     : ${stats.p50.toFixed(2)} ms`);
  console.log(`90th Percentile (p90)    : ${stats.p90.toFixed(2)} ms`);
  console.log(`95th Percentile (p95)    : ${stats.p95.toFixed(2)} ms`);
  console.log(`99th Percentile (p99)    : ${stats.p99.toFixed(2)} ms`);
  console.log(`Average Latency          : ${stats.avg.toFixed(2)} ms`);
  console.log(`Fastest (Min)            : ${stats.min.toFixed(2)} ms`);
  console.log(`Slowest (Max)            : ${stats.max.toFixed(2)} ms`);
  console.log('====================================================\n');
}

runBenchmark().catch(console.error);
