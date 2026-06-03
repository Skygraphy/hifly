import 'dotenv/config';
import { claimNextJob } from './db';
import { processImage } from './processor';

const POLL_INTERVAL_MS = 5000; // check every 5 seconds when idle
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10);

let activeJobs = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function poll() {
  console.log(`HiFly Worker started (concurrency: ${CONCURRENCY})`);
  console.log('Polling Supabase for pending images…\n');

  while (true) {
    if (activeJobs >= CONCURRENCY) {
      await sleep(1000);
      continue;
    }

    let job;
    try {
      job = await claimNextJob();
    } catch (err) {
      console.error('DB polling error:', err);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    if (!job) {
      // No work — wait before polling again
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const jobId = job.id;
    const jobPrefix = job.s3_key_prefix;
    activeJobs++;
    processImage(jobId, jobPrefix)
      .catch((err) => console.error(`[${jobId}] Unhandled error:`, err))
      .finally(() => { activeJobs--; });
  }
}

poll().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// Graceful shutdown: wait for active jobs to finish
process.on('SIGTERM', () => {
  console.log('SIGTERM — waiting for active jobs to complete…');
  const timer = setInterval(() => {
    if (activeJobs === 0) { clearInterval(timer); process.exit(0); }
  }, 1000);
});
