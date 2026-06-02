import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
} from '@aws-sdk/client-sqs';
import 'dotenv/config';
import { processImage } from './processor';

const sqs = new SQSClient({ region: process.env.AWS_REGION ?? 'eu-central-1' });
const QUEUE_URL = process.env.SQS_QUEUE_URL!;
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '2', 10);

interface ProcessingJob {
  hash: string;
  s3KeyPrefix: string;
}

let activeJobs = 0;

async function handleMessage(msg: Message): Promise<void> {
  if (!msg.Body || !msg.ReceiptHandle) return;

  let job: ProcessingJob;
  try {
    job = JSON.parse(msg.Body) as ProcessingJob;
  } catch {
    console.error('Invalid SQS message body:', msg.Body);
    return;
  }

  try {
    await processImage(job.hash, job.s3KeyPrefix);
  } finally {
    // Always delete the message — even on failure (moved to error state in DB)
    await sqs.send(new DeleteMessageCommand({
      QueueUrl: QUEUE_URL,
      ReceiptHandle: msg.ReceiptHandle,
    }));
  }
}

async function poll(): Promise<void> {
  while (true) {
    if (activeJobs >= CONCURRENCY) {
      await new Promise((r) => setTimeout(r, 1000));
      continue;
    }

    const { Messages } = await sqs.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: Math.min(CONCURRENCY - activeJobs, 10),
      WaitTimeSeconds: 20, // long polling
      VisibilityTimeout: 600, // 10 min — enough for a large DNG
    }));

    if (!Messages || Messages.length === 0) continue;

    for (const msg of Messages) {
      activeJobs++;
      handleMessage(msg).finally(() => { activeJobs--; });
    }
  }
}

console.log(`HiFly Worker starting (concurrency: ${CONCURRENCY})`);
console.log(`Queue: ${QUEUE_URL}`);

poll().catch((err) => {
  console.error('Fatal polling error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Waiting for active jobs to finish…');
  const wait = setInterval(() => {
    if (activeJobs === 0) { clearInterval(wait); process.exit(0); }
  }, 1000);
});
